import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, Role } from '@prisma/client';

export class StatusRefDto {
  @ApiProperty({ example: 'EN_INSTRUCTION' })
  code: string;

  @ApiProperty({ example: 'En instruction' })
  label: string;
}

export class ProcedureRefDto {
  @ApiProperty({ example: 'CERTIFICAT_RESIDENCE' })
  code: string;

  @ApiProperty({ example: 'Certificat de résidence' })
  name: string;
}

export class PersonRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Moussa Sarr' })
  name: string;
}

export class AvailableTransitionDto {
  @ApiProperty({ example: 'ATTENTE_CITOYEN' })
  toStatus: string;

  @ApiProperty({ example: 'En attente de complément' })
  label: string;

  @ApiProperty({ example: true, description: 'Un motif doit être fourni.' })
  requiresReason: boolean;
}

// ---------- Vues demandeur ----------

export class ApplicantDossierSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'KM-2026-000001' })
  reference: string;

  @ApiProperty({ type: ProcedureRefDto })
  procedure: ProcedureRefDto;

  @ApiProperty({
    type: StatusRefDto,
    description: 'Les étapes internes (à qualifier, affecté, à valider) sont présentées comme `EN_COURS` / « En cours de traitement ».',
  })
  status: StatusRefDto;

  @ApiProperty({ format: 'date-time' })
  submittedAt: Date;

  @ApiProperty({ format: 'date-time', description: 'Dernière mise à jour.' })
  updatedAt: Date;
}

export class ApplicantHistoryEntryDto {
  @ApiProperty({ format: 'date-time' })
  date: Date;

  @ApiProperty({ type: StatusRefDto })
  status: StatusRefDto;

  @ApiPropertyOptional({ nullable: true, example: 'Pièces attendues : justificatif de domicile.' })
  reason: string | null;
}

export class ApplicantMessageViewDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ['DEMANDEUR', 'MAIRIE'] })
  from: 'DEMANDEUR' | 'MAIRIE';

  @ApiProperty()
  body: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class ApplicantDossierDetailDto extends ApplicantDossierSummaryDto {
  @ApiProperty({ example: 'État civil' })
  service: string;

  @ApiProperty({ type: 'object', additionalProperties: true, description: 'Données du formulaire telles que déposées.' })
  data: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true, example: 'Accepté' })
  decision: string | null;

  @ApiPropertyOptional({ nullable: true })
  decisionReason: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  closedAt: Date | null;

  @ApiProperty({ type: [ApplicantHistoryEntryDto] })
  history: ApplicantHistoryEntryDto[];

  @ApiProperty({ type: [ApplicantMessageViewDto], description: 'Échanges avec la mairie (sans les notes internes).' })
  messages: ApplicantMessageViewDto[];
}

export class PaginatedApplicantDossiersDto {
  @ApiProperty({ type: [ApplicantDossierSummaryDto] })
  items: ApplicantDossierSummaryDto[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

// ---------- Vues backoffice ----------

export class StaffDossierSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'KM-2026-000001' })
  reference: string;

  @ApiProperty({ type: ProcedureRefDto })
  procedure: ProcedureRefDto;

  @ApiProperty({ type: StatusRefDto })
  status: StatusRefDto;

  @ApiProperty({ type: PersonRefDto })
  service: PersonRefDto;

  @ApiPropertyOptional({ type: PersonRefDto, nullable: true })
  assignee: PersonRefDto | null;

  @ApiProperty({ example: 'Awa Diallo' })
  applicantName: string;

  @ApiProperty({ enum: Priority })
  priority: Priority;

  @ApiProperty({ format: 'date-time' })
  submittedAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true, format: 'date-time', description: 'Échéance indicative.' })
  dueAt: Date | null;

  @ApiProperty({ description: 'Délai indicatif dépassé et dossier non clôturé.' })
  overdue: boolean;
}

export class ApplicantInfoDto extends PersonRefDto {
  @ApiProperty({ example: 'awa.diallo@example.com' })
  email: string;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiProperty({ enum: [Role.CITOYEN, Role.ORGANISATION] })
  role: Role;
}

export class StaffHistoryEntryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'STATUS_CHANGED', description: '`CREATED`, `STATUS_CHANGED`, `ASSIGNED`, `REASSIGNED`.' })
  action: string;

  @ApiPropertyOptional({ type: StatusRefDto, nullable: true })
  fromStatus: StatusRefDto | null;

  @ApiPropertyOptional({ type: StatusRefDto, nullable: true })
  toStatus: StatusRefDto | null;

  @ApiPropertyOptional({ type: PersonRefDto, nullable: true, description: 'Auteur de l’action.' })
  actor: PersonRefDto | null;

  @ApiPropertyOptional({ nullable: true })
  reason: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class StaffMessageViewDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: PersonRefDto })
  author: PersonRefDto;

  @ApiProperty({ enum: Role })
  authorRole: Role;

  @ApiProperty()
  body: string;

  @ApiProperty({ description: 'Note interne (invisible du demandeur).' })
  internal: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class StaffDossierDetailDto extends StaffDossierSummaryDto {
  @ApiProperty({ type: ApplicantInfoDto })
  applicant: ApplicantInfoDto;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data: Record<string, unknown>;

  @ApiProperty({ example: 1 })
  formVersion: number;

  @ApiPropertyOptional({ nullable: true })
  decision: string | null;

  @ApiPropertyOptional({ nullable: true })
  decisionReason: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  closedAt: Date | null;

  @ApiProperty({ type: [StaffHistoryEntryDto] })
  history: StaffHistoryEntryDto[];

  @ApiProperty({ type: [StaffMessageViewDto] })
  messages: StaffMessageViewDto[];
}

export class PaginatedStaffDossiersDto {
  @ApiProperty({ type: [StaffDossierSummaryDto] })
  items: StaffDossierSummaryDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class AssignableAgentDto extends PersonRefDto {
  @ApiProperty({ enum: [Role.AGENT, Role.RESPONSABLE] })
  role: Role;

  @ApiProperty({ example: 3, description: 'Dossiers en cours (non clôturés) déjà affectés à cette personne.' })
  openDossiers: number;
}
