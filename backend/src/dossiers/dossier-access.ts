// Règles d'accès aux dossiers (§3, §9 : moindre privilège, isolation entre services).
import { Prisma, Role } from '@prisma/client';

export const APPLICANT_ROLES: Role[] = [Role.CITOYEN, Role.ORGANISATION];
export const BACKOFFICE_ROLES: Role[] = [Role.AGENT, Role.RESPONSABLE, Role.SUPER_ADMIN];
export const ASSIGNER_ROLES: Role[] = [Role.RESPONSABLE, Role.SUPER_ADMIN];
export const ASSIGNABLE_ROLES: Role[] = [Role.AGENT, Role.RESPONSABLE];

export interface StaffScope {
  userId: string;
  role: Role;
  serviceIds: string[];
}

/**
 * Filtre des dossiers visibles par un membre du personnel, ou `null` s'il n'a aucun accès.
 * - SUPER_ADMIN : tous les dossiers.
 * - RESPONSABLE : tous les dossiers de ses services.
 * - AGENT : ses dossiers affectés, plus les dossiers non affectés de ses services (à qualifier).
 */
export function staffDossierFilter(scope: StaffScope): Prisma.DossierWhereInput | null {
  switch (scope.role) {
    case Role.SUPER_ADMIN:
      return {};
    case Role.RESPONSABLE:
      return { serviceId: { in: scope.serviceIds } };
    case Role.AGENT:
      return {
        OR: [{ assigneeId: scope.userId }, { assigneeId: null, serviceId: { in: scope.serviceIds } }],
      };
    default:
      return null;
  }
}

/** Un demandeur ne peut déclencher une transition que sur son propre dossier. */
export function canUseTransition(role: Role, allowedRoles: Role[], isApplicant: boolean): boolean {
  if (!allowedRoles.includes(role)) return false;
  return APPLICANT_ROLES.includes(role) ? isApplicant : true;
}
