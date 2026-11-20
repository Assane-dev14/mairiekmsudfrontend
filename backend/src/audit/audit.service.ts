import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  success?: boolean;
  ip?: string;
  meta?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Ne jamais passer de mots de passe, jetons ou données confidentielles dans `meta`.
  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        success: entry.success ?? true,
        ip: entry.ip,
        meta: entry.meta,
      },
    });
  }
}
