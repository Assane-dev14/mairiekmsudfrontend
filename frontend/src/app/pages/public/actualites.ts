import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { News, NewsSummary, Paged, PublicApi } from '../../core/public-api';
import { Breadcrumb } from '../../shared/breadcrumb';
import { DateFrPipe, isNotFound, LoadState, TITLE_SUFFIX } from '../../shared/page-utils';
import { RichText } from '../../shared/rich-text';

const PAGE_SIZE = 9;

/** Liste paginée des actualités (?page=2). */
@Component({
  selector: 'app-actualites',
  imports: [RouterLink, Breadcrumb, DateFrPipe],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="[{ label: 'Actualités' }]" />
        <h1>Actualités</h1>
        <p class="lead">Informations, travaux et vie de la commune.</p>
      </div>
    </div>

    <div class="container page-body">
      @switch (state()) {
        @case ('ready') {
          <ul class="card-grid">
            @for (n of result()!.items; track n.slug) {
              <li class="card">
                <p class="meta">
                  @if (n.category) {
                    <span class="tag">{{ n.category }}</span>
                  }
                  {{ n.publishedAt | dateFr }}
                </p>
                <h2><a [routerLink]="['/actualites', n.slug]">{{ n.title }}</a></h2>
                <p>{{ n.excerpt }}</p>
              </li>
            } @empty {
              <li class="state">Aucune actualité publiée pour le moment.</li>
            }
          </ul>
          @if (pages() > 1) {
            <nav class="pager" aria-label="Pagination des actualités">
              @if (page() > 1) {
                <a class="btn btn-outline" routerLink="/actualites" [queryParams]="{ page: page() - 1 }">Précédentes</a>
              }
              <span>Page {{ page() }} sur {{ pages() }}</span>
              @if (page() < pages()) {
                <a class="btn btn-outline" routerLink="/actualites" [queryParams]="{ page: page() + 1 }">Suivantes</a>
              }
            </nav>
          }
        }
        @case ('error') {
          <p class="notice notice-error" role="alert">Impossible de charger les actualités. Vérifiez votre connexion puis réessayez.</p>
        }
        @default {
          <p class="state" role="status">Chargement des actualités…</p>
        }
      }
    </div>
  `,
  styles: `
    .meta { display: flex; align-items: center; gap: 10px; margin: 0 0 10px !important; }
    h2 { font-size: 19px; }
    h2 a { color: var(--km-green-900); text-decoration: none; }
    h2 a:hover { text-decoration: underline; }
    .pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 32px; }
  `,
})
export class Actualites {
  private readonly api = inject(PublicApi);

  protected readonly result = signal<Paged<NewsSummary> | null>(null);
  protected readonly state = signal<LoadState>('loading');
  protected readonly page = signal(1);
  protected readonly pages = computed(() => {
    const r = this.result();
    return r ? Math.max(1, Math.ceil(r.total / r.pageSize)) : 1;
  });

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.load(Math.max(1, Number(params.get('page')) || 1)));
  }

  private async load(page: number): Promise<void> {
    this.page.set(page);
    this.state.set('loading');
    try {
      this.result.set(await this.api.news(page, PAGE_SIZE));
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }
}

/** Détail d'une actualité. */
@Component({
  selector: 'app-actualite',
  imports: [RouterLink, Breadcrumb, RichText, DateFrPipe],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="[{ label: 'Actualités', link: '/actualites' }, { label: news()?.title ?? '…' }]" />
        @if (news(); as n) {
          <h1>{{ n.title }}</h1>
          <p class="meta">
            @if (n.category) {
              <span class="tag">{{ n.category }}</span>
            }
            Publié le {{ n.publishedAt | dateFr }}
          </p>
        }
      </div>
    </div>

    <div class="container page-body">
      @switch (state()) {
        @case ('ready') {
          <p class="lead">{{ news()!.excerpt }}</p>
          <app-rich-text [body]="news()!.body" />
          <a routerLink="/actualites">← Toutes les actualités</a>
        }
        @case ('notfound') {
          <p class="state">Cette actualité n’existe pas ou n’est plus publiée. <a routerLink="/actualites">Voir les actualités</a></p>
        }
        @case ('error') {
          <p class="notice notice-error" role="alert">Impossible de charger cette actualité. Vérifiez votre connexion puis réessayez.</p>
        }
        @default {
          <p class="state" role="status">Chargement…</p>
        }
      }
    </div>
  `,
  styles: `
    .meta { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    .lead { max-width: 760px; font-size: 19px; font-weight: 600; color: var(--km-green-900); }
  `,
})
export class Actualite {
  private readonly api = inject(PublicApi);
  private readonly title = inject(Title);

  protected readonly news = signal<News | null>(null);
  protected readonly state = signal<LoadState>('loading');

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.load(params.get('slug') ?? ''));
  }

  private async load(slug: string): Promise<void> {
    this.state.set('loading');
    this.news.set(null);
    try {
      const news = await this.api.newsArticle(slug);
      this.news.set(news);
      this.title.setTitle(news.title + TITLE_SUFFIX);
      this.state.set('ready');
    } catch (e) {
      this.state.set(isNotFound(e) ? 'notfound' : 'error');
    }
  }
}
