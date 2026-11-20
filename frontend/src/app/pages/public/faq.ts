import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaqEntry, PublicApi } from '../../core/public-api';
import { Breadcrumb } from '../../shared/breadcrumb';
import { LoadState, scrollToFragment } from '../../shared/page-utils';

@Component({
  selector: 'app-faq',
  imports: [RouterLink, Breadcrumb],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="[{ label: 'Questions fréquentes' }]" />
        <h1>Questions fréquentes</h1>
        <p class="lead">Les réponses aux questions les plus courantes. Vous ne trouvez pas ? <a routerLink="/contact">Contactez la mairie</a>.</p>
      </div>
    </div>

    <div class="container page-body">
      @switch (state()) {
        @case ('ready') {
          @for (group of groups(); track group.category) {
            <section class="group">
              <h2>{{ group.category }}</h2>
              @for (f of group.items; track f.id) {
                <details class="faq" [id]="'faq-' + f.id" tabindex="-1">
                  <summary>{{ f.question }}</summary>
                  <p>{{ f.answer }}</p>
                </details>
              }
            </section>
          } @empty {
            <p class="state">Aucune question n’est publiée pour le moment.</p>
          }
        }
        @case ('error') {
          <p class="notice notice-error" role="alert">Impossible de charger la FAQ. Vérifiez votre connexion puis réessayez.</p>
        }
        @default {
          <p class="state" role="status">Chargement…</p>
        }
      }
    </div>
  `,
  styles: `
    .group { max-width: 820px; }
    .group + .group { margin-top: 32px; }
    h2 { margin-bottom: 12px; font-size: 20px; color: var(--km-green-900); }
    .faq { margin-bottom: 10px; background: var(--km-surface); border: 1px solid var(--km-border); border-radius: var(--km-radius); }
    summary { padding: 16px 18px; font-weight: 600; cursor: pointer; }
    .faq[open] summary { color: var(--km-green-800); }
    .faq p { margin: 0; padding: 0 18px 18px; color: var(--km-muted); }
  `,
})
export class Faq implements OnInit {
  private readonly api = inject(PublicApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly entries = signal<FaqEntry[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly groups = computed(() => {
    const byCategory = new Map<string, FaqEntry[]>();
    for (const f of this.entries()) byCategory.set(f.category, [...(byCategory.get(f.category) ?? []), f]);
    return [...byCategory].map(([category, items]) => ({ category, items }));
  });

  async ngOnInit(): Promise<void> {
    try {
      this.entries.set(await this.api.faq());
      this.state.set('ready');
      scrollToFragment(this.route.snapshot.fragment);
    } catch {
      this.state.set('error');
    }
  }
}
