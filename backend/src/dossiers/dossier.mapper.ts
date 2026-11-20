// Conversion des dossiers en vues. La vue demandeur ne contient jamais de notes internes,
// d'identité d'agent ni d'étapes internes du workflow (§6.2).
import { Prisma, User, WorkflowStatus } from '@prisma/client';
import {
  ApplicantDossierDetailDto,
  ApplicantDossierSummaryDto,
  StaffDossierDetailDto,
  StaffDossierSummaryDto,
  StatusRefDto,
} from './dto/dossier-view.dto';

export const listInclude = {
  procedureType: true,
  status: true,
  service: true,
  applicant: true,
  assignee: true,
} satisfies Prisma.DossierInclude;

export const fullInclude = {
  ...listInclude,
  procedureType: { include: { statuses: true } },
  history: { orderBy: { createdAt: 'asc' }, include: { actor: true } },
  messages: { orderBy: { createdAt: 'asc' }, include: { author: true } },
} satisfies Prisma.DossierInclude;

export type ListDossier = Prisma.DossierGetPayload<{ include: typeof listInclude }>;
export type FullDossier = Prisma.DossierGetPayload<{ include: typeof fullInclude }>;

const HIDDEN_STATUS: StatusRefDto = { code: 'EN_COURS', label: 'En cours de traitement' };

export const displayName = (u: Pick<User, 'firstName' | 'lastName' | 'organizationName' | 'email'>) =>
  u.organizationName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;

const statusRef = (s: WorkflowStatus): StatusRefDto => ({ code: s.code, label: s.label });
const applicantStatus = (s: WorkflowStatus): StatusRefDto => (s.visibleToApplicant ? statusRef(s) : HIDDEN_STATUS);
const isOverdue = (d: ListDossier) => !!d.dueAt && !d.closedAt && !d.status.isFinal && d.dueAt < new Date();

export function toApplicantSummary(d: ListDossier): ApplicantDossierSummaryDto {
  return {
    id: d.id,
    reference: d.reference,
    procedure: { code: d.procedureType.code, name: d.procedureType.name },
    status: applicantStatus(d.status),
    submittedAt: d.submittedAt,
    updatedAt: d.updatedAt,
  };
}

export function toApplicantDetail(d: FullDossier): ApplicantDossierDetailDto {
  const statuses = new Map(d.procedureType.statuses.map((s) => [s.id, s]));
  const history = d.history.flatMap((h) => {
    const to = h.toStatusId ? statuses.get(h.toStatusId) : undefined;
    if (!to || !to.visibleToApplicant || !['CREATED', 'STATUS_CHANGED'].includes(h.action)) return [];
    return [{ date: h.createdAt, status: statusRef(to), reason: h.reason }];
  });

  return {
    ...toApplicantSummary(d),
    service: d.service.name,
    data: d.data as Record<string, unknown>,
    decision: d.decision,
    decisionReason: d.decisionReason,
    closedAt: d.closedAt,
    history,
    messages: d.messages
      .filter((m) => !m.internal)
      .map((m) => ({
        id: m.id,
        from: m.authorId === d.applicantId ? ('DEMANDEUR' as const) : ('MAIRIE' as const),
        body: m.body,
        createdAt: m.createdAt,
      })),
  };
}

export function toStaffSummary(d: ListDossier): StaffDossierSummaryDto {
  return {
    id: d.id,
    reference: d.reference,
    procedure: { code: d.procedureType.code, name: d.procedureType.name },
    status: statusRef(d.status),
    service: { id: d.service.id, name: d.service.name },
    assignee: d.assignee ? { id: d.assignee.id, name: displayName(d.assignee) } : null,
    applicantName: displayName(d.applicant),
    priority: d.priority,
    submittedAt: d.submittedAt,
    updatedAt: d.updatedAt,
    dueAt: d.dueAt,
    overdue: isOverdue(d),
  };
}

export function toStaffDetail(d: FullDossier): StaffDossierDetailDto {
  const statuses = new Map(d.procedureType.statuses.map((s) => [s.id, s]));
  const ref = (id: string | null) => {
    const s = id ? statuses.get(id) : undefined;
    return s ? statusRef(s) : null;
  };

  return {
    ...toStaffSummary(d),
    applicant: {
      id: d.applicant.id,
      name: displayName(d.applicant),
      email: d.applicant.email,
      phone: d.applicant.phone,
      role: d.applicant.role,
    },
    data: d.data as Record<string, unknown>,
    formVersion: d.formVersion,
    decision: d.decision,
    decisionReason: d.decisionReason,
    closedAt: d.closedAt,
    history: d.history.map((h) => ({
      id: h.id,
      action: h.action,
      fromStatus: ref(h.fromStatusId),
      toStatus: ref(h.toStatusId),
      actor: h.actor ? { id: h.actor.id, name: displayName(h.actor) } : null,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
    messages: d.messages.map((m) => ({
      id: m.id,
      author: { id: m.author.id, name: displayName(m.author) },
      authorRole: m.author.role,
      body: m.body,
      internal: m.internal,
      createdAt: m.createdAt,
    })),
  };
}
