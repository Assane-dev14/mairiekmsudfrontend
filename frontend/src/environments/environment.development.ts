// Développement uniquement : comptes créés par `npm run db:seed` côté API.
export const environment = {
  production: false,
  demoAccounts: [
    { label: 'Citoyen', email: 'citoyen@keurmassar.test' },
    { label: 'Agent — État civil', email: 'agent.etatcivil@keurmassar.test' },
    { label: 'Responsable — État civil', email: 'responsable.etatcivil@keurmassar.test' },
    { label: 'Super administrateur', email: 'superadmin@keurmassar.test' },
  ],
  demoPassword: 'Demo-KeurMassar-2026',
};
