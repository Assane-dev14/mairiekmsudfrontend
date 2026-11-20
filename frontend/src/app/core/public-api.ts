import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

// Contenus du portail public (§4.1, §4.2). Aucune de ces routes ne demande d'être connecté.

export interface ContactInfo {
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  openingHours: string;
  socials: { label: string; url: string }[];
  validated: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  level: 'URGENT' | 'CAMPAIGN';
  linkUrl: string | null;
  linkLabel: string | null;
  endsAt: string | null;
}

export interface SiteInfo {
  contact: ContactInfo;
  welcome: { title: string; message: string; signature: string | null };
  announcements: Announcement[];
}

export type PageCategory = 'MAIRIE' | 'LEGAL';

export interface PageSummary {
  slug: string;
  title: string;
  summary: string | null;
  category: PageCategory;
}

export interface Page extends PageSummary {
  body: string;
  updatedAt: string;
}

export interface NewsSummary {
  slug: string;
  title: string;
  excerpt: string;
  category: string | null;
  publishedAt: string;
}

export interface News extends NewsSummary {
  body: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface MunicipalService {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
  domains: string[];
}

export interface Procedure {
  code: string;
  name: string;
  category: string;
  description: string | null;
  onlineMode: 'FULL' | 'PARTIAL' | 'IN_PERSON';
  indicativeDays: number | null;
  fee: string | null;
  service: { id: string; name: string };
}

export type SearchType = 'page' | 'service' | 'procedure' | 'news' | 'faq';

export interface SearchHit {
  type: SearchType;
  title: string;
  excerpt: string;
  url: string;
}

export interface ContentReport {
  pagePath: string;
  pageTitle?: string;
  message: string;
  email?: string;
}

export const PAGE_PATHS: Record<PageCategory, string> = {
  MAIRIE: '/la-mairie',
  LEGAL: '/informations-legales',
};

const API = '/api/v1';

@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly http = inject(HttpClient);
  private sitePromise: Promise<SiteInfo> | null = null;

  /** Coordonnées et annonces, partagées par l'en-tête, le pied de page et l'accueil. */
  readonly site = signal<SiteInfo | null>(null);

  loadSite(): Promise<SiteInfo> {
    this.sitePromise ??= firstValueFrom(this.http.get<SiteInfo>(`${API}/site`)).then(
      (info) => {
        this.site.set(info);
        return info;
      },
      (e) => {
        this.sitePromise = null; // nouvel essai à la prochaine navigation
        throw e;
      },
    );
    return this.sitePromise;
  }

  pages(category?: PageCategory): Promise<PageSummary[]> {
    const params = category ? new HttpParams().set('category', category) : undefined;
    return firstValueFrom(this.http.get<PageSummary[]>(`${API}/pages`, { params }));
  }

  page(slug: string): Promise<Page> {
    return firstValueFrom(this.http.get<Page>(`${API}/pages/${encodeURIComponent(slug)}`));
  }

  news(page = 1, pageSize = 9): Promise<Paged<NewsSummary>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return firstValueFrom(this.http.get<Paged<NewsSummary>>(`${API}/news`, { params }));
  }

  newsArticle(slug: string): Promise<News> {
    return firstValueFrom(this.http.get<News>(`${API}/news/${encodeURIComponent(slug)}`));
  }

  faq(): Promise<FaqEntry[]> {
    return firstValueFrom(this.http.get<FaqEntry[]>(`${API}/faq`));
  }

  services(): Promise<MunicipalService[]> {
    return firstValueFrom(this.http.get<MunicipalService[]>(`${API}/services`));
  }

  procedures(): Promise<Procedure[]> {
    return firstValueFrom(this.http.get<Procedure[]>(`${API}/procedures`));
  }

  search(q: string): Promise<SearchHit[]> {
    return firstValueFrom(this.http.get<SearchHit[]>(`${API}/search`, { params: { q } }));
  }

  reportContent(report: ContentReport): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API}/content-reports`, report));
  }
}

/** Lien d'annonce sûr : chemin interne ou URL https, sinon rien. */
export function announcementLink(url: string | null): { internal: string } | { external: string } | null {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return { internal: url };
  if (url.startsWith('https://')) return { external: url };
  return null;
}
