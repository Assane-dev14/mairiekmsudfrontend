import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Breadcrumb } from '../../shared/breadcrumb';

/**
 * Page d'information simple, pilotée par les données de la route :
 * modules annoncés mais pas encore ouverts (rendez-vous, signalements) et page introuvable.
 */
@Component({
  selector: 'app-info-page',
  imports: [RouterLink, Breadcrumb],
  template: `
    <div class="page-head">
      <div class="container">
        <app-breadcrumb [items]="[{ label: data['heading'] }]" />
        <h1>{{ data['heading'] }}</h1>
      </div>
    </div>
    <div class="container page-body">
      <p class="notice notice-info">{{ data['text'] }}</p>
      <p class="actions">
        <a class="btn btn-primary" routerLink="/contact">Contacter la mairie</a>
        <a class="btn btn-outline" routerLink="/">Retour à l’accueil</a>
      </p>
    </div>
  `,
  styles: `
    .notice { max-width: 760px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  `,
})
export class InfoPage {
  protected readonly data = inject(ActivatedRoute).snapshot.data;
}
