import { Module } from '@nestjs/common';
import { ContentController, ContentReportsController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController, ContentReportsController],
  providers: [ContentService],
})
export class ContentModule {}
