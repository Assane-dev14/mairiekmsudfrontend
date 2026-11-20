import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { announcementLink, PublicApi } from '../core/public-api';
import { Icon } from '../shared/icon';

const DISMISSED_KEY = 'km.alertes-masquees';

export const MAIRIE_MENU = [
  { label: 'Présentation', link: '/la-mairie/presentation' },
  { label: 'Missions', link: '/la-mairie/missions' },
  { label: 'Organisation', link: '/la-mairie/organisation' },
  { label: 'Services municipaux', link: '/la-mairie/services' },
];

export const LEGAL_LINKS = [
  { label: 'Politique de confidentialité', link: '/informations-legales/confidentialite' },
  { label: 'Mentions légales', link: '/informations-legales/mentions-legales' },
  { label: 'Conditions d’utilisation', link: '/informations-legales/conditions-utilisation' },
  { label: 'Accessibilité', link: '/informations-legales/accessibilite' },
];

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Icon],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout implements OnInit {
  private readonly api = inject(PublicApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly year = new Date().getFullYear();
  protected readonly mairieMenu = MAIRIE_MENU;
  protected readonly legalLinks = LEGAL_LINKS;
  protected readonly link = announcementLink;

  protected readonly menuOpen = signal(false);
  protected readonly mairieOpen = signal(false);
  protected readonly query = signal('');
  private readonly dismissed = signal<string[]>(readDismissed());

  protected readonly contact = computed(() => this.api.site()?.contact ?? null);
  protected readonly urgent = computed(() =>
    (this.api.site()?.announcements ?? []).filter((a) => a.level === 'URGENT' && !this.dismissed().includes(a.id)),
  );

  constructor() {
    // Referme les menus après chaque navigation (mobile notamment).
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.mairieOpen.set(false);
      });
  }

  ngOnInit(): void {
    // En cas d'échec, l'en-tête et le pied de page restent utilisables sans les coordonnées.
    this.api.loadSite().catch(() => undefined);
  }

  protected search(): void {
    const q = this.query().trim();
    if (q.length < 2) return;
    this.router.navigate(['/recherche'], { queryParams: { q } });
  }

  protected dismiss(id: string): void {
    this.dismissed.update((ids) => [...ids, id]);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(this.dismissed()));
    } catch {
      // Stockage indisponible (navigation privée) : l'alerte reviendra au prochain chargement.
    }
  }
}

function readDismissed(): string[] {
  try {
    const ids = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
