import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    enum: ['CITOYEN', 'ORGANISATION'],
    example: 'CITOYEN',
    description:
      'Type de compte. Seuls les profils publics peuvent s’inscrire eux-mêmes ; ' +
      'les comptes internes (agents, administrateurs…) sont créés par un administrateur.',
  })
  @IsIn(['CITOYEN', 'ORGANISATION'])
  profile: 'CITOYEN' | 'ORGANISATION';

  @ApiProperty({ example: 'aminata.diop@example.com', description: 'Identifiant de connexion, unique (insensible à la casse).' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+221771234567', description: '8 à 15 chiffres, préfixe + facultatif.' })
  @IsOptional()
  @Matches(/^\+?[0-9 ]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  phone?: string;

  @ApiProperty({ example: 'MotDePasse123!', minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit contenir au moins 10 caractères' })
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ example: 'Aminata', description: 'Obligatoire pour le profil CITOYEN.' })
  @ValidateIf((o) => o.profile === 'CITOYEN')
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Diop', description: 'Obligatoire pour le profil CITOYEN.' })
  @ValidateIf((o) => o.profile === 'CITOYEN')
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ example: 'GIE Keur Massar Propre', description: 'Obligatoire pour le profil ORGANISATION.' })
  @ValidateIf((o) => o.profile === 'ORGANISATION')
  @IsString()
  @MaxLength(160)
  organizationName?: string;

  @ApiProperty({ example: true, description: 'Acceptation explicite des conditions d’utilisation. Doit valoir `true`.' })
  @Equals(true, { message: 'Vous devez accepter les conditions d’utilisation' })
  acceptTerms: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'aminata.diop@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MaxLength(128)
  password: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Jeton de rafraîchissement reçu lors de la connexion ou du dernier rafraîchissement.' })
  @IsString()
  refreshToken: string;
}
