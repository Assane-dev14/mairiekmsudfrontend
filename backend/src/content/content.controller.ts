import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import {
  ContentReportPageDto,
  ContentReportQueryDto,
  CreateContentReportDto,
  FaqEntryDto,
  NewsDto,
  NewsPageDto,
  PageDto,
  PageQueryDto,
  PageSummaryDto,
  SearchHitDto,
  SearchQueryDto,
  SiteInfoDto,
} from './content.dto';
import { ContentService } from './content.service';

@ApiTags('Portail public')
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get('site')
  @ApiOperation({
    summary: 'Informations générales du portail',
    description: 'Coordonnées officielles, message institutionnel et annonces en cours (urgentes et campagnes) — §4.1.',
  })
  @ApiOkResponse({ type: SiteInfoDto })
  site(): Promise<SiteInfoDto> {
    return this.content.siteInfo();
  }

  @Public()
  @Get('pages')
  @ApiOperation({ summary: 'Pages institutionnelles et légales publiées', description: '§4.2' })
  @ApiOkResponse({ type: [PageSummaryDto] })
  listPages(@Query() q: PageQueryDto): Promise<PageSummaryDto[]> {
    return this.content.listPages(q.category);
  }

  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Contenu d’une page publiée' })
  @ApiParam({ name: 'slug', example: 'presentation' })
  @ApiOkResponse({ type: PageDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getPage(@Param('slug') slug: string): Promise<PageDto> {
    return this.content.getPage(slug);
  }

  @Public()
  @Get('news')
  @ApiOperation({ summary: 'Actualités publiées, les plus récentes en premier' })
  @ApiOkResponse({ type: NewsPageDto })
  listNews(@Query() q: PaginationQueryDto): Promise<NewsPageDto> {
    return this.content.listNews(q);
  }

  @Public()
  @Get('news/:slug')
  @ApiOperation({ summary: 'Détail d’une actualité' })
  @ApiOkResponse({ type: NewsDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getNews(@Param('slug') slug: string): Promise<NewsDto> {
    return this.content.getNews(slug);
  }

  @Public()
  @Get('faq')
  @ApiOperation({ summary: 'Questions fréquentes publiées' })
  @ApiOkResponse({ type: [FaqEntryDto] })
  listFaq(): Promise<FaqEntryDto[]> {
    return this.content.listFaq();
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('search')
  @ApiOperation({
    summary: 'Recherche globale',
    description: 'Dans les pages, services, démarches, actualités et FAQ (§4.1). Insensible à la casse et aux accents ; 30 résultats au plus.',
  })
  @ApiOkResponse({ type: [SearchHitDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Requête de moins de 2 caractères.' })
  search(@Query() q: SearchQueryDto): Promise<SearchHitDto[]> {
    return this.content.search(q.q);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('content-reports')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Signaler une information obsolète', description: 'Ouvert aux visiteurs non connectés (§4.2).' })
  @ApiNoContentResponse({ description: 'Signalement enregistré.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  createReport(@Body() dto: CreateContentReportDto): Promise<void> {
    return this.content.createReport(dto);
  }
}

@ApiTags('Backoffice — contenus')
@ApiBearerAuth()
@Roles(Role.EDITEUR, Role.ADMIN_FONCTIONNEL, Role.SUPER_ADMIN)
@Controller('backoffice/content-reports')
export class ContentReportsController {
  constructor(private readonly content: ContentService) {}

  @Get()
  @ApiOperation({ summary: 'Signalements d’informations obsolètes', description: 'Réservé aux éditeurs et administrateurs.' })
  @ApiOkResponse({ type: ContentReportPageDto })
  list(@Query() q: ContentReportQueryDto): Promise<ContentReportPageDto> {
    return this.content.listReports(q);
  }
}
