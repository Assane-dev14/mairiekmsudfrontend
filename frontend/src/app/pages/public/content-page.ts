import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Page, PageCategory, PublicApi } from '../../core/public-api';
import { Breadcrumb, Crumb } from '../../shared/breadcrumb';
import { DateFrPipe, isNotFound, LoadState, TITLE_SUFFIX } from '../../shared/page-utils';
import { ReportOutdated } from '../../shared/report-outdated';
import { RichText } from '../../shared/rich-text';

const SECTION: Record<PageCategory, Crumb> = {
  MAIRIE: { label: 'La mairie', link: '/la-mairie/presentation' },
  LEGAL: { label: 'Informations légales' },
};

/** Pages institutionnelles (/la-mairie/…) et légales (/informations-legales/…), §4.2. */
@Component({
  selector: 'app-content-page',
  imports: [RouterLink, Breadcrumb, RichText, ReportOutdated, DateFrPipe],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="crumbs()" />
        @if (page(); as p) {
          <h1>{{ p.title }}</h1>
          @if (p.summary) {
            <p class="lead">{{ p.summary }}</p>
          }
        }
      </div>
    </div>

    <div class="container page-body">
      @switch (state()) {
        @case ('ready') {
          <app-rich-text [body]="page()!.body" />
          <p class="meta">Dernière mise à jour : {{ page()!.updatedAt | dateFr }}</p>
          <app-report-outdated [pageTitle]="page()!.title" />
        }
        @case ('notfound') {
          <h1>Page introuvable</h1>
          <p class="state">Cette page n’existe pas ou n’est plus publiée. <a routerLink="/">Retour à l’accueil</a></p>
        }
        @case ('error') {
          <p class="notice notice-error" role="alert">Impossible de charger cette page. Vérifiez votre connexion puis réessayez.</p>
        }
        @default {
          <p class="state" role="status">Chargement…</p>
        }
      }
    </div>
  `,
})
export class ContentPage {
  private readonly api = inject(PublicApi);
  private readonly title = inject(Title);
  private readonly route = inject(ActivatedRoute);
  private readonly category: PageCategory = this.route.snapshot.data['category'];

  protected readonly page = signal<Page | null>(null);
  protected readonly state = signal<LoadState>('loading');
  protected readonly crumbs = computed<Crumb[]>(() => [SECTION[this.category], { label: this.page()?.title ?? '…' }]);

  constructor() {
    // Le composant est réutilisé quand on passe d'une page à l'autre : on suit le paramètre.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => this.load(params.get('slug') ?? ''));
  }

  private async load(slug: string): Promise<void> {
    this.state.set('loading');
    this.page.set(null);
    try {
      const page = await this.api.page(slug);
      if (page.category !== this.category) throw { status: 404 };
      this.page.set(page);
      this.title.setTitle(page.title + TITLE_SUFFIX);
      this.state.set('ready');
    } catch (e) {
      const missing = isNotFound(e) || (e as { status?: number }).status === 404;
      this.state.set(missing ? 'notfound' : 'error');
      if (missing) this.title.setTitle('Page introuvable' + TITLE_SUFFIX);
    }
  }
}
