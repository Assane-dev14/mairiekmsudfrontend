import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnlineMode } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProcedureQueryDto {
  @ApiPropertyOptional({ example: 'Attestations', description: 'Filtrer par catégorie (valeur exacte).' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ example: 'résidence', description: 'Recherche par mot-clé dans le nom et la description.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}

export class ServiceDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'État civil' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'etatcivil@exemple.sn' })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Lundi–vendredi, 8h–16h' })
  openingHours: string | null;

  @ApiProperty({ type: [String], example: ['Actes de naissance', 'Légalisations'], description: 'Domaines de compétence (§4.2).' })
  domains: string[];
}

export class ServiceRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'État civil' })
  name: string;
}

export class FormFieldDto {
  @ApiProperty({ example: 'dateNaissance', description: 'Clé à utiliser dans `data` lors du dépôt.' })
  name: string;

  @ApiProperty({ example: 'Date de naissance' })
  label: string;

  @ApiProperty({ enum: ['text', 'textarea', 'number', 'date', 'email', 'phone', 'select', 'boolean'], example: 'date' })
  type: string;

  @ApiPropertyOptional({ example: true })
  required?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Valeurs autorisées (type `select`).' })
  options?: string[];

  @ApiPropertyOptional({ example: 120 })
  maxLength?: number;
}

export class ProcedureSummaryDto {
  @ApiProperty({ example: 'CERTIFICAT_RESIDENCE', description: 'Code à utiliser pour déposer un dossier.' })
  code: string;

  @ApiProperty({ example: 'Certificat de résidence' })
  name: string;

  @ApiProperty({ example: 'Attestations' })
  category: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({
    enum: OnlineMode,
    description: '`FULL` : entièrement en ligne · `PARTIAL` : dépôt en ligne, passage au guichet requis · `IN_PERSON` : guichet uniquement.',
  })
  onlineMode: OnlineMode;

  @ApiPropertyOptional({ nullable: true, example: 5, description: 'Délai indicatif de traitement en jours (non contractuel, §6.2).' })
  indicativeDays: number | null;

  @ApiPropertyOptional({ nullable: true, example: null, description: 'Coût officiellement validé, en FCFA. `null` si gratuit ou non renseigné.' })
  fee: string | null;

  @ApiProperty({ type: ServiceRefDto })
  service: ServiceRefDto;
}

export class ProcedureDetailDto extends ProcedureSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  conditions: string | null;

  @ApiProperty({ type: [String], example: ['Copie de la carte nationale d’identité'] })
  requiredDocs: string[];

  @ApiProperty({ type: [FormFieldDto], description: 'Champs du formulaire à remplir dans `data` lors du dépôt.' })
  fields: FormFieldDto[];

  @ApiProperty({ example: 1, description: 'Version du formulaire.' })
  formVersion: number;
}
