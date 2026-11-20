import { validateFormData } from './form-validation';

const schema = {
  fields: [
    { name: 'nom', label: 'Nom', type: 'text', required: true, maxLength: 10 },
    { name: 'naissance', label: 'Date de naissance', type: 'date', required: true },
    { name: 'motif', label: 'Motif', type: 'select', options: ['Emploi', 'Autre'] },
    { name: 'surface', label: 'Surface', type: 'number' },
  ],
};

describe('validateFormData', () => {
  it('accepte des données valides et supprime les espaces superflus', () => {
    const r = validateFormData(schema, { nom: '  Diop ', naissance: '1990-05-12', motif: 'Emploi', surface: 12 });
    expect(r.errors).toEqual([]);
    expect(r.value).toEqual({ nom: 'Diop', naissance: '1990-05-12', motif: 'Emploi', surface: 12 });
  });

  it('signale les champs obligatoires manquants ou vides', () => {
    const r = validateFormData(schema, { nom: '   ' });
    expect(r.errors).toEqual(['Nom est obligatoire', 'Date de naissance est obligatoire']);
  });

  it('refuse les champs inconnus', () => {
    const r = validateFormData(schema, { nom: 'Diop', naissance: '1990-05-12', admin: true });
    expect(r.errors).toContain('Champ inconnu : admin');
  });

  it('contrôle les types, longueurs, dates et listes', () => {
    const r = validateFormData(schema, { nom: 'Un nom beaucoup trop long', naissance: '2024-02-30', motif: 'Piratage', surface: '12' });
    expect(r.errors).toEqual([
      'Nom ne doit pas dépasser 10 caractères',
      'Date de naissance doit être une date au format AAAA-MM-JJ',
      'Motif : valeur non autorisée',
      'Surface doit être un nombre',
    ]);
  });

  it('ignore les champs facultatifs absents', () => {
    const r = validateFormData(schema, { nom: 'Diop', naissance: '1990-05-12' });
    expect(r.errors).toEqual([]);
    expect(r.value).not.toHaveProperty('motif');
  });
});
