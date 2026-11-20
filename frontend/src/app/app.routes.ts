import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guards';
import { PublicLayout } from './layout/public-layout';

const SUFFIX = ' — Portail citoyen de Keur Massar Sud';

export const routes: Routes = [
  {
    path: 'connexion',
    title: 'Connexion' + SUFFIX,
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'espace',
    title: 'Mon espace' + SUFFIX,
    canActivate: [authGuard],
    loadComponent: () => import('./pages/espace/espace').then((m) => m.Espace),
  },

  // Portail public (§4) : en-tête, navigation et pied de page communs.
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Accueil' + SUFFIX,
        loadComponent: () => import('./pages/public/accueil/accueil').then((m) => m.Accueil),
      },
      {
        path: 'la-mairie',
        pathMatch: 'full',
        redirectTo: 'la-mairie/presentation',
      },
      {
        path: 'la-mairie/services',
        title: 'Services municipaux' + SUFFIX,
        loadComponent: () => import('./pages/public/services-directory').then((m) => m.ServicesDirectory),
      },
      {
        path: 'la-mairie/:slug',
        data: { category: 'MAIRIE' },
        loadComponent: () => import('./pages/public/content-page').then((m) => m.ContentPage),
      },
      {
        path: 'informations-legales/:slug',
        data: { category: 'LEGAL' },
        loadComponent: () => import('./pages/public/content-page').then((m) => m.ContentPage),
      },
      {
        path: 'demarches',
        title: 'Démarches' + SUFFIX,
        loadComponent: () => import('./pages/public/demarches').then((m) => m.Demarches),
      },
      {
        path: 'actualites',
        title: 'Actualités' + SUFFIX,
        loadComponent: () => import('./pages/public/actualites').then((m) => m.Actualites),
      },
      {
        path: 'actualites/:slug',
        loadComponent: () => import('./pages/public/actualites').then((m) => m.Actualite),
      },
      {
        path: 'faq',
        title: 'Questions fréquentes' + SUFFIX,
        loadComponent: () => import('./pages/public/faq').then((m) => m.Faq),
      },
      {
        path: 'recherche',
        title: 'Recherche' + SUFFIX,
        loadComponent: () => import('./pages/public/recherche').then((m) => m.Recherche),
      },
      {
        path: 'contact',
        title: 'Contact' + SUFFIX,
        loadComponent: () => import('./pages/public/contact').then((m) => m.Contact),
      },
      {
        path: 'rendez-vous',
        title: 'Rendez-vous' + SUFFIX,
        data: {
          heading: 'Rendez-vous',
          text: 'La prise de rendez-vous en ligne sera bientôt disponible. En attendant, contactez directement le service concerné.',
        },
        loadComponent: () => import('./pages/public/info-page').then((m) => m.InfoPage),
      },
      {
        path: 'signalements',
        title: 'Signalements' + SUFFIX,
        data: {
          heading: 'Signalements',
          text: 'Le signalement en ligne des problèmes de voirie, d’éclairage ou de salubrité sera bientôt disponible. En attendant, contactez les services techniques.',
        },
        loadComponent: () => import('./pages/public/info-page').then((m) => m.InfoPage),
      },
      {
        path: '**',
        title: 'Page introuvable' + SUFFIX,
        data: { heading: 'Page introuvable', text: 'La page demandée n’existe pas ou a été déplacée.' },
        loadComponent: () => import('./pages/public/info-page').then((m) => m.InfoPage),
      },
    ],
  },
];
