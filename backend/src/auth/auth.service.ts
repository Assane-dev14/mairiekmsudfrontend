import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  // Hash factice pour que le temps de réponse ne révèle pas si un e-mail existe.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, client: ClientInfo) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Impossible de créer ce compte avec ces informations');

    // Tant que la vérification e-mail n'est pas implémentée, l'activation automatique
    // n'est autorisée qu'en développement (AUTO_ACTIVATE_ACCOUNTS=true).
    const autoActivate = this.config.get('AUTO_ACTIVATE_ACCOUNTS') === 'true';

    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
        role: dto.profile,
        status: autoActivate ? 'ACTIVE' : 'PENDING_VERIFICATION',
        emailVerifiedAt: autoActivate ? new Date() : null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organizationName: dto.organizationName,
        termsAcceptedAt: new Date(),
      },
    });
    await this.audit.log({ actorId: user.id, action: 'REGISTER', entity: 'User', entityId: user.id, ip: client.ip });
    return { id: user.id, email: user.email, status: user.status };
  }

  async login(dto: LoginDto, client: ClientInfo) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      this.dummyHash ??= argon2.hash('dummy-password-for-timing');
      await argon2.verify(await this.dummyHash, dto.password).catch(() => false);
      await this.audit.log({ action: 'LOGIN_FAILED', success: false, ip: client.ip });
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log({ actorId: user.id, action: 'LOGIN_LOCKED', success: false, ip: client.ip });
      throw new ForbiddenException('Compte temporairement verrouillé, réessayez plus tard');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password).catch(() => false);
    if (!valid) {
      const failed = user.failedLogins + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        },
      });
      await this.audit.log({ actorId: user.id, action: 'LOGIN_FAILED', success: false, ip: client.ip });
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        user.status === 'PENDING_VERIFICATION'
          ? 'Adresse e-mail non vérifiée'
          : 'Ce compte est suspendu ou désactivé',
      );
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await this.audit.log({ actorId: user.id, action: 'LOGIN', ip: client.ip });
    return this.issueTokens(user, client);
  }

  // Rotation: chaque refresh token n'est utilisable qu'une fois. Un jeton déjà
  // révoqué qui revient est traité comme un vol: toutes les sessions sont coupées.
  async refresh(rawToken: string, client: ClientInfo) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException();

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({ actorId: stored.userId, action: 'REFRESH_REUSE_DETECTED', success: false, ip: client.ip });
      throw new UnauthorizedException();
    }
    if (stored.expiresAt < new Date() || stored.user.status !== 'ACTIVE') throw new UnauthorizedException();

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user, client);
  }

  async logout(rawToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      organizationName: u.organizationName,
    };
  }

  private async issueTokens(user: User, client: ClientInfo) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = Number(this.config.get('REFRESH_TTL_DAYS') ?? 7);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
        userAgent: client.userAgent?.slice(0, 255),
        ip: client.ip,
      },
    });
    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
