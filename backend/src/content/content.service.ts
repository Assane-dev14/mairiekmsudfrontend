import { Injectable, NotFoundException } from '@nestjs/common';
import { PageCategory, Prisma } from '@prisma/client';
import { paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnnouncementDto,
  ContactInfoDto,
  ContentReportPageDto,
  ContentReportQueryDto,
  CreateContentReportDto,
  FaqEntryDto,
  NewsDto,
  NewsPageDto,
  PageDto,
  PageSummaryDto,
  SearchHitDto,
  SiteInfoDto,
  WelcomeDto,
} from './content.dto';
import { search, Searchable } from './search';

// Valeurs affichées tant que la mairie n'a pas saisi ses coordonnées officielles.
const DEFAULT_CONTACT: ContactInfoDto = {
  name: 'Commune de Keur Massar Sud',
  address: 'Keur Massar Sud, Dakar, Sénégal',
  phone: null,
  email: null,
  openingHours: 'Horaires à confirmer par la mairie',
  socials: [],
  validated: false,
};

const DEFAULT_WELCOME: WelcomeDto = {
  title: 'Bienvenue sur le portail de la Commune de Keur Massar Sud',
  message: 'Retrouvez les informations de la mairie, les services municipaux et vos démarches en ligne.',
  signature: null,
};

const PAGE_PATHS: Record<PageCategory, string> = {
  MAIRIE: '/la-mairie',
  LEGAL: '/informations-legales',
};

const pageSummarySelect = { slug: true, title: true, summary: true, category: true } satisfies Prisma.PageSelect;
const newsSummarySelect = { slug: true, title: true, excerpt: true, category: true, publishedAt: true } satisfies Prisma.NewsArticleSelect;

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async siteInfo(now = new Date()): Promise<SiteInfoDto> {
    const [settings, announcements] = await this.prisma.$transaction([
      this.prisma.siteSetting.findMany({ where: { key: { in: ['contact', 'welcome'] } } }),
      this.prisma.announcement.findMany({
        where: { active: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        orderBy: [{ level: 'asc' }, { startsAt: 'desc' }],
        select: { id: true, title: true, body: true, level: true, linkUrl: true, linkLabel: true, endsAt: true },
      }),
    ]);
    const value = (key: string) => settings.find((s) => s.key === key)?.value as object | undefined;
    return {
      contact: { ...DEFAULT_CONTACT, ...value('contact') },
      welcome: { ...DEFAULT_WELCOME, ...value('welcome') },
      announcements: announcements as AnnouncementDto[],
    };
  }

  listPages(category?: PageCategory): Promise<PageSummaryDto[]> {
    return this.prisma.page.findMany({
      where: { published: true, category },
      orderBy: [{ category: 'asc' }, { position: 'asc' }],
      select: pageSummarySelect,
    });
  }

  async getPage(slug: string): Promise<PageDto> {
    const page = await this.prisma.page.findFirst({
      where: { slug, published: true },
      select: { ...pageSummarySelect, body: true, updatedAt: true },
    });
    if (!page) throw new NotFoundException('Page introuvable');
    return page;
  }

  async listNews(q: PaginationQueryDto): Promise<NewsPageDto> {
    const where = publishedNews();
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.newsArticle.findMany({ where, orderBy: { publishedAt: 'desc' }, select: newsSummarySelect, ...paginate(q) }),
      this.prisma.newsArticle.count({ where }),
    ]);
    return { items: rows as NewsPageDto['items'], total, page: q.page, pageSize: q.pageSize };
  }

  async getNews(slug: string): Promise<NewsDto> {
    const news = await this.prisma.newsArticle.findFirst({
      where: { slug, ...publishedNews() },
      select: { ...newsSummarySelect, body: true },
    });
    if (!news) throw new NotFoundException('Actualité introuvable');
    return news as NewsDto;
  }

  listFaq(): Promise<FaqEntryDto[]> {
    return this.prisma.faqEntry.findMany({
      where: { published: true },
      orderBy: [{ category: 'asc' }, { position: 'asc' }],
      select: { id: true, question: true, answer: true, category: true },
    });
  }

  /**
   * Recherche en mémoire : le contenu publié d'une mairie reste de taille modeste (quelques centaines
   * d'éléments) et cela permet d'ignorer les accents sans extension PostgreSQL.
   * À remplacer par une recherche plein texte si le volume d'actualités devient important.
   */
  async search(query: string): Promise<SearchHitDto[]> {
    const [pages, services, procedures, news, faq] = await this.prisma.$transaction([
      this.prisma.page.findMany({ where: { published: true }, select: { slug: true, title: true, summary: true, body: true, category: true } }),
      this.prisma.service.findMany({ where: { active: true }, select: { id: true, name: true, description: true, domains: true } }),
      this.prisma.procedureType.findMany({
        where: { active: true, service: { active: true } },
        select: { code: true, name: true, description: true, category: true },
      }),
      this.prisma.newsArticle.findMany({ where: publishedNews(), select: { slug: true, title: true, excerpt: true, body: true } }),
      this.prisma.faqEntry.findMany({ where: { published: true }, select: { id: true, question: true, answer: true } }),
    ]);

    const items: Searchable[] = [
      ...pages.map((p) => ({
        type: 'page' as const,
        title: p.title,
        text: [p.summary, p.body].filter(Boolean).join('\n\n'),
        url: `${PAGE_PATHS[p.category]}/${p.slug}`,
      })),
      ...services.map((s) => ({
        type: 'service' as const,
        title: s.name,
        text: [s.description, ...s.domains].filter(Boolean).join('\n\n'),
        url: `/la-mairie/services#service-${s.id}`,
      })),
      ...procedures.map((p) => ({
        type: 'procedure' as const,
        title: p.name,
        text: [p.category, p.description].filter(Boolean).join('\n\n'),
        url: `/demarches#demarche-${p.code}`,
      })),
      ...news.map((n) => ({ type: 'news' as const, title: n.title, text: `${n.excerpt}\n\n${n.body}`, url: `/actualites/${n.slug}` })),
      ...faq.map((f) => ({ type: 'faq' as const, title: f.question, text: f.answer, url: `/faq#faq-${f.id}` })),
    ];
    return search(items, query);
  }

  async createReport(dto: CreateContentReportDto): Promise<void> {
    await this.prisma.contentReport.create({
      data: { pagePath: dto.pagePath, pageTitle: dto.pageTitle, message: dto.message.trim(), email: dto.email?.toLowerCase() },
    });
  }

  async listReports(q: ContentReportQueryDto): Promise<ContentReportPageDto> {
    const where: Prisma.ContentReportWhereInput = { status: q.status };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contentReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, pagePath: true, pageTitle: true, message: true, email: true, status: true, createdAt: true },
        ...paginate(q),
      }),
      this.prisma.contentReport.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
}

function publishedNews(now = new Date()): Prisma.NewsArticleWhereInput {
  return { published: true, publishedAt: { lte: now } };
}
