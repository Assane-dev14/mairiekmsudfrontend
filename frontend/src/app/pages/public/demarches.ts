import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Procedure, PublicApi } from '../../core/public-api';
import { Breadcrumb } from '../../shared/breadcrumb';
import { LoadState, scrollToFragment } from '../../shared/page-utils';

const ONLINE_MODE: Record<Procedure['onlineMode'], string> = {
  FULL: 'Entièrement en ligne',
  PARTIAL: 'En ligne, puis passage au guichet',
  IN_PERSON: 'Au guichet uniquement',
};

/** Catalogue public des démarches actives, regroupées par catégorie. */
@Component({
  selector: 'app-demarches',
  imports: [RouterLink, Breadcrumb],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="[{ label: 'Démarches' }]" />
        <h1>Démarches</h1>
        <p class="lead">Conditions, délais indicatifs et mode de dépôt des démarches proposées par la mairie.</p>
      </div>
    </div>

    <div class="container page-body">
      @switch (state()) {
        @case ('ready') {
          @for (group of groups(); track group.category) {
            <section class="group">
              <div class="section-head"><h2>{{ group.category }}</h2></div>
              <ul class="card-grid">
                @for (p of group.items; track p.code) {
                  <li class="card" [id]="'demarche-' + p.code" tabindex="-1">
                    <h3>{{ p.name }}</h3>
                    @if (p.description) {
                      <p>{{ p.description }}</p>
                    }
                    <dl>
                      <div><dt>Service</dt><dd>{{ p.service.name }}</dd></div>
                      <div><dt>Mode</dt><dd>{{ modes[p.onlineMode] }}</dd></div>
                      @if (p.indicativeDays) {
                        <div><dt>Délai indicatif</dt><dd>{{ p.indicativeDays }} jours</dd></div>
                      }
                      <div><dt>Coût</dt><dd>{{ p.fee ? p.fee + ' FCFA' : 'Gratuit ou non renseigné' }}</dd></div>
                    </dl>
                    @if (p.onlineMode !== 'IN_PERSON') {
                      <a class="btn btn-outline" [routerLink]="auth.isLoggedIn() ? '/espace' : '/connexion'" [queryParams]="auth.isLoggedIn() ? null : { retour: '/espace' }">
                        Faire la démarche depuis mon espace
                      </a>
                    }
                  </li>
                }
              </ul>
            </section>
          } @empty {
            <p class="state">Aucune démarche n’est encore ouverte en ligne. Les démarches sont publiées après validation par la mairie.</p>
          }
        }
        @case ('error') {
          <p class="notice notice-error" role="alert">Impossible de charger les démarches. Vérifiez votre connexion puis réessayez.</p>
        }
        @default {
          <p class="state" role="status">Chargement des démarches…</p>
        }
      }
    </div>
  `,
  styles: `
    .group + .group { margin-top: 40px; }
    dl { display: grid; gap: 6px; margin: 16px 0; font-size: 15px; }
    dl div { display: flex; gap: 8px; }
    dt { min-width: 120px; color: var(--km-muted); }
    dd { margin: 0; font-weight: 600; }
  `,
})
export class Demarches implements OnInit {
  private readonly api = inject(PublicApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);

  protected readonly modes = ONLINE_MODE;
  protected readonly procedures = signal<Procedure[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly groups = computed(() => {
    const byCategory = new Map<string, Procedure[]>();
    for (const p of this.procedures()) byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);
    return [...byCategory].map(([category, items]) => ({ category, items }));
  });

  async ngOnInit(): Promise<void> {
    try {
      this.procedures.set(await this.api.procedures());
      this.state.set('ready');
      scrollToFragment(this.route.snapshot.fragment);
    } catch {
      this.state.set('error');
    }
  }
}
