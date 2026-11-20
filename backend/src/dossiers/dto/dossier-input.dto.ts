import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateDossierDto {
  @ApiProperty({ example: 'CERTIFICAT_RESIDENCE', description: 'Code de la démarche (voir `GET /procedures`).' })
  @IsString()
  @Matches(/^[A-Z0-9_]{2,60}$/, { message: 'Code de démarche invalide' })
  procedureCode: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Réponses au formulaire, clé = `name` de chaque champ décrit dans `GET /procedures/{code}`. ' +
      'Les champs inconnus sont refusés.',
    example: {
      nomComplet: 'Awa Diallo',
      dateNaissance: '1992-03-14',
      quartier: 'Quartier exemple',
      adresse: 'Rue 10, maison 25',
      motif: 'Emploi',
    },
  })
  @IsObject()
  data: Record<string, unknown>;
}

export class MyDossiersQueryDto extends PaginationQueryDto {}

export class BackofficeDossiersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'KM-2026', description: 'Recherche partielle sur la référence.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  reference?: string;

  @ApiPropertyOptional({ example: 'SOUMIS', description: 'Code du statut.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ApiPropertyOptional({ example: 'CERTIFICAT_RESIDENCE' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  procedureCode?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    example: 'me',
    description: '`me` : mes dossiers · `none` : non affectés · ou l’identifiant d’un agent.',
  })
  @IsOptional()
  @Matches(/^(me|none|[0-9a-f-]{36})$/i, { message: 'assignee doit valoir me, none ou un identifiant' })
  assignee?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Uniquement les dossiers non clôturés dont le délai indicatif est dépassé.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ enum: ['submittedAt', 'updatedAt', 'priority', 'dueAt'], default: 'submittedAt' })
  @IsOptional()
  @IsIn(['submittedAt', 'updatedAt', 'priority', 'dueAt'])
  sort: 'submittedAt' | 'updatedAt' | 'priority' | 'dueAt' = 'submittedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

export class ApplicantTransitionDto {
  @ApiProperty({ example: 'EN_INSTRUCTION', description: 'Code du statut visé (voir `GET …/transitions`).' })
  @IsString()
  @MaxLength(40)
  toStatus: string;

  @ApiPropertyOptional({ example: 'J’ai ajouté le justificatif demandé.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class StaffTransitionDto extends ApplicantTransitionDto {
  @ApiPropertyOptional({
    example: 'Pièces attendues : justificatif de domicile de moins de 3 mois.',
    description:
      'Motif enregistré dans l’historique. Obligatoire pour certaines transitions (`requiresReason`). ' +
      '⚠️ **Visible par le demandeur** si le nouveau statut lui est visible : utiliser `internalNote` pour les remarques internes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ example: 'Vérifier l’adresse auprès du délégué de quartier.', description: 'Note interne, jamais montrée au demandeur.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalNote?: string;
}

export class AssignDto {
  @ApiProperty({ format: 'uuid', description: 'Agent ou responsable du service du dossier (voir `GET …/assignable-agents`).' })
  @IsUUID()
  assigneeId: string;

  @ApiPropertyOptional({ example: 'Rééquilibrage de la charge', description: 'Obligatoire pour une réaffectation (§5.2).' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ApplicantMessageDto {
  @ApiProperty({ example: 'Bonjour, puis-je venir retirer le document jeudi ?', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;
}

export class StaffMessageDto extends ApplicantMessageDto {
  @ApiPropertyOptional({
    default: true,
    description: '`true` (par défaut) : note interne, invisible du demandeur. `false` : message envoyé au demandeur.',
  })
  @IsOptional()
  @IsBoolean()
  internal: boolean = true;
}
