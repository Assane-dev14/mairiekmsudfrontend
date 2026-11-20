import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MunicipalService, PublicApi } from '../../core/public-api';
import { Breadcrumb } from '../../shared/breadcrumb';
import { Icon } from '../../shared/icon';
import { ReportOutdated } from '../../shared/report-outdated';

/** Horaires, adresses et canaux de contact (§4.2). */
@Component({
  selector: 'app-contact',
  imports: [RouterLink, Breadcrumb, Icon, ReportOutdated],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="[{ label: 'Contact' }]" />
        <h1>Contact et horaires</h1>
        <p class="lead">Adresse, horaires d’ouverture et moyens de joindre la mairie et ses services.</p>
      </div>
    </div>

    <div class="container page-body">
      @if (site(); as s) {
        @if (!s.contact.validated) {
          <p class="notice notice-info">Ces coordonnées sont en cours de validation par la mairie.</p>
        }
        <div class="layout">
          <section class="card main" aria-labelledby="mairie-title">
            <h2 id="mairie-title">{{ s.contact.name }}</h2>
            <ul>
              <li><app-icon name="pin" /><span><strong>Adresse</strong>{{ s.contact.address }}</span></li>
              <li><app-icon name="clock" /><span><strong>Horaires</strong>{{ s.contact.openingHours }}</span></li>
              <li>
                <app-icon name="phone" />
                <span><strong>Téléphone</strong>
                  @if (s.contact.phone) {
                    <a [href]="'tel:' + s.contact.phone">{{ s.contact.phone }}</a>
                  } @else {
                    Non communiqué pour le moment
                  }
                </span>
              </li>
              <li>
                <app-icon name="mail" />
                <span><strong>E-mail</strong>
                  @if (s.contact.email) {
                    <a [href]="'mailto:' + s.contact.email">{{ s.contact.email }}</a>
                  } @else {
                    Non communiqué pour le moment
                  }
                </span>
              </li>
            </ul>
            @if (s.contact.socials.length) {
              <p class="socials">
                @for (social of s.contact.socials; track social.url) {
                  <a [href]="social.url" target="_blank" rel="noopener">{{ social.label }}</a>
                }
              </p>
            }
          </section>

          <aside class="card">
            <h2>Avant de vous déplacer</h2>
            <p>Beaucoup de réponses se trouvent dans la <a routerLink="/faq">FAQ</a>. Vous pouvez aussi suivre vos démarches depuis votre <a routerLink="/espace">espace personnel</a>.</p>
          </aside>
        </div>
      } @else if (siteError()) {
        <p class="notice notice-error" role="alert">Impossible de charger les coordonnées. Vérifiez votre connexion puis réessayez.</p>
      } @else {
        <p class="state" role="status">Chargement…</p>
      }

      @if (services().length) {
        <section class="section">
          <div class="section-head">
            <h2>Joindre un service</h2>
            <a routerLink="/la-mairie/services">Annuaire complet</a>
          </div>
          <ul class="card-grid">
            @for (svc of services(); track svc.id) {
              <li class="card">
                <h3><a routerLink="/la-mairie/services" [fragment]="'service-' + svc.id">{{ svc.name }}</a></h3>
                <p>{{ svc.openingHours || 'Horaires non renseignés' }}</p>
                @if (svc.phone) {
                  <p><a [href]="'tel:' + svc.phone">{{ svc.phone }}</a></p>
                }
                @if (svc.email) {
                  <p><a [href]="'mailto:' + svc.email">{{ svc.email }}</a></p>
                }
              </li>
            }
          </ul>
        </section>
      }

      <app-report-outdated pageTitle="Contact et horaires" />
    </div>
  `,
  styles: `
    .notice { margin-bottom: 20px; max-width: 760px; }
    .layout { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: start; }
    .card h2 { font-size: 20px; color: var(--km-green-900); }
    .main ul { display: grid; gap: 16px; margin: 18px 0 0; padding: 0; list-style: none; }
    .main li { display: flex; gap: 12px; color: var(--km-green-700); }
    .main li span { display: grid; color: var(--km-ink); }
    .socials { display: flex; gap: 16px; }
    @media (max-width: 760px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class Contact implements OnInit {
  private readonly api = inject(PublicApi);

  protected readonly site = this.api.site;
  protected readonly siteError = signal(false);
  protected readonly services = signal<MunicipalService[]>([]);

  ngOnInit(): void {
    this.api.loadSite().catch(() => this.siteError.set(true));
    this.api.services().then((s) => this.services.set(s), () => undefined);
  }
}
