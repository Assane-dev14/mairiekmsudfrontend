/**
 * Données de démonstration pour le développement.
 * Les services, démarches, pièces et délais ci-dessous sont des EXEMPLES :
 * ils doivent être remplacés par les procédures validées par la mairie (cahier des charges §16).
 *
 * Idempotent : peut être relancé sans créer de doublons.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD ?? 'Demo-KeurMassar-2026';
const DOMAIN = 'keurmassar.test'; // domaine réservé aux tests, jamais routé

const CITIZEN = [Role.CITOYEN, Role.ORGANISATION];
const STAFF = [Role.AGENT, Role.RESPONSABLE];

// Cycle de vie générique d'un dossier (§6.1).
const STATUSES = [
  { code: 'SOUMIS', label: 'Soumis', isInitial: true },
  { code: 'A_QUALIFIER', label: 'À qualifier', visibleToApplicant: false },
  { code: 'AFFECTE', label: 'Affecté', visibleToApplicant: false },
  { code: 'EN_INSTRUCTION', label: 'En instruction' },
  { code: 'ATTENTE_CITOYEN', label: 'En attente de complément' },
  { code: 'A_VALIDER', label: 'À valider', visibleToApplicant: false },
  { code: 'ACCEPTE', label: 'Accepté', isDecision: true },
  { code: 'REJETE', label: 'Rejeté', isDecision: true },
  { code: 'CLOTURE', label: 'Clôturé', isFinal: true },
  { code: 'RETIRE', label: 'Retiré par le demandeur', isFinal: true },
];

const TRANSITIONS: { from: string; to: string; roles: Role[]; reason?: boolean }[] = [
  { from: 'SOUMIS', to: 'A_QUALIFIER', roles: STAFF },
  { from: 'A_QUALIFIER', to: 'AFFECTE', roles: [Role.RESPONSABLE] },
  { from: 'A_QUALIFIER', to: 'REJETE', roles: STAFF, reason: true },
  { from: 'AFFECTE', to: 'EN_INSTRUCTION', roles: STAFF },
  { from: 'EN_INSTRUCTION', to: 'ATTENTE_CITOYEN', roles: STAFF, reason: true },
  { from: 'ATTENTE_CITOYEN', to: 'EN_INSTRUCTION', roles: [...CITIZEN, ...STAFF] },
  { from: 'EN_INSTRUCTION', to: 'A_VALIDER', roles: STAFF },
  { from: 'A_VALIDER', to: 'ACCEPTE', roles: [Role.RESPONSABLE] },
  { from: 'A_VALIDER', to: 'REJETE', roles: [Role.RESPONSABLE], reason: true },
  { from: 'A_VALIDER', to: 'EN_INSTRUCTION', roles: [Role.RESPONSABLE], reason: true },
  { from: 'ACCEPTE', to: 'CLOTURE', roles: STAFF },
  { from: 'REJETE', to: 'CLOTURE', roles: STAFF },
  { from: 'CLOTURE', to: 'EN_INSTRUCTION', roles: [Role.RESPONSABLE], reason: true }, // réouverture
  { from: 'SOUMIS', to: 'RETIRE', roles: CITIZEN },
  { from: 'A_QUALIFIER', to: 'RETIRE', roles: CITIZEN },
];

const SERVICES = [
  {
    key: 'etatcivil',
    name: 'État civil',
    description: 'Actes, attestations et certificats administratifs (exemple).',
    domains: ['Actes de naissance, mariage et décès', 'Certificats et attestations', 'Légalisation de signatures'],
  },
  {
    key: 'technique',
    name: 'Services techniques',
    description: 'Voirie, éclairage, occupation du domaine public (exemple).',
    domains: ['Voirie et assainissement', 'Éclairage public', 'Occupation du domaine public'],
  },
  {
    key: 'social',
    name: 'Action sociale',
    description: 'Aides et accompagnement social (exemple).',
    domains: ['Aides sociales', 'Accompagnement des personnes vulnérables', 'Santé et solidarité'],
  },
];

const PROCEDURES = [
  {
    code: 'CERTIFICAT_RESIDENCE',
    name: 'Certificat de résidence',
    category: 'Attestations',
    service: 'etatcivil',
    description: 'Demande de certificat de résidence. Retrait du document au guichet.',
    conditions: 'Résider sur le territoire de la commune.',
    requiredDocs: ['Copie de la carte nationale d’identité', 'Justificatif de domicile récent'],
    indicativeDays: 5,
    onlineMode: 'PARTIAL' as const,
    active: true,
    fields: [
      { name: 'nomComplet', label: 'Nom complet', type: 'text', required: true, maxLength: 120 },
      { name: 'dateNaissance', label: 'Date de naissance', type: 'date', required: true },
      { name: 'quartier', label: 'Quartier', type: 'text', required: true, maxLength: 80 },
      { name: 'adresse', label: 'Adresse', type: 'textarea', required: true, maxLength: 300 },
      { name: 'motif', label: 'Motif', type: 'select', required: true, options: ['Dossier administratif', 'Emploi', 'Scolarité', 'Autre'] },
    ],
  },
  {
    code: 'OCCUPATION_DOMAINE_PUBLIC',
    name: 'Autorisation d’occupation temporaire du domaine public',
    category: 'Urbanisme et voirie',
    service: 'technique',
    description: 'Installation temporaire sur la voie publique (étal, chantier, cérémonie…).',
    conditions: 'Demande à déposer avant la date d’occupation souhaitée.',
    requiredDocs: ['Plan ou croquis de l’emplacement'],
    indicativeDays: 10,
    onlineMode: 'FULL' as const,
    active: true,
    fields: [
      { name: 'objet', label: 'Objet de l’occupation', type: 'textarea', required: true, maxLength: 500 },
      { name: 'lieu', label: 'Lieu exact', type: 'text', required: true, maxLength: 200 },
      { name: 'dateDebut', label: 'Date de début', type: 'date', required: true },
      { name: 'dateFin', label: 'Date de fin', type: 'date', required: true },
      { name: 'surfaceM2', label: 'Surface (m²)', type: 'number', required: false },
    ],
  },
  {
    code: 'AIDE_SOCIALE',
    name: 'Demande d’aide sociale',
    category: 'Social',
    service: 'social',
    description: 'Démarche désactivée tant que les critères ne sont pas validés (§4.10).',
    requiredDocs: [],
    onlineMode: 'FULL' as const,
    active: false,
    fields: [{ name: 'situation', label: 'Situation', type: 'textarea', required: true }],
  },
];

const USERS = [
  { email: `superadmin@${DOMAIN}`, role: Role.SUPER_ADMIN, firstName: 'Super', lastName: 'Admin', services: [] },
  { email: `responsable.etatcivil@${DOMAIN}`, role: Role.RESPONSABLE, firstName: 'Fatou', lastName: 'Ndiaye', services: ['etatcivil'] },
  { email: `agent.etatcivil@${DOMAIN}`, role: Role.AGENT, firstName: 'Moussa', lastName: 'Sarr', services: ['etatcivil'] },
  { email: `agent.technique@${DOMAIN}`, role: Role.AGENT, firstName: 'Ibrahima', lastName: 'Fall', services: ['technique'] },
  { email: `citoyen@${DOMAIN}`, role: Role.CITOYEN, firstName: 'Awa', lastName: 'Diallo', services: [] },
];

// ---------- Portail public (§4.1, §4.2) ----------
// Textes de démonstration : à remplacer par les contenus validés par la mairie avant la mise en ligne.

const DRAFT = 'Contenu provisoire, à valider par la mairie.';

const SETTINGS = {
  // `validated: false` affiche un avertissement tant que les coordonnées officielles ne sont pas confirmées.
  contact: {
    name: 'Commune de Keur Massar Sud',
    address: 'Hôtel de ville, Keur Massar Sud, Dakar, Sénégal',
    phone: null,
    email: null,
    openingHours: 'Lundi au vendredi — horaires à confirmer',
    socials: [],
    validated: false,
  },
  welcome: {
    title: 'Bienvenue sur le portail de la Commune de Keur Massar Sud',
    message:
      'La mairie met à votre disposition ce portail pour vous informer, vous orienter vers le bon service et ' +
      `réaliser vos démarches sans vous déplacer. ${DRAFT}`,
    signature: 'Le Maire de Keur Massar Sud',
  },
};

const PAGES = [
  {
    slug: 'presentation',
    category: 'MAIRIE' as const,
    title: 'Présentation de la commune',
    summary: 'La Commune de Keur Massar Sud, son territoire et son conseil municipal.',
    body: `${DRAFT}

## La commune
Keur Massar Sud est une commune du département de Keur Massar, dans la région de Dakar. Cette page présentera son histoire, son territoire et ses quartiers.

## Le conseil municipal
Le conseil municipal, présidé par le maire, règle par ses délibérations les affaires de la commune.`,
  },
  {
    slug: 'missions',
    category: 'MAIRIE' as const,
    title: 'Missions de la mairie',
    summary: 'Les compétences exercées par la commune au service des habitants.',
    body: `${DRAFT}

## Nos missions
- Tenir l’état civil et délivrer les actes administratifs
- Entretenir la voirie communale et l’éclairage public
- Gérer l’occupation du domaine public
- Accompagner les personnes vulnérables
- Contribuer au cadre de vie, à la salubrité et à la jeunesse`,
  },
  {
    slug: 'organisation',
    category: 'MAIRIE' as const,
    title: 'Organisation des services',
    summary: 'Le cabinet du maire, le secrétariat municipal et les services.',
    body: `${DRAFT}

## Le cabinet du maire
Il assiste le maire dans ses fonctions et coordonne les relations avec les habitants.

## Le secrétariat municipal
Il coordonne l’ensemble des services municipaux.

## Les services
La liste des services, leurs domaines de compétence et leurs coordonnées sont présentés dans l’annuaire des services.`,
  },
  {
    slug: 'confidentialite',
    category: 'LEGAL' as const,
    title: 'Politique de confidentialité',
    summary: 'Comment la mairie traite vos données personnelles.',
    body: `${DRAFT} Ce texte doit être relu au regard de la loi sénégalaise n° 2008-12 sur la protection des données à caractère personnel.

## Données collectées
Les données nécessaires à votre compte et à l’instruction de vos démarches : identité, coordonnées, contenu des demandes et pièces jointes.

## Finalités
Traiter vos demandes, vous informer de leur avancement et assurer la sécurité du service.

## Vos droits
Vous pouvez demander l’accès, la rectification ou la suppression de vos données auprès de la mairie.`,
  },
  {
    slug: 'mentions-legales',
    category: 'LEGAL' as const,
    title: 'Mentions légales',
    summary: 'Éditeur du site, hébergement et propriété intellectuelle.',
    body: `${DRAFT}

## Éditeur
Commune de Keur Massar Sud. Directeur de la publication : le Maire.

## Hébergement
À compléter.

## Propriété intellectuelle
Les contenus de ce portail appartiennent à la commune, sauf mention contraire.`,
  },
  {
    slug: 'conditions-utilisation',
    category: 'LEGAL' as const,
    title: 'Conditions d’utilisation',
    summary: 'Règles d’usage du portail et de l’espace personnel.',
    body: `${DRAFT}

## Objet
Ces conditions encadrent l’utilisation du portail citoyen et de l’espace personnel.

## Engagements de l’usager
- Fournir des informations exactes
- Garder ses identifiants confidentiels
- Ne pas déposer de contenu illicite`,
  },
  {
    slug: 'accessibilite',
    category: 'LEGAL' as const,
    title: 'Accessibilité',
    summary: 'Notre démarche pour un portail utilisable par tous.',
    body: `${DRAFT}

## Notre engagement
Le portail est conçu pour être utilisable au clavier, lisible sur mobile et compatible avec les lecteurs d’écran.

## Signaler un problème
Si vous ne parvenez pas à accéder à un contenu, utilisez le lien « Signaler une information obsolète » en bas de page ou contactez la mairie.`,
  },
];

const NEWS = [
  {
    slug: 'ouverture-portail-citoyen',
    title: 'Ouverture du portail citoyen',
    category: 'Vie municipale',
    excerpt: 'Informations, annuaire des services et démarches en ligne : le nouveau portail de la commune est en service.',
    body: `Exemple d’actualité de démonstration.

La Commune de Keur Massar Sud ouvre son portail citoyen. Vous pouvez y consulter les informations de la mairie, trouver le bon service et suivre vos démarches.`,
    daysAgo: 1,
  },
  {
    slug: 'campagne-salubrite',
    title: 'Campagne de salubrité dans les quartiers',
    category: 'Cadre de vie',
    excerpt: 'Une journée de nettoyage est organisée avec les associations de quartier.',
    body: `Exemple d’actualité de démonstration.

## Programme
- Rassemblement le matin devant la mairie
- Nettoyage des rues et des caniveaux
- Sensibilisation au tri des déchets`,
    daysAgo: 4,
  },
  {
    slug: 'travaux-eclairage-public',
    title: 'Travaux d’éclairage public',
    category: 'Travaux',
    excerpt: 'Remplacement progressif des lampadaires défectueux sur les axes principaux.',
    body: `Exemple d’actualité de démonstration.

Les services techniques remplacent les lampadaires défectueux sur les axes principaux de la commune.`,
    daysAgo: 9,
  },
];

// Identifiants fixes pour que le seed reste idempotent.
const ANNOUNCEMENTS = [
  {
    id: '00000000-0000-4000-8000-0000000000a1',
    level: 'URGENT' as const,
    title: 'Démonstration : annonce urgente',
    body: 'Exemple de bandeau d’alerte affiché sur toutes les pages du portail.',
    linkUrl: '/actualites/ouverture-portail-citoyen',
    linkLabel: 'En savoir plus',
  },
  {
    id: '00000000-0000-4000-8000-0000000000a2',
    level: 'CAMPAIGN' as const,
    title: 'Campagne de salubrité',
    body: 'Participez à la journée de nettoyage de votre quartier.',
    linkUrl: '/actualites/campagne-salubrite',
    linkLabel: 'Voir le programme',
  },
];

const FAQ = [
  {
    id: '00000000-0000-4000-8000-0000000000f1',
    category: 'Démarches',
    question: 'Comment suivre l’avancement de ma demande ?',
    answer: 'Connectez-vous à votre espace personnel : chaque dossier affiche son statut et l’historique des échanges avec le service.',
  },
  {
    id: '00000000-0000-4000-8000-0000000000f2',
    category: 'Démarches',
    question: 'Toutes les démarches sont-elles disponibles en ligne ?',
    answer: 'Non. Certaines démarches demandent un passage au guichet. La fiche de chaque démarche précise si elle se fait entièrement en ligne.',
  },
  {
    id: '00000000-0000-4000-8000-0000000000f3',
    category: 'Mairie',
    question: 'Quels sont les horaires d’ouverture de la mairie ?',
    answer: 'Les horaires de la mairie et de chaque service sont indiqués sur la page Contact et dans l’annuaire des services.',
  },
  {
    id: '00000000-0000-4000-8000-0000000000f4',
    category: 'Portail',
    question: 'J’ai repéré une information erronée sur le portail, que faire ?',
    answer: 'Utilisez le lien « Signaler une information obsolète » en bas de la page concernée. Le service en charge des contenus la vérifiera.',
  },
];

async function seedPublicContent() {
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  for (const [position, p] of PAGES.entries()) {
    const data = { ...p, position, published: true };
    await prisma.page.upsert({ where: { slug: p.slug }, update: data, create: data });
  }
  for (const { daysAgo, ...n } of NEWS) {
    const data = { ...n, published: true, publishedAt: new Date(Date.now() - daysAgo * 86_400_000) };
    await prisma.newsArticle.upsert({ where: { slug: n.slug }, update: data, create: data });
  }
  for (const a of ANNOUNCEMENTS) {
    await prisma.announcement.upsert({ where: { id: a.id }, update: a, create: a });
  }
  for (const [position, f] of FAQ.entries()) {
    const data = { ...f, position };
    await prisma.faqEntry.upsert({ where: { id: f.id }, update: data, create: data });
  }
}

async function main() {
  const serviceIds: Record<string, string> = {};
  for (const s of SERVICES) {
    const row = await prisma.service.upsert({
      where: { name: s.name },
      update: { description: s.description, domains: s.domains },
      create: { name: s.name, description: s.description, domains: s.domains, openingHours: 'À confirmer par la mairie' },
    });
    serviceIds[s.key] = row.id;
  }

  for (const p of PROCEDURES) {
    const data = {
      name: p.name,
      category: p.category,
      description: p.description,
      conditions: p.conditions,
      requiredDocs: p.requiredDocs,
      formSchema: { fields: p.fields },
      indicativeDays: p.indicativeDays,
      onlineMode: p.onlineMode,
      active: p.active,
      serviceId: serviceIds[p.service],
    };
    const proc = await prisma.procedureType.upsert({ where: { code: p.code }, update: data, create: { code: p.code, ...data } });

    const statusIds: Record<string, string> = {};
    for (const [position, s] of STATUSES.entries()) {
      const flags = {
        label: s.label,
        isInitial: s.isInitial ?? false,
        isFinal: s.isFinal ?? false,
        isDecision: s.isDecision ?? false,
        visibleToApplicant: s.visibleToApplicant ?? true,
        position,
      };
      const row = await prisma.workflowStatus.upsert({
        where: { procedureTypeId_code: { procedureTypeId: proc.id, code: s.code } },
        update: flags,
        create: { procedureTypeId: proc.id, code: s.code, ...flags },
      });
      statusIds[s.code] = row.id;
    }
    for (const t of TRANSITIONS) {
      const data = { allowedRoles: t.roles, requiresReason: t.reason ?? false };
      await prisma.workflowTransition.upsert({
        where: { fromStatusId_toStatusId: { fromStatusId: statusIds[t.from], toStatusId: statusIds[t.to] } },
        update: data,
        create: { fromStatusId: statusIds[t.from], toStatusId: statusIds[t.to], ...data },
      });
    }
  }

  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, status: 'ACTIVE' },
      create: {
        email: u.email,
        passwordHash,
        role: u.role,
        status: 'ACTIVE',
        firstName: u.firstName,
        lastName: u.lastName,
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
      },
    });
    for (const key of u.services) {
      await prisma.userService.upsert({
        where: { userId_serviceId: { userId: user.id, serviceId: serviceIds[key] } },
        update: {},
        create: { userId: user.id, serviceId: serviceIds[key] },
      });
    }
  }

  await seedPublicContent();

  console.log(`Seed terminé. ${USERS.length} comptes (mot de passe : ${PASSWORD})`);
  for (const u of USERS) console.log(`  ${u.role.padEnd(12)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
