import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const DESCRIPTION = `
API du **portail citoyen et de la plateforme de gestion municipale** de la Mairie de Keur Massar.

Toutes les routes sont préfixées par \`/api/v1\`.

---

## Avancement

| Module | État |
|---|---|
| Authentification (inscription, connexion, sessions) | ✅ Disponible |
| Catalogue public (annuaire des services, démarches, formulaires) | ✅ Disponible |
| Portail public (pages institutionnelles, actualités, annonces, FAQ, recherche, signalement d’information obsolète) | ✅ Disponible |
| Espace citoyen : dépôt, suivi, retrait, messages | ✅ Disponible |
| Backoffice : liste filtrée, affectation, workflow, notes internes | ✅ Disponible |
| Supervision (\`/health\`) | ✅ Disponible |
| Pièces jointes | 🚧 Prochaine étape |
| Rendez-vous, signalements | ⏳ Planifié |
| Administration (services, démarches, utilisateurs internes) | ⏳ Planifié |
| Notifications, vérification e-mail, MFA administrateurs | ⏳ Planifié |

---

## Comptes de démonstration

Créés par \`npm run db:seed\`. Mot de passe commun : **\`Demo-KeurMassar-2026\`**

| Compte | Rôle | Service |
|---|---|---|
| \`citoyen@keurmassar.test\` | CITOYEN | — |
| \`agent.etatcivil@keurmassar.test\` | AGENT | État civil |
| \`responsable.etatcivil@keurmassar.test\` | RESPONSABLE | État civil |
| \`agent.technique@keurmassar.test\` | AGENT | Services techniques |
| \`superadmin@keurmassar.test\` | SUPER_ADMIN | — |

⚠️ Les services, démarches et pièces du jeu de démonstration sont **fictifs** et doivent être remplacés par les procédures validées par la mairie.

---

## Parcours de test complet

1. **GET /procedures/CERTIFICAT_RESIDENCE** : voir les champs du formulaire.
2. **POST /auth/login** avec le compte citoyen → **Authorize** 🔒 → coller l'\`accessToken\`.
3. **POST /dossiers** (l'exemple est prérempli) → noter l'\`id\` et la référence \`KM-…\`.
4. Se reconnecter en **responsable** → **GET /backoffice/dossiers** → le dossier apparaît.
5. **POST /backoffice/dossiers/{id}/transitions** \`{"toStatus":"A_QUALIFIER"}\`, puis **GET …/assignable-agents** et **POST …/assign**.
6. Continuer le workflow : \`AFFECTE\` → \`EN_INSTRUCTION\` → \`ATTENTE_CITOYEN\` (motif obligatoire)…
7. Revenir en **citoyen** : **GET /dossiers/{id}** montre l'historique sans les étapes ni notes internes.

Le jeton d'accès expire après **15 minutes** : **POST /auth/refresh** en fournit un nouveau.

## Workflow générique des dossiers

\`\`\`
SOUMIS → À_QUALIFIER → AFFECTÉ → EN_INSTRUCTION ⇄ ATTENTE_CITOYEN
             │                        ↓
             └──→ REJETÉ          À_VALIDER → ACCEPTÉ / REJETÉ → CLÔTURÉ
SOUMIS / À_QUALIFIER → RETIRÉ (par le demandeur)
\`\`\`

Les statuts et transitions sont **configurables par démarche** ; chaque transition précise les rôles autorisés et si un motif est obligatoire.

---

## Rôles

| Rôle | Usage |
|---|---|
| \`CITOYEN\` | Habitant : profil, démarches, rendez-vous, suivi de ses propres dossiers |
| \`ORGANISATION\` | Établissement / association : démarches autorisées |
| \`AGENT\` | Agent municipal : traite les dossiers qui lui sont affectés |
| \`RESPONSABLE\` | Responsable de service : affecte, supervise, valide |
| \`EDITEUR\` | Communicant : contenus éditoriaux |
| \`ADMIN_FONCTIONNEL\` | Configure services, démarches, formulaires, horaires |
| \`SUPER_ADMIN\` | Utilisateurs internes, rôles, paramètres, audit |

Seuls \`CITOYEN\` et \`ORGANISATION\` peuvent s'inscrire eux-mêmes.

---

## Sécurité

- Toutes les routes exigent un jeton, sauf celles marquées comme publiques.
- Mots de passe hachés avec **argon2id**.
- **Verrouillage** du compte 15 min après 5 échecs de connexion.
- Jetons de rafraîchissement **à usage unique** : un rejeu révoque toutes les sessions.
- Rôle et état du compte vérifiés à chaque requête : une suspension prend effet immédiatement.
- Limitation de débit globale (100 req/min/IP) et renforcée sur l'authentification.

## Format des erreurs

\`\`\`json
{ "statusCode": 400, "message": ["Le mot de passe doit contenir au moins 10 caractères"], "error": "Bad Request" }
\`\`\`

\`message\` est une chaîne, ou une liste en cas d'erreurs de validation. Les champs non prévus dans une requête sont refusés.
`;

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Mairie de Keur Massar')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Jeton d’accès obtenu via POST /auth/login' })
    .addTag('Authentification', 'Inscription, connexion, sessions et profil courant')
    .addTag('Catalogue public', 'Annuaire des services et catalogue des démarches, sans authentification')
    .addTag('Espace citoyen — Mes démarches', 'Dépôt et suivi des dossiers par le demandeur')
    .addTag('Backoffice — Dossiers', 'Traitement des dossiers par les agents et responsables')
    .addTag('Supervision', 'Disponibilité de l’API et de la base de données')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'API Keur Massar — Documentation',
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      operationsSorter: 'method',
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  });
}
