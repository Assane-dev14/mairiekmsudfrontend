import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MunicipalService, PublicApi } from '../../core/public-api';
import { Breadcrumb } from '../../shared/breadcrumb';
import { Icon } from '../../shared/icon';
import { LoadState, scrollToFragment } from '../../shared/page-utils';
import { ReportOutdated } from '../../shared/report-outdated';

/** Annuaire des services municipaux et de leurs domaines de compétence (§4.2). */
@Component({
  selector: 'app-services-directory',
  imports: [Breadcrumb, Icon, ReportOutdated],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="[{ label: 'La mairie', link: '/la-mairie/presentation' }, { label: 'Services municipaux' }]" />
        <h1>Services municipaux</h1>
        <p class="lead">Les services de la mairie, leurs domaines de compétence et leurs coordonnées.</p>
      </div>
    </div>

    <div class="container page-body">
      @switch (state()) {
        @case ('ready') {
          <ul class="card-grid">
            @for (s of services(); track s.id) {
              <li class="card service" [id]="'service-' + s.id" tabindex="-1">
                <h2>{{ s.name }}</h2>
                @if (s.description) {
                  <p>{{ s.description }}</p>
                }
                @if (s.domains.length) {
                  <h3>Domaines de compétence</h3>
                  <ul class="domains">
                    @for (d of s.domains; track d) {
                      <li>{{ d }}</li>
                    }
                  </ul>
                }
                <ul class="contact">
                  <li><app-icon name="clock" [size]="16" />{{ s.openingHours || 'Horaires non renseignés' }}</li>
                  @if (s.address) {
                    <li><app-icon name="pin" [size]="16" />{{ s.address }}</li>
                  }
                  @if (s.phone) {
                    <li><app-icon name="phone" [size]="16" /><a [href]="'tel:' + s.phone">{{ s.phone }}</a></li>
                  }
                  @if (s.email) {
                    <li><app-icon name="mail" [size]="16" /><a [href]="'mailto:' + s.email">{{ s.email }}</a></li>
                  }
                </ul>
              </li>
            } @empty {
              <li class="state">Aucun service n’est publié pour le moment.</li>
            }
          </ul>
          <app-report-outdated pageTitle="Services municipaux" />
        }
        @case ('error') {
          <p class="notice notice-error" role="alert">Impossible de charger l’annuaire. Vérifiez votre connexion puis réessayez.</p>
        }
        @default {
          <p class="state" role="status">Chargement de l’annuaire…</p>
        }
      }
    </div>
  `,
  styles: `
    .service h2 { font-size: 20px; color: var(--km-green-900); }
    .service h3 { margin-top: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: var(--km-muted); }
    .domains { margin: 8px 0 0; padding-left: 20px; }
    .contact { display: grid; gap: 6px; margin: 16px 0 0; padding: 14px 0 0; list-style: none; border-top: 1px solid var(--km-border); font-size: 15px; }
    .contact li { display: flex; gap: 8px; align-items: flex-start; }
  `,
})
export class ServicesDirectory implements OnInit {
  private readonly api = inject(PublicApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly services = signal<MunicipalService[]>([]);
  protected readonly state = signal<LoadState>('loading');

  async ngOnInit(): Promise<void> {
    try {
      this.services.set(await this.api.services());
      this.state.set('ready');
      scrollToFragment(this.route.snapshot.fragment);
    } catch {
      this.state.set('error');
    }
  }
}
