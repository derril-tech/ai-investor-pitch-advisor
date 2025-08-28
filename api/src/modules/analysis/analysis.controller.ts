import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AnalysisService } from './analysis.service';
import { RunAnalysisDto } from './dto/run-analysis.dto';
import { AnalysisResponseDto } from './dto/analysis-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Analysis')
@Controller('analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run analysis on a deck' })
  @ApiResponse({ status: 201, description: 'Analysis started', type: AnalysisResponseDto })
  async runAnalysis(@Body() runAnalysisDto: RunAnalysisDto): Promise<AnalysisResponseDto> {
    return this.analysisService.runAnalysis(runAnalysisDto.deckId);
  }

  @Get(':deckId')
  @ApiOperation({ summary: 'Get analysis results for a deck' })
  @ApiResponse({ status: 200, description: 'Analysis results', type: AnalysisResponseDto })
  async getAnalysis(@Param('deckId') deckId: string): Promise<AnalysisResponseDto> {
    return this.analysisService.getAnalysis(deckId);
  }

  @Sse(':deckId/stream')
  @ApiOperation({ summary: 'Stream analysis progress' })
  streamAnalysis(@Param('deckId') deckId: string): Observable<MessageEvent> {
    return this.analysisService.streamAnalysis(deckId).pipe(
      map(data => ({
        data: JSON.stringify(data),
        type: 'message',
        id: Date.now().toString(),
      }))
    );
  }
}
