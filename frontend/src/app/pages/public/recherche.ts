import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicApi, SearchHit, SearchType } from '../../core/public-api';
import { Breadcrumb } from '../../shared/breadcrumb';
import { LoadState } from '../../shared/page-utils';

const TYPE_LABELS: Record<SearchType, string> = {
  page: 'Page',
  service: 'Service',
  procedure: 'Démarche',
  news: 'Actualité',
  faq: 'FAQ',
};

/** Recherche globale (§4.1) : /recherche?q=… */
@Component({
  selector: 'app-recherche',
  imports: [RouterLink, FormsModule, Breadcrumb],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="[{ label: 'Recherche' }]" />
        <h1>Rechercher sur le portail</h1>
        <form class="search-form" role="search" (ngSubmit)="submit()">
          <label for="search-page" class="sr-only">Mots recherchés</label>
          <input id="search-page" type="search" name="q" [(ngModel)]="draft" maxlength="100" placeholder="Démarche, service, actualité…" />
          <button class="btn btn-primary" type="submit">Rechercher</button>
        </form>
      </div>
    </div>

    <div class="container page-body">
      @switch (state()) {
        @case ('ready') {
          <p class="meta" role="status">
            {{ hits().length === 0 ? 'Aucun résultat' : hits().length + (hits().length > 1 ? ' résultats' : ' résultat') }} pour « {{ query() }} »
          </p>
          <ol class="results">
            @for (h of hits(); track h.url) {
              <li>
                <span class="tag">{{ labels[h.type] }}</span>
                <h2><a [routerLink]="path(h.url)" [fragment]="fragment(h.url)">{{ h.title }}</a></h2>
                <p>{{ h.excerpt }}</p>
              </li>
            }
          </ol>
          @if (!hits().length) {
            <p>Essayez avec d’autres mots, consultez la <a routerLink="/faq">FAQ</a> ou l’<a routerLink="/la-mairie/services">annuaire des services</a>.</p>
          }
        }
        @case ('error') {
          <p class="notice notice-error" role="alert">La recherche a échoué. Vérifiez votre connexion puis réessayez.</p>
        }
        @case ('loading') {
          <p class="state" role="status">Recherche en cours…</p>
        }
        @default {
          <p class="state">Saisissez au moins 2 caractères.</p>
        }
      }
    </div>
  `,
  styles: `
    .search-form { display: flex; gap: 8px; max-width: 640px; margin-top: 16px; }
    .search-form input { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border: 1.5px solid var(--km-border); border-radius: 10px; }
    .results { max-width: 820px; margin: 16px 0 0; padding: 0; list-style: none; }
    .results li { padding: 18px 0; border-bottom: 1px solid var(--km-border); }
    .results h2 { margin-top: 8px; font-size: 19px; }
    .results p { margin: 6px 0 0; color: var(--km-muted); }
  `,
})
export class Recherche {
  private readonly api = inject(PublicApi);
  private readonly router = inject(Router);

  protected readonly labels = TYPE_LABELS;
  protected readonly query = signal('');
  protected readonly hits = signal<SearchHit[]>([]);
  // 'notfound' sert ici d'état « requête trop courte ».
  protected readonly state = signal<LoadState>('notfound');
  protected draft = '';

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.run(params.get('q')?.trim() ?? ''));
  }

  protected submit(): void {
    this.router.navigate([], { queryParams: { q: this.draft.trim() } });
  }

  protected path(url: string): string {
    return url.split('#')[0];
  }

  protected fragment(url: string): string | undefined {
    return url.split('#')[1];
  }

  private async run(q: string): Promise<void> {
    this.draft = q;
    this.query.set(q);
    if (q.length < 2) {
      this.state.set('notfound');
      return;
    }
    this.state.set('loading');
    try {
      const hits = await this.api.search(q);
      if (this.query() !== q) return; // une recherche plus récente a été lancée
      this.hits.set(hits);
      this.state.set('ready');
    } catch {
      if (this.query() === q) this.state.set('error');
    }
  }
}
