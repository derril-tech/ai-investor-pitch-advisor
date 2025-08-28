import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Sse } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuggestionService } from './suggestion.service';
import { CreateSuggestionRunDto } from './dto/create-suggestion-run.dto';
import { SuggestionResponseDto } from './dto/suggestion-response.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { Observable } from 'rxjs';

@ApiTags('Suggestion')
@Controller('suggestion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  @Post('run')
  @ApiOperation({ summary: 'Create and start a suggestion run' })
  @ApiResponse({ status: 201, description: 'Suggestion run created successfully' })
  async createSuggestionRun(@Body() createSuggestionRunDto: CreateSuggestionRunDto): Promise<{ runId: string }> {
    return this.suggestionService.createSuggestionRun(createSuggestionRunDto);
  }

  @Get('run/:runId')
  @ApiOperation({ summary: 'Get suggestion run details and results' })
  @ApiResponse({ status: 200, description: 'Suggestion run details retrieved' })
  async getSuggestionRun(@Param('runId') runId: string) {
    return this.suggestionService.getSuggestionRun(runId);
  }

  @Get('deck/:deckId')
  @ApiOperation({ summary: 'Get all suggestions for a deck' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved', type: [SuggestionResponseDto] })
  async getSuggestionsByDeck(@Param('deckId') deckId: string): Promise<SuggestionResponseDto[]> {
    return this.suggestionService.getSuggestionsByDeck(deckId);
  }

  @Get('slide/:slideId')
  @ApiOperation({ summary: 'Get all suggestions for a slide' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved', type: [SuggestionResponseDto] })
  async getSuggestionsBySlide(@Param('slideId') slideId: string): Promise<SuggestionResponseDto[]> {
    return this.suggestionService.getSuggestionsBySlide(slideId);
  }

  @Get(':suggestionId')
  @ApiOperation({ summary: 'Get suggestion details' })
  @ApiResponse({ status: 200, description: 'Suggestion details retrieved', type: SuggestionResponseDto })
  async getSuggestion(@Param('suggestionId') suggestionId: string): Promise<SuggestionResponseDto> {
    return this.suggestionService.getSuggestion(suggestionId);
  }

  @Put(':suggestionId')
  @ApiOperation({ summary: 'Update suggestion status' })
  @ApiResponse({ status: 200, description: 'Suggestion updated successfully', type: SuggestionResponseDto })
  async updateSuggestion(
    @Param('suggestionId') suggestionId: string,
    @Body() updateSuggestionDto: UpdateSuggestionDto
  ): Promise<SuggestionResponseDto> {
    return this.suggestionService.updateSuggestion(suggestionId, updateSuggestionDto);
  }

  @Delete(':suggestionId')
  @ApiOperation({ summary: 'Delete suggestion' })
  @ApiResponse({ status: 200, description: 'Suggestion deleted successfully' })
  async deleteSuggestion(@Param('suggestionId') suggestionId: string): Promise<{ message: string }> {
    return this.suggestionService.deleteSuggestion(suggestionId);
  }

  @Sse('run/:runId/stream')
  @ApiOperation({ summary: 'Stream suggestion generation progress' })
  streamSuggestionProgress(@Param('runId') runId: string): Observable<MessageEvent> {
    return this.suggestionService.streamSuggestionProgress(runId);
  }
}
