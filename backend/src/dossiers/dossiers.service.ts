import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  APPLICANT_ROLES,
  ASSIGNABLE_ROLES,
  ASSIGNER_ROLES,
  canUseTransition,
  StaffScope,
  staffDossierFilter,
} from './dossier-access';
import {
  displayName,
  fullInclude,
  listInclude,
  toApplicantDetail,
  toApplicantSummary,
  toStaffDetail,
  toStaffSummary,
} from './dossier.mapper';
import {
  ApplicantMessageDto,
  ApplicantTransitionDto,
  AssignDto,
  BackofficeDossiersQueryDto,
  CreateDossierDto,
  MyDossiersQueryDto,
  StaffMessageDto,
  StaffTransitionDto,
} from './dto/dossier-input.dto';
import { AssignableAgentDto, AvailableTransitionDto } from './dto/dossier-view.dto';
import { validateFormData } from './form-validation';

const DAY_MS = 86_400_000;

@Injectable()
export class DossiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ======================= Demandeur (citoyen / organisation) =======================

  async create(user: AuthUser, dto: CreateDossierDto) {
    const proc = await this.prisma.procedureType.findFirst({
      where: { code: dto.procedureCode, active: true, service: { active: true } },
      include: { statuses: { where: { isInitial: true } } },
    });
    if (!proc) throw new NotFoundException('Démarche introuvable ou non disponible en ligne');
    if (proc.onlineMode === 'IN_PERSON') {
      throw new BadRequestException('Cette démarche se fait uniquement au guichet');
    }
    const initial = proc.statuses[0];
    if (!initial) throw new ServiceUnavailableException('Cette démarche n’est pas encore configurée');

    const { value, errors } = validateFormData(proc.formSchema, dto.data);
    if (errors.length) throw new BadRequestException(errors);

    const [{ n }] = await this.prisma.$queryRaw<{ n: bigint }[]>`SELECT nextval('dossier_reference_seq') AS n`;
    const now = new Date();
    const dossier = await this.prisma.dossier.create({
      data: {
        reference: `KM-${now.getFullYear()}-${n.toString().padStart(6, '0')}`,
        procedureTypeId: proc.id,
        applicantId: user.id,
        statusId: initial.id,
        serviceId: proc.serviceId,
        formVersion: proc.formVersion,
        data: value as Prisma.InputJsonValue,
        submittedAt: now,
        dueAt: proc.indicativeDays ? new Date(now.getTime() + proc.indicativeDays * DAY_MS) : null,
        history: { create: { action: 'CREATED', actorId: user.id, toStatusId: initial.id } },
      },
    });
    await this.audit.log({ actorId: user.id, action: 'DOSSIER_CREATED', entity: 'Dossier', entityId: dossier.id });
    return toApplicantDetail(await this.loadFull(dossier.id));
  }

  async listMine(user: AuthUser, q: MyDossiersQueryDto) {
    const where = { applicantId: user.id };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.dossier.findMany({ where, include: listInclude, orderBy: { submittedAt: 'desc' }, ...paginate(q) }),
      this.prisma.dossier.count({ where }),
    ]);
    return { items: rows.map(toApplicantSummary), total, page: q.page, pageSize: q.pageSize };
  }

  async getMine(user: AuthUser, id: string) {
    return toApplicantDetail(await this.findMine(user, id));
  }

  async applicantTransitions(user: AuthUser, id: string) {
    const d = await this.findMine(user, id);
    return this.availableTransitions(user, d.statusId, true);
  }

  async applicantTransition(user: AuthUser, id: string, dto: ApplicantTransitionDto) {
    const d = await this.findMine(user, id);
    await this.applyTransition(user, d, dto, true);
    return toApplicantDetail(await this.loadFull(id));
  }

  async applicantMessage(user: AuthUser, id: string, dto: ApplicantMessageDto) {
    const d = await this.findMine(user, id);
    if (d.status.isFinal) throw new BadRequestException('Ce dossier est clôturé : il n’accepte plus de messages');
    await this.prisma.dossierMessage.create({
      data: { dossierId: id, authorId: user.id, body: dto.body.trim(), internal: false },
    });
    return toApplicantDetail(await this.loadFull(id));
  }

  // ======================= Backoffice =======================

  async listForStaff(user: AuthUser, q: BackofficeDossiersQueryDto) {
    const scope = await this.staffWhere(user);
    const filters: Prisma.DossierWhereInput[] = [scope];
    if (q.reference) filters.push({ reference: { contains: q.reference, mode: 'insensitive' } });
    if (q.status) filters.push({ status: { code: q.status } });
    if (q.procedureCode) filters.push({ procedureType: { code: q.procedureCode } });
    if (q.serviceId) filters.push({ serviceId: q.serviceId });
    if (q.priority) filters.push({ priority: q.priority });
    if (q.assignee === 'me') filters.push({ assigneeId: user.id });
    else if (q.assignee === 'none') filters.push({ assigneeId: null });
    else if (q.assignee) filters.push({ assigneeId: q.assignee });
    if (q.overdue) filters.push({ dueAt: { lt: new Date() }, closedAt: null, status: { isFinal: false } });

    const where: Prisma.DossierWhereInput = { AND: filters };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.dossier.findMany({
        where,
        include: listInclude,
        orderBy: [{ [q.sort]: q.order }, { submittedAt: 'desc' }],
        ...paginate(q),
      }),
      this.prisma.dossier.count({ where }),
    ]);
    return { items: rows.map(toStaffSummary), total, page: q.page, pageSize: q.pageSize };
  }

  async getForStaff(user: AuthUser, id: string) {
    const d = await this.findForStaff(user, id);
    // Consultation d'un dossier contenant des données personnelles : tracée (§7).
    await this.audit.log({ actorId: user.id, action: 'DOSSIER_VIEWED', entity: 'Dossier', entityId: id });
    return toStaffDetail(d);
  }

  async staffTransitions(user: AuthUser, id: string) {
    const d = await this.findForStaff(user, id);
    return this.availableTransitions(user, d.statusId, false);
  }

  async staffTransition(user: AuthUser, id: string, dto: StaffTransitionDto) {
    const d = await this.findForStaff(user, id);
    await this.applyTransition(user, d, dto, false, dto.internalNote);
    return toStaffDetail(await this.loadFull(id));
  }

  async assignableAgents(user: AuthUser, id: string): Promise<AssignableAgentDto[]> {
    this.ensureAssigner(user);
    const d = await this.findForStaff(user, id);
    const members = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', role: { in: ASSIGNABLE_ROLES }, services: { some: { serviceId: d.serviceId } } },
      include: { _count: { select: { assignedDossiers: { where: { closedAt: null } } } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return members.map((m) => ({
      id: m.id,
      name: displayName(m),
      role: m.role,
      openDossiers: m._count.assignedDossiers,
    }));
  }

  async assign(user: AuthUser, id: string, dto: AssignDto) {
    this.ensureAssigner(user);
    const d = await this.findForStaff(user, id);
    if (d.status.isFinal) throw new BadRequestException('Un dossier clôturé ne peut pas être affecté');
    if (d.assigneeId === dto.assigneeId) throw new BadRequestException('Le dossier est déjà affecté à cette personne');

    const reassign = !!d.assigneeId;
    if (reassign && !dto.reason?.trim()) throw new BadRequestException('Un motif est obligatoire pour une réaffectation');

    const assignee = await this.prisma.user.findFirst({
      where: {
        id: dto.assigneeId,
        status: 'ACTIVE',
        role: { in: ASSIGNABLE_ROLES },
        services: { some: { serviceId: d.serviceId } },
      },
    });
    if (!assignee) throw new BadRequestException('Cette personne ne peut pas traiter les dossiers de ce service');

    const res = await this.prisma.$transaction(async (tx) => {
      const r = await tx.dossier.updateMany({
        where: { id, assigneeId: d.assigneeId, statusId: d.statusId },
        data: { assigneeId: assignee.id },
      });
      if (r.count === 0) return r;
      await tx.dossierHistory.create({
        data: {
          dossierId: id,
          actorId: user.id,
          action: reassign ? 'REASSIGNED' : 'ASSIGNED',
          reason: dto.reason?.trim() || null,
        },
      });
      return r;
    });
    if (res.count === 0) throw new ConflictException('Le dossier a été modifié entre-temps, rechargez-le');

    await this.audit.log({
      actorId: user.id,
      action: reassign ? 'DOSSIER_REASSIGNED' : 'DOSSIER_ASSIGNED',
      entity: 'Dossier',
      entityId: id,
      meta: { assigneeId: assignee.id },
    });
    return toStaffDetail(await this.loadFull(id));
  }

  async staffMessage(user: AuthUser, id: string, dto: StaffMessageDto) {
    const d = await this.findForStaff(user, id);
    if (!dto.internal && d.status.isFinal) {
      throw new BadRequestException('Ce dossier est clôturé : seules les notes internes sont possibles');
    }
    await this.prisma.dossierMessage.create({
      data: { dossierId: id, authorId: user.id, body: dto.body.trim(), internal: dto.internal },
    });
    return toStaffDetail(await this.loadFull(id));
  }

  // ======================= Commun =======================

  private async availableTransitions(user: AuthUser, statusId: string, isApplicant: boolean): Promise<AvailableTransitionDto[]> {
    const transitions = await this.prisma.workflowTransition.findMany({
      where: { fromStatusId: statusId },
      include: { to: true },
      orderBy: { to: { position: 'asc' } },
    });
    return transitions
      .filter((t) => canUseTransition(user.role, t.allowedRoles, isApplicant))
      .map((t) => ({ toStatus: t.to.code, label: t.to.label, requiresReason: t.requiresReason }));
  }

  private async applyTransition(
    user: AuthUser,
    d: { id: string; statusId: string; applicantId: string },
    dto: ApplicantTransitionDto,
    isApplicant: boolean,
    internalNote?: string,
  ) {
    const transition = await this.prisma.workflowTransition.findFirst({
      where: { fromStatusId: d.statusId, to: { code: dto.toStatus } },
      include: { to: true },
    });
    if (!transition) throw new BadRequestException('Ce changement de statut n’est pas possible depuis le statut actuel');
    if (!canUseTransition(user.role, transition.allowedRoles, isApplicant && d.applicantId === user.id)) {
      throw new ForbiddenException('Vous n’êtes pas habilité à effectuer ce changement de statut');
    }
    const reason = dto.reason?.trim() || null;
    if (transition.requiresReason && !reason) throw new BadRequestException('Un motif est obligatoire pour ce changement de statut');

    const to = transition.to;
    const now = new Date();
    const res = await this.prisma.$transaction(async (tx) => {
      // Verrou optimiste : échoue si un autre utilisateur a changé le statut entre-temps.
      const r = await tx.dossier.updateMany({
        where: { id: d.id, statusId: d.statusId },
        data: {
          statusId: to.id,
          closedAt: to.isFinal ? now : null,
          ...(to.isDecision ? { decision: to.label, decisionReason: reason } : {}),
        },
      });
      if (r.count === 0) return r;
      await tx.dossierHistory.create({
        data: { dossierId: d.id, actorId: user.id, action: 'STATUS_CHANGED', fromStatusId: d.statusId, toStatusId: to.id, reason },
      });
      if (internalNote?.trim()) {
        await tx.dossierMessage.create({
          data: { dossierId: d.id, authorId: user.id, body: internalNote.trim(), internal: true },
        });
      }
      return r;
    });
    if (res.count === 0) throw new ConflictException('Le dossier a été modifié entre-temps, rechargez-le');

    await this.audit.log({
      actorId: user.id,
      action: to.isDecision ? 'DOSSIER_DECISION' : 'DOSSIER_STATUS_CHANGED',
      entity: 'Dossier',
      entityId: d.id,
      meta: { to: to.code },
    });
  }

  private loadFull(id: string) {
    return this.prisma.dossier.findUniqueOrThrow({ where: { id }, include: fullInclude });
  }

  // 404 (et non 403) quand le dossier n'est pas accessible : on ne révèle pas son existence.
  private async findMine(user: AuthUser, id: string) {
    if (!APPLICANT_ROLES.includes(user.role)) throw new ForbiddenException();
    const d = await this.prisma.dossier.findFirst({ where: { id, applicantId: user.id }, include: fullInclude });
    if (!d) throw new NotFoundException('Dossier introuvable');
    return d;
  }

  private async findForStaff(user: AuthUser, id: string) {
    const scope = await this.staffWhere(user);
    const d = await this.prisma.dossier.findFirst({ where: { AND: [{ id }, scope] }, include: fullInclude });
    if (!d) throw new NotFoundException('Dossier introuvable');
    return d;
  }

  private async staffWhere(user: AuthUser): Promise<Prisma.DossierWhereInput> {
    const memberships = await this.prisma.userService.findMany({ where: { userId: user.id }, select: { serviceId: true } });
    const scope: StaffScope = { userId: user.id, role: user.role, serviceIds: memberships.map((m) => m.serviceId) };
    const filter = staffDossierFilter(scope);
    if (!filter) throw new ForbiddenException();
    return filter;
  }

  private ensureAssigner(user: AuthUser) {
    if (!ASSIGNER_ROLES.includes(user.role)) throw new ForbiddenException('Seul un responsable peut affecter un dossier');
  }
}
