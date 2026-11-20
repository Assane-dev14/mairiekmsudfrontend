import { Role } from '@prisma/client';
import { canUseTransition, staffDossierFilter } from './dossier-access';

describe('staffDossierFilter', () => {
  const base = { userId: 'u1', serviceIds: ['s1', 's2'] };

  it('donne tout au super administrateur', () => {
    expect(staffDossierFilter({ ...base, role: Role.SUPER_ADMIN })).toEqual({});
  });

  it('limite le responsable à ses services', () => {
    expect(staffDossierFilter({ ...base, role: Role.RESPONSABLE })).toEqual({ serviceId: { in: ['s1', 's2'] } });
  });

  it('limite l’agent à ses dossiers et aux dossiers non affectés de ses services', () => {
    expect(staffDossierFilter({ ...base, role: Role.AGENT })).toEqual({
      OR: [{ assigneeId: 'u1' }, { assigneeId: null, serviceId: { in: ['s1', 's2'] } }],
    });
  });

  it.each([Role.CITOYEN, Role.ORGANISATION, Role.EDITEUR, Role.ADMIN_FONCTIONNEL])('refuse tout accès au rôle %s', (role) => {
    expect(staffDossierFilter({ ...base, role })).toBeNull();
  });

  it('un responsable sans service ne voit rien', () => {
    expect(staffDossierFilter({ userId: 'u1', serviceIds: [], role: Role.RESPONSABLE })).toEqual({ serviceId: { in: [] } });
  });
});

describe('canUseTransition', () => {
  it('refuse un rôle absent de la transition', () => {
    expect(canUseTransition(Role.AGENT, [Role.RESPONSABLE], false)).toBe(false);
  });

  it('autorise le personnel prévu', () => {
    expect(canUseTransition(Role.RESPONSABLE, [Role.RESPONSABLE], false)).toBe(true);
  });

  it('n’autorise un citoyen que sur son propre dossier', () => {
    expect(canUseTransition(Role.CITOYEN, [Role.CITOYEN], true)).toBe(true);
    expect(canUseTransition(Role.CITOYEN, [Role.CITOYEN], false)).toBe(false);
  });
});
