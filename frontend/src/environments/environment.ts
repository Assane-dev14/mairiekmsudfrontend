// Production : aucun compte de démonstration n'est embarqué.
export const environment = {
  production: true,
  demoAccounts: [] as { label: string; email: string }[],
  demoPassword: '',
};
