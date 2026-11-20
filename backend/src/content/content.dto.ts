import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementLevel, ContentReportStatus, PageCategory } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

// ---------- Informations générales ----------

export class SocialLinkDto {
  @ApiProperty({ example: 'Facebook' })
  label: string;

  @ApiProperty({ example: 'https://www.facebook.com/...' })
  url: string;
}

export class ContactInfoDto {
  @ApiProperty({ example: 'Commune de Keur Massar Sud' })
  name: string;

  @ApiProperty({ example: 'Hôtel de ville, Keur Massar Sud, Dakar' })
  address: string;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiProperty({ example: 'Lundi–vendredi, 8h–17h' })
  openingHours: string;

  @ApiProperty({ type: [SocialLinkDto] })
  socials: SocialLinkDto[];

  @ApiProperty({ description: '`false` tant que la mairie n’a pas validé ces coordonnées : le portail affiche alors un avertissement.' })
  validated: boolean;
}

export class WelcomeDto {
  @ApiProperty({ example: 'Bienvenue sur le portail de la Commune de Keur Massar Sud' })
  title: string;

  @ApiProperty({ description: 'Message institutionnel affiché sur l’accueil.' })
  message: string;

  @ApiPropertyOptional({ nullable: true, description: 'Signataire du message (ex. le maire).' })
  signature: string | null;
}

export class AnnouncementDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  body: string | null;

  @ApiProperty({ enum: AnnouncementLevel, description: '`URGENT` : bandeau sur toutes les pages · `CAMPAIGN` : mise en avant sur l’accueil.' })
  level: AnnouncementLevel;

  @ApiPropertyOptional({ nullable: true, example: '/actualites/campagne-salubrite' })
  linkUrl: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'En savoir plus' })
  linkLabel: string | null;

  @ApiPropertyOptional({ nullable: true })
  endsAt: Date | null;
}

export class SiteInfoDto {
  @ApiProperty({ type: ContactInfoDto })
  contact: ContactInfoDto;

  @ApiProperty({ type: WelcomeDto })
  welcome: WelcomeDto;

  @ApiProperty({ type: [AnnouncementDto], description: 'Annonces en cours (date de début passée, date de fin non atteinte).' })
  announcements: AnnouncementDto[];
}

// ---------- Pages ----------

export class PageQueryDto {
  @ApiPropertyOptional({ enum: PageCategory })
  @IsOptional()
  @IsEnum(PageCategory)
  category?: PageCategory;
}

export class PageSummaryDto {
  @ApiProperty({ example: 'presentation' })
  slug: string;

  @ApiProperty({ example: 'Présentation de la commune' })
  title: string;

  @ApiPropertyOptional({ nullable: true })
  summary: string | null;

  @ApiProperty({ enum: PageCategory })
  category: PageCategory;
}

export class PageDto extends PageSummaryDto {
  @ApiProperty({ description: 'Texte brut : paragraphes séparés par une ligne vide, « ## » pour un intertitre, « - » pour une liste.' })
  body: string;

  @ApiProperty({ description: 'Date de dernière mise à jour, affichée sur la page.' })
  updatedAt: Date;
}

// ---------- Actualités ----------

export class NewsSummaryDto {
  @ApiProperty({ example: 'campagne-salubrite' })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  excerpt: string;

  @ApiPropertyOptional({ nullable: true, example: 'Cadre de vie' })
  category: string | null;

  @ApiProperty()
  publishedAt: Date;
}

export class NewsDto extends NewsSummaryDto {
  @ApiProperty({ description: 'Même format que le corps des pages.' })
  body: string;
}

export class NewsPageDto {
  @ApiProperty({ type: [NewsSummaryDto] })
  items: NewsSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

// ---------- FAQ ----------

export class FaqEntryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  question: string;

  @ApiProperty()
  answer: string;

  @ApiProperty({ example: 'Démarches' })
  category: string;
}

// ---------- Recherche ----------

export class SearchQueryDto {
  @ApiProperty({ example: 'état civil', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q: string;
}

export class SearchHitDto {
  @ApiProperty({ enum: ['page', 'service', 'procedure', 'news', 'faq'] })
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ description: 'Passage du texte contenant les mots recherchés.' })
  excerpt: string;

  @ApiProperty({ example: '/la-mairie/services', description: 'Chemin de la page du portail à ouvrir.' })
  url: string;
}

// ---------- Signalement d'information obsolète ----------

export class CreateContentReportDto {
  @ApiProperty({ example: '/contact', description: 'Chemin de la page concernée.' })
  @IsString()
  @Matches(/^\/(?!\/)/, { message: 'pagePath doit être un chemin interne commençant par /' })
  @MaxLength(300)
  pagePath: string;

  @ApiPropertyOptional({ example: 'Contact et horaires' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pageTitle?: string;

  @ApiProperty({ example: 'Le numéro de téléphone indiqué ne répond plus.', minLength: 10, maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ description: 'Facultatif, pour être recontacté.' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class ContentReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContentReportStatus })
  @IsOptional()
  @IsEnum(ContentReportStatus)
  status?: ContentReportStatus;
}

export class ContentReportDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  pagePath: string;

  @ApiPropertyOptional({ nullable: true })
  pageTitle: string | null;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiProperty({ enum: ContentReportStatus })
  status: ContentReportStatus;

  @ApiProperty()
  createdAt: Date;
}

export class ContentReportPageDto {
  @ApiProperty({ type: [ContentReportDto] })
  items: ContentReportDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}
