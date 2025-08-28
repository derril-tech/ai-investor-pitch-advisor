import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import axios from 'axios';
import { Suggestion } from './entities/suggestion.entity';
import { SuggestionRun } from './entities/suggestion-run.entity';
import { CreateSuggestionRunDto } from './dto/create-suggestion-run.dto';
import { SuggestionResponseDto } from './dto/suggestion-response.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';

@Injectable()
export class SuggestionService {
  private readonly suggestionWorkerUrl: string;
  private suggestionProgressStreams = new Map<string, Subject<MessageEvent>>();

  constructor(
    @InjectRepository(Suggestion)
    private readonly suggestionRepository: Repository<Suggestion>,
    @InjectRepository(SuggestionRun)
    private readonly suggestionRunRepository: Repository<SuggestionRun>,
    private readonly configService: ConfigService,
  ) {
    this.suggestionWorkerUrl = this.configService.get<string>('SUGGESTION_WORKER_URL', 'http://localhost:8005');
  }

  async createSuggestionRun(createSuggestionRunDto: CreateSuggestionRunDto): Promise<{ runId: string }> {
    try {
      // Create suggestion run record
      const suggestionRun = this.suggestionRunRepository.create({
        deckId: createSuggestionRunDto.deckId,
        slideIds: createSuggestionRunDto.slideIds,
        suggestionTypes: createSuggestionRunDto.suggestionTypes,
        status: 'pending',
      });

      const savedRun = await this.suggestionRunRepository.save(suggestionRun);

      // Start background suggestion generation
      this.generateSuggestionsBackground(savedRun.id, createSuggestionRunDto);

      return { runId: savedRun.id };
    } catch (error) {
      throw new Error(`Failed to create suggestion run: ${error.message}`);
    }
  }

  async getSuggestionRun(runId: string): Promise<any> {
    const run = await this.suggestionRunRepository.findOne({ where: { id: runId } });

    if (!run) {
      throw new NotFoundException(`Suggestion run with ID ${runId} not found`);
    }

    // Get suggestions for this run
    const suggestions = await this.suggestionRepository.find({
      where: { runId },
      order: { createdAt: 'DESC' },
    });

    return {
      id: run.id,
      deckId: run.deckId,
      status: run.status,
      slideIds: run.slideIds,
      suggestionTypes: run.suggestionTypes,
      suggestionsGenerated: run.suggestionsGenerated,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      completedAt: run.completedAt,
      suggestions: suggestions.map(s => this.mapToResponseDto(s))
    };
  }

  async getSuggestionsByDeck(deckId: string): Promise<SuggestionResponseDto[]> {
    const suggestions = await this.suggestionRepository.find({
      where: { deckId },
      order: { createdAt: 'DESC' },
    });

    return suggestions.map(suggestion => this.mapToResponseDto(suggestion));
  }

  async getSuggestionsBySlide(slideId: string): Promise<SuggestionResponseDto[]> {
    const suggestions = await this.suggestionRepository.find({
      where: { slideId },
      order: { confidence: 'DESC', createdAt: 'DESC' },
    });

    return suggestions.map(suggestion => this.mapToResponseDto(suggestion));
  }

  async getSuggestion(suggestionId: string): Promise<SuggestionResponseDto> {
    const suggestion = await this.suggestionRepository.findOne({ where: { id: suggestionId } });

    if (!suggestion) {
      throw new NotFoundException(`Suggestion with ID ${suggestionId} not found`);
    }

    return this.mapToResponseDto(suggestion);
  }

  async updateSuggestion(suggestionId: string, updateSuggestionDto: UpdateSuggestionDto): Promise<SuggestionResponseDto> {
    const suggestion = await this.suggestionRepository.findOne({ where: { id: suggestionId } });

    if (!suggestion) {
      throw new NotFoundException(`Suggestion with ID ${suggestionId} not found`);
    }

    // Update suggestion
    await this.suggestionRepository.update(suggestionId, {
      status: updateSuggestionDto.status,
      appliedAt: updateSuggestionDto.status === 'applied' ? new Date() : undefined,
      updatedAt: new Date(),
    });

    // Get updated suggestion
    const updatedSuggestion = await this.suggestionRepository.findOne({ where: { id: suggestionId } });
    return this.mapToResponseDto(updatedSuggestion);
  }

  async deleteSuggestion(suggestionId: string): Promise<{ message: string }> {
    const suggestion = await this.suggestionRepository.findOne({ where: { id: suggestionId } });

    if (!suggestion) {
      throw new NotFoundException(`Suggestion with ID ${suggestionId} not found`);
    }

    // Soft delete
    await this.suggestionRepository.update(suggestionId, { deletedAt: new Date() });

    return { message: 'Suggestion deleted successfully' };
  }

  streamSuggestionProgress(runId: string): Observable<MessageEvent> {
    let stream = this.suggestionProgressStreams.get(runId);

    if (!stream) {
      stream = new Subject<MessageEvent>();
      this.suggestionProgressStreams.set(runId, stream);
    }

    return stream.asObservable();
  }

  private async generateSuggestionsBackground(runId: string, createSuggestionRunDto: CreateSuggestionRunDto): Promise<void> {
    try {
      // Update status to processing
      await this.suggestionRunRepository.update(runId, { status: 'processing' });

      // Send progress update
      const stream = this.suggestionProgressStreams.get(runId);
      if (stream) {
        stream.next(new MessageEvent('message', { data: { status: 'processing', progress: 0 } }));
      }

      // Call suggestion worker
      const response = await axios.post(`${this.suggestionWorkerUrl}/suggestions/generate`, {
        deck_id: createSuggestionRunDto.deckId,
        slide_ids: createSuggestionRunDto.slideIds,
        suggestion_types: createSuggestionRunDto.suggestionTypes,
      });

      const suggestions = response.data;

      // Save suggestions to database
      for (const suggestionData of suggestions) {
        const suggestion = this.suggestionRepository.create({
          ...suggestionData,
          runId,
        });
        await this.suggestionRepository.save(suggestion);
      }

      // Update run status
      await this.suggestionRunRepository.update(runId, {
        status: 'completed',
        suggestionsGenerated: suggestions.length,
        completedAt: new Date(),
      });

      // Send completion event
      if (stream) {
        stream.next(new MessageEvent('message', {
          data: { status: 'completed', progress: 100, suggestionsCount: suggestions.length }
        }));
        stream.complete();
        this.suggestionProgressStreams.delete(runId);
      }

    } catch (error) {
      // Update run status to failed
      await this.suggestionRunRepository.update(runId, {
        status: 'failed',
        errorMessage: error.message,
      });

      // Send error event
      const stream = this.suggestionProgressStreams.get(runId);
      if (stream) {
        stream.next(new MessageEvent('message', {
          data: { status: 'failed', error: error.message }
        }));
        stream.complete();
        this.suggestionProgressStreams.delete(runId);
      }
    }
  }

  private mapToResponseDto(suggestion: Suggestion): SuggestionResponseDto {
    return {
      id: suggestion.id,
      deckId: suggestion.deckId,
      slideId: suggestion.slideId,
      runId: suggestion.runId,
      suggestionType: suggestion.suggestionType,
      title: suggestion.title,
      description: suggestion.description,
      rationale: suggestion.rationale,
      beforeText: suggestion.beforeText,
      afterText: suggestion.afterText,
      confidence: suggestion.confidence,
      category: suggestion.category,
      status: suggestion.status,
      appliedAt: suggestion.appliedAt,
      createdAt: suggestion.createdAt,
      updatedAt: suggestion.updatedAt,
    };
  }
}
