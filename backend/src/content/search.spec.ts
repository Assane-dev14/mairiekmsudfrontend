import { excerptAround, fold, plainText, search, Searchable, searchTerms } from './search';

describe('fold', () => {
  it('retire accents et majuscules sans changer la longueur', () => {
    expect(fold('Démarches À Keur Massar')).toBe('demarches a keur massar');
    expect(Array.from(fold('Œuvre élémentaire')).length).toBe(Array.from('Œuvre élémentaire').length);
  });
});

describe('searchTerms', () => {
  it('découpe, normalise, ignore les mots d’une lettre et les doublons', () => {
    expect(searchTerms("  L'État   civil, état ")).toEqual(['etat', 'civil']);
  });

  it('renvoie une liste vide pour une requête sans mot exploitable', () => {
    expect(searchTerms(' a ! ')).toEqual([]);
  });
});

describe('plainText', () => {
  it('retire intertitres et puces', () => {
    expect(plainText('## Horaires\n\n- Lundi\n- Mardi')).toBe('Horaires Lundi Mardi');
  });
});

describe('excerptAround', () => {
  it('centre l’extrait sur le premier mot trouvé', () => {
    const text = `${'x'.repeat(200)} résidence ${'y'.repeat(200)}`;
    const excerpt = excerptAround(text, ['residence'], 20);
    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt).toContain('résidence');
  });
});

describe('search', () => {
  const items: Searchable[] = [
    { type: 'faq', title: 'Comment obtenir un acte ?', text: 'Adressez-vous au service de l’état civil.', url: '/faq' },
    { type: 'service', title: 'État civil', text: 'Actes de naissance, de mariage et de décès.', url: '/la-mairie/services' },
    { type: 'news', title: 'Travaux de voirie', text: 'La route principale sera fermée.', url: '/actualites/voirie' },
  ];

  it('ne garde que les éléments contenant tous les mots, sans tenir compte des accents', () => {
    expect(search(items, 'etat civil').map((h) => h.type)).toEqual(['service', 'faq']);
  });

  it('classe d’abord les correspondances dans le titre', () => {
    expect(search(items, 'acte')[0].type).toBe('faq');
  });

  it('respecte la limite et ignore les requêtes vides', () => {
    expect(search(items, 'civil', 1)).toHaveLength(1);
    expect(search(items, '  ')).toEqual([]);
  });
});
