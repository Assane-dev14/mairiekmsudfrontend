import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { DossiersService } from './dossiers.service';
import { ApplicantMessageDto, ApplicantTransitionDto, CreateDossierDto, MyDossiersQueryDto } from './dto/dossier-input.dto';
import { ApplicantDossierDetailDto, AvailableTransitionDto, PaginatedApplicantDossiersDto } from './dto/dossier-view.dto';

const ID = ApiParam({ name: 'id', format: 'uuid', description: 'Identifiant du dossier (pas la référence).' });

@ApiTags('Espace citoyen — Mes démarches')
@ApiBearerAuth()
@Roles(Role.CITOYEN, Role.ORGANISATION)
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Non connecté ou jeton expiré.' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Réservé aux comptes citoyen et organisation.' })
@Controller('dossiers')
export class ApplicantDossiersController {
  constructor(private readonly dossiers: DossiersService) {}

  @Post()
  @ApiOperation({
    summary: 'Déposer une demande',
    description:
      'Dépose un dossier pour une démarche active (§4.4). Les données sont contrôlées contre le formulaire de la démarche : ' +
      'champs obligatoires, types, longueurs, listes de valeurs ; les champs inconnus sont refusés.\n\n' +
      'Le dossier reçoit un **identifiant non devinable** (`id`) et une **référence lisible** (`KM-AAAA-NNNNNN`), ' +
      'qui sert d’accusé de réception (§6.2).',
  })
  @ApiCreatedResponse({ type: ApplicantDossierDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Formulaire invalide : `message` liste chaque erreur.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Démarche inexistante ou désactivée.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDossierDto): Promise<ApplicantDossierDetailDto> {
    return this.dossiers.create(user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister mes dossiers',
    description: 'Uniquement les dossiers déposés par l’utilisateur connecté, du plus récent au plus ancien (§4.5).',
  })
  @ApiOkResponse({ type: PaginatedApplicantDossiersDto })
  list(@CurrentUser() user: AuthUser, @Query() q: MyDossiersQueryDto): Promise<PaginatedApplicantDossiersDto> {
    return this.dossiers.listMine(user, q);
  }

  @Get(':id')
  @ID
  @ApiOperation({
    summary: 'Consulter un de mes dossiers',
    description:
      'Détail, données déposées, historique des statuts et échanges avec la mairie. ' +
      'Les notes internes et les étapes internes du traitement ne sont jamais renvoyées.',
  })
  @ApiOkResponse({ type: ApplicantDossierDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Dossier inexistant ou appartenant à quelqu’un d’autre.' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ApplicantDossierDetailDto> {
    return this.dossiers.getMine(user, id);
  }

  @Get(':id/transitions')
  @ID
  @ApiOperation({
    summary: 'Actions possibles sur mon dossier',
    description: 'Par exemple : **retirer** la demande tant qu’elle n’est pas instruite, ou signaler qu’un **complément** a été fourni.',
  })
  @ApiOkResponse({ type: [AvailableTransitionDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  transitions(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<AvailableTransitionDto[]> {
    return this.dossiers.applicantTransitions(user, id);
  }

  @Post(':id/transitions')
  @HttpCode(200)
  @ID
  @ApiOperation({
    summary: 'Faire évoluer mon dossier',
    description:
      'Applique une des actions renvoyées par `GET /dossiers/{id}/transitions`. ' +
      'Exemples : `RETIRE` (retrait de la demande), `EN_INSTRUCTION` (complément fourni).',
  })
  @ApiOkResponse({ type: ApplicantDossierDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Action impossible depuis le statut actuel.' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Le dossier a changé entre-temps : recharger puis réessayer.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplicantTransitionDto,
  ): Promise<ApplicantDossierDetailDto> {
    return this.dossiers.applicantTransition(user, id, dto);
  }

  @Post(':id/messages')
  @ID
  @ApiOperation({ summary: 'Écrire à la mairie au sujet de ce dossier', description: 'Impossible une fois le dossier clôturé.' })
  @ApiCreatedResponse({ type: ApplicantDossierDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Message vide ou dossier clôturé.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  message(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplicantMessageDto,
  ): Promise<ApplicantDossierDetailDto> {
    return this.dossiers.applicantMessage(user, id, dto);
  }
}
