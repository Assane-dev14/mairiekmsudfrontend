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
import { AssignDto, BackofficeDossiersQueryDto, StaffMessageDto, StaffTransitionDto } from './dto/dossier-input.dto';
import {
  AssignableAgentDto,
  AvailableTransitionDto,
  PaginatedStaffDossiersDto,
  StaffDossierDetailDto,
} from './dto/dossier-view.dto';

const ID = ApiParam({ name: 'id', format: 'uuid', description: 'Identifiant du dossier.' });
const NOT_VISIBLE = ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Dossier inexistant **ou hors de votre périmètre** (son existence n’est pas révélée).',
});

@ApiTags('Backoffice — Dossiers')
@ApiBearerAuth()
@Roles(Role.AGENT, Role.RESPONSABLE, Role.SUPER_ADMIN)
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Non connecté ou jeton expiré.' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Rôle non autorisé pour cette action.' })
@Controller('backoffice/dossiers')
export class BackofficeDossiersController {
  constructor(private readonly dossiers: DossiersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les dossiers de mon périmètre',
    description:
      'Liste filtrable et triable (§5.2). Le périmètre dépend du rôle :\n\n' +
      '| Rôle | Dossiers visibles |\n|---|---|\n' +
      '| `AGENT` | Ceux qui lui sont affectés + les non affectés de ses services |\n' +
      '| `RESPONSABLE` | Tous ceux de ses services |\n' +
      '| `SUPER_ADMIN` | Tous (lecture et affectation) |',
  })
  @ApiOkResponse({ type: PaginatedStaffDossiersDto })
  list(@CurrentUser() user: AuthUser, @Query() q: BackofficeDossiersQueryDto): Promise<PaginatedStaffDossiersDto> {
    return this.dossiers.listForStaff(user, q);
  }

  @Get(':id')
  @ID
  @ApiOperation({
    summary: 'Fiche complète d’un dossier',
    description: 'Demandeur, données, historique détaillé (auteur, motif), messages et notes internes. **Chaque consultation est journalisée.**',
  })
  @ApiOkResponse({ type: StaffDossierDetailDto })
  @NOT_VISIBLE
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<StaffDossierDetailDto> {
    return this.dossiers.getForStaff(user, id);
  }

  @Get(':id/transitions')
  @ID
  @ApiOperation({
    summary: 'Changements de statut possibles',
    description: 'Transitions autorisées depuis le statut actuel **pour votre rôle**, selon le workflow configuré pour la démarche (§6.1).',
  })
  @ApiOkResponse({ type: [AvailableTransitionDto] })
  @NOT_VISIBLE
  transitions(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<AvailableTransitionDto[]> {
    return this.dossiers.staffTransitions(user, id);
  }

  @Post(':id/transitions')
  @HttpCode(200)
  @ID
  @ApiOperation({
    summary: 'Changer le statut',
    description:
      'Chaque transition vérifie le rôle, exige un motif si configuré, et enregistre l’auteur, la date et le motif (§6.1).\n\n' +
      '- Entrer dans un statut **décisionnel** (accepté, rejeté) enregistre la décision et son motif.\n' +
      '- Entrer dans un statut **final** (clôturé) fixe la date de clôture.\n' +
      '- Si deux personnes agissent en même temps, la seconde reçoit **409**.',
  })
  @ApiOkResponse({ type: StaffDossierDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Transition impossible depuis le statut actuel, ou motif manquant.' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Le dossier a changé entre-temps.' })
  @NOT_VISIBLE
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffTransitionDto,
  ): Promise<StaffDossierDetailDto> {
    return this.dossiers.staffTransition(user, id, dto);
  }

  @Get(':id/assignable-agents')
  @Roles(Role.RESPONSABLE, Role.SUPER_ADMIN)
  @ID
  @ApiOperation({
    summary: 'Agents pouvant recevoir ce dossier',
    description: 'Agents et responsables actifs du service du dossier, avec leur nombre de dossiers en cours. Réservé aux responsables.',
  })
  @ApiOkResponse({ type: [AssignableAgentDto] })
  @NOT_VISIBLE
  assignable(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<AssignableAgentDto[]> {
    return this.dossiers.assignableAgents(user, id);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @Roles(Role.RESPONSABLE, Role.SUPER_ADMIN)
  @ID
  @ApiOperation({
    summary: 'Affecter ou réaffecter le dossier',
    description:
      'Confie le dossier à un agent du service concerné (§5.2). Une **réaffectation exige un motif**, enregistré dans l’historique. ' +
      'L’affectation ne change pas le statut : utiliser ensuite la transition adéquate.',
  })
  @ApiOkResponse({ type: StaffDossierDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Agent hors du service, inactif, déjà affecté, motif manquant ou dossier clôturé.' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Le dossier a changé entre-temps.' })
  @NOT_VISIBLE
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDto,
  ): Promise<StaffDossierDetailDto> {
    return this.dossiers.assign(user, id, dto);
  }

  @Post(':id/messages')
  @ID
  @ApiOperation({
    summary: 'Ajouter une note interne ou écrire au demandeur',
    description: 'Par défaut (`internal: true`), le message est une **note interne** que le demandeur ne verra jamais (§5.2).',
  })
  @ApiCreatedResponse({ type: StaffDossierDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Message vide, ou message public sur un dossier clôturé.' })
  @NOT_VISIBLE
  message(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffMessageDto,
  ): Promise<StaffDossierDetailDto> {
    return this.dossiers.staffMessage(user, id, dto);
  }
}
