import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus, Role } from '@prisma/client';

export class TokensResponseDto {
  @ApiProperty({
    description: 'JWT d’accès, à envoyer dans l’en-tête `Authorization: Bearer <jeton>`. Durée de vie courte (15 min par défaut).',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'Jeton de rafraîchissement opaque, à usage unique, valable 7 jours par défaut. ' +
      'À conserver de façon sûre côté client et à échanger via `POST /auth/refresh`.',
    example: 'q3Jx0m4k...base64url',
  })
  refreshToken: string;
}

export class RegisterResponseDto {
  @ApiProperty({ format: 'uuid', example: '71a8c92f-ed78-485a-8545-470e3aa5ebd9' })
  id: string;

  @ApiProperty({ example: 'aminata.diop@example.com' })
  email: string;

  @ApiProperty({
    enum: AccountStatus,
    example: AccountStatus.ACTIVE,
    description:
      '`PENDING_VERIFICATION` tant que l’e-mail n’est pas vérifié. ' +
      'En développement (`AUTO_ACTIVATE_ACCOUNTS=true`), le compte est directement `ACTIVE`.',
  })
  status: AccountStatus;
}

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'aminata.diop@example.com' })
  email: string;

  @ApiPropertyOptional({ nullable: true, example: '+221771234567' })
  phone: string | null;

  @ApiProperty({ enum: Role, example: Role.CITOYEN })
  role: Role;

  @ApiPropertyOptional({ nullable: true, example: 'Aminata' })
  firstName: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Diop' })
  lastName: string | null;

  @ApiPropertyOptional({ nullable: true, example: null, description: 'Raison sociale (profil ORGANISATION)' })
  organizationName: string | null;
}
