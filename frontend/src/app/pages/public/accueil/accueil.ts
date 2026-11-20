import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { announcementLink, NewsSummary, PageSummary, PublicApi } from '../../../core/public-api';
import { Icon, IconName } from '../../../shared/icon';
import { DateFrPipe } from '../../../shared/page-utils';

const QUICK_LINKS: { label: string; text: string; link: string; icon: IconName }[] = [
  { label: 'Démarches', text: 'Trouver et effectuer une démarche', link: '/demarches', icon: 'file' },
  { label: 'Rendez-vous', text: 'Prendre rendez-vous avec un service', link: '/rendez-vous', icon: 'calendar' },
  { label: 'Signalements', text: 'Signaler un problème dans le quartier', link: '/signalements', icon: 'alert' },
  { label: 'Annuaire', text: 'Services municipaux et compétences', link: '/la-mairie/services', icon: 'building' },
  { label: 'Actualités', text: 'Informations et vie de la commune', link: '/actualites', icon: 'news' },
  { label: 'Contact', text: 'Horaires, adresse et téléphone', link: '/contact', icon: 'phone' },
];

@Component({
  selector: 'app-accueil',
  imports: [RouterLink, FormsModule, Icon, DateFrPipe],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class Accueil implements OnInit {
  private readonly api = inject(PublicApi);
  private readonly router = inject(Router);

  protected readonly quickLinks = QUICK_LINKS;
  protected readonly link = announcementLink;
  protected readonly query = signal('');
  protected readonly news = signal<NewsSummary[] | null>(null);
  protected readonly mairiePages = signal<PageSummary[]>([]);
  protected readonly newsError = signal(false);

  protected readonly site = this.api.site;
  protected readonly campaigns = computed(() => (this.site()?.announcements ?? []).filter((a) => a.level === 'CAMPAIGN'));

  ngOnInit(): void {
    this.api.loadSite().catch(() => undefined);
    this.api.news(1, 3).then(
      (page) => this.news.set(page.items),
      () => this.newsError.set(true),
    );
    this.api.pages('MAIRIE').then((pages) => this.mairiePages.set(pages), () => undefined);
  }

  protected search(): void {
    const q = this.query().trim();
    if (q.length >= 2) this.router.navigate(['/recherche'], { queryParams: { q } });
  }
}
