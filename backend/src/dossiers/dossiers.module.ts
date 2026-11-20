import { Module } from '@nestjs/common';
import { ApplicantDossiersController } from './applicant-dossiers.controller';
import { BackofficeDossiersController } from './backoffice-dossiers.controller';
import { DossiersService } from './dossiers.service';

@Module({
  controllers: [ApplicantDossiersController, BackofficeDossiersController],
  providers: [DossiersService],
})
export class DossiersModule {}
