import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { QAService } from './qa.service';
import { CreateQASessionDto } from './dto/create-qa-session.dto';
import { QASessionResponseDto } from './dto/qa-session-response.dto';
import { AddAnswerDto } from './dto/add-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Q&A')
@Controller('qa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QAController {
  constructor(private readonly qaService: QAService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new Q&A session' })
  @ApiResponse({ status: 201, description: 'Q&A session created', type: QASessionResponseDto })
  async createQASession(@Body() createQASessionDto: CreateQASessionDto): Promise<QASessionResponseDto> {
    return this.qaService.createQASession(createQASessionDto);
  }

  @Post('sessions/async')
  @ApiOperation({ summary: 'Create a Q&A session asynchronously' })
  @ApiResponse({ status: 201, description: 'Q&A session creation started' })
  async createQASessionAsync(@Body() createQASessionDto: CreateQASessionDto) {
    return this.qaService.createQASessionAsync(createQASessionDto);
  }

  @Post('sessions/enhanced')
  @ApiOperation({ summary: 'Create an enhanced Q&A session with draft answers' })
  @ApiResponse({ status: 201, description: 'Enhanced Q&A session created', type: QASessionResponseDto })
  async createEnhancedQASession(@Body() createQASessionDto: CreateQASessionDto): Promise<QASessionResponseDto> {
    return this.qaService.createEnhancedQASession(createQASessionDto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all Q&A sessions for a deck' })
  @ApiResponse({ status: 200, description: 'Q&A sessions retrieved' })
  async getQASessions(@Query('deckId') deckId: string) {
    return this.qaService.getQASessionsByDeck(deckId);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get Q&A session details' })
  @ApiResponse({ status: 200, description: 'Q&A session details', type: QASessionResponseDto })
  async getQASession(@Param('sessionId') sessionId: string): Promise<QASessionResponseDto> {
    return this.qaService.getQASession(sessionId);
  }

  @Get('sessions/:sessionId/questions')
  @ApiOperation({ summary: 'Get questions for a Q&A session' })
  @ApiResponse({ status: 200, description: 'Questions retrieved' })
  async getQuestions(@Param('sessionId') sessionId: string) {
    return this.qaService.getSessionQuestions(sessionId);
  }

  @Put('questions/:questionId/answer')
  @ApiOperation({ summary: 'Add an answer to a question' })
  @ApiResponse({ status: 200, description: 'Answer added successfully' })
  async addAnswer(
    @Param('questionId') questionId: string,
    @Body() addAnswerDto: AddAnswerDto
  ) {
    return this.qaService.addAnswer(questionId, addAnswerDto.answer);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Delete a Q&A session' })
  @ApiResponse({ status: 200, description: 'Q&A session deleted' })
  async deleteQASession(@Param('sessionId') sessionId: string) {
    return this.qaService.deleteQASession(sessionId);
  }

  @Sse('sessions/:sessionId/stream')
  @ApiOperation({ summary: 'Stream Q&A session progress' })
  streamQASession(@Param('sessionId') sessionId: string): Observable<MessageEvent> {
    return this.qaService.streamQASession(sessionId).pipe(
      map(data => ({
        data: JSON.stringify(data),
        type: 'message',
        id: Date.now().toString(),
      }))
    );
  }
}
