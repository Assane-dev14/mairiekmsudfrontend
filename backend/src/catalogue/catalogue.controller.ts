import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ProcedureDetailDto, ProcedureQueryDto, ProcedureSummaryDto, ServiceDto } from './catalogue.dto';
import { CatalogueService } from './catalogue.service';

@ApiTags('Catalogue public')
@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Public()
  @Get('services')
  @ApiOperation({
    summary: 'Annuaire des services municipaux',
    description: 'Liste publique des services actifs avec leurs coordonnées (§4.9). Aucune authentification requise.',
  })
  @ApiOkResponse({ type: [ServiceDto] })
  listServices(): Promise<ServiceDto[]> {
    return this.catalogue.listServices();
  }

  @Public()
  @Get('procedures')
  @ApiOperation({
    summary: 'Catalogue des démarches',
    description:
      'Liste publique des démarches **actives** (§4.4), filtrable par catégorie et mot-clé. ' +
      'Les démarches désactivées (en attente de validation par la mairie) n’apparaissent pas.',
  })
  @ApiOkResponse({ type: [ProcedureSummaryDto] })
  listProcedures(@Query() q: ProcedureQueryDto): Promise<ProcedureSummaryDto[]> {
    return this.catalogue.listProcedures(q);
  }

  @Public()
  @Get('procedures/:code')
  @ApiOperation({
    summary: 'Fiche d’une démarche',
    description:
      'Conditions, pièces requises, délai indicatif et **champs du formulaire**. ' +
      'Le front-end s’en sert pour construire le formulaire de dépôt (`POST /dossiers`).',
  })
  @ApiParam({ name: 'code', example: 'CERTIFICAT_RESIDENCE' })
  @ApiOkResponse({ type: ProcedureDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Démarche inexistante ou désactivée.' })
  getProcedure(@Param('code') code: string): Promise<ProcedureDetailDto> {
    return this.catalogue.getProcedure(code);
  }
}
