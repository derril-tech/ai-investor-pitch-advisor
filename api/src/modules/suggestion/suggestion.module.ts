import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuggestionController } from './suggestion.controller';
import { SuggestionService } from './suggestion.service';
import { Suggestion } from './entities/suggestion.entity';
import { SuggestionRun } from './entities/suggestion-run.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Suggestion, SuggestionRun])],
  controllers: [SuggestionController],
  providers: [SuggestionService],
  exports: [SuggestionService],
})
export class SuggestionModule {}
