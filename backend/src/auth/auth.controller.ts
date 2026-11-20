import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AuthService, ClientInfo } from './auth.service';
import { AuthUser, CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { MeResponseDto, RegisterResponseDto, TokensResponseDto } from './dto/auth-response.dto';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

const client = (req: Request): ClientInfo => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

@ApiTags('Authentification')
@ApiTooManyRequestsResponse({ description: 'Trop de requêtes : limite de débit atteinte, réessayer plus tard.' })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Créer un compte citoyen ou organisation',
    description:
      'Inscription publique (cahier des charges §4.3). Le mot de passe est haché avec argon2id. ' +
      'Les rôles internes ne peuvent pas être obtenus par cette route.\n\n' +
      '**Limite :** 5 requêtes / minute / IP.',
  })
  @ApiCreatedResponse({ type: RegisterResponseDto, description: 'Compte créé.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Données invalides (champ manquant, mot de passe trop court, conditions non acceptées, profil non autorisé…).' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Un compte existe déjà avec ces informations.' })
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<RegisterResponseDto> {
    return this.auth.register(dto, client(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  @ApiOperation({
    summary: 'Se connecter',
    description:
      'Renvoie un jeton d’accès (JWT) et un jeton de rafraîchissement.\n\n' +
      '- Après **5 échecs**, le compte est verrouillé **15 minutes** (403).\n' +
      '- Le message d’erreur ne révèle pas si l’e-mail existe.\n' +
      '- Chaque succès ou échec est inscrit au journal d’audit.\n\n' +
      '**Limite :** 10 requêtes / minute / IP.',
  })
  @ApiOkResponse({ type: TokensResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Identifiants invalides.' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Compte verrouillé, non vérifié, suspendu ou désactivé.' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<TokensResponseDto> {
    return this.auth.login(dto, client(req));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  @ApiOperation({
    summary: 'Renouveler les jetons',
    description:
      'Échange un jeton de rafraîchissement contre une **nouvelle paire** de jetons. ' +
      'L’ancien jeton est immédiatement invalidé (rotation).\n\n' +
      '⚠️ Si un jeton déjà utilisé est présenté de nouveau, il est considéré comme volé : ' +
      '**toutes les sessions** de l’utilisateur sont révoquées.',
  })
  @ApiOkResponse({ type: TokensResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Jeton inconnu, expiré, déjà utilisé, ou compte inactif.' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<TokensResponseDto> {
    return this.auth.refresh(dto.refreshToken, client(req));
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  @ApiOperation({
    summary: 'Se déconnecter (session courante)',
    description: 'Révoque le jeton de rafraîchissement fourni. Réponse identique que le jeton soit valide ou non.',
  })
  @ApiNoContentResponse({ description: 'Session fermée.' })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @HttpCode(204)
  @Post('logout-all')
  @ApiOperation({
    summary: 'Se déconnecter de tous les appareils',
    description: 'Révoque toutes les sessions actives de l’utilisateur connecté (cahier des charges §4.3).',
  })
  @ApiNoContentResponse({ description: 'Toutes les sessions sont fermées.' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Jeton d’accès absent ou invalide.' })
  async logoutAll(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.logoutAll(user.id);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Profil de l’utilisateur connecté' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Jeton d’accès absent, expiré, ou compte suspendu.' })
  me(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    return this.auth.me(user.id);
  }
}
