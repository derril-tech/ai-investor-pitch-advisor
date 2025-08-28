import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { QASession } from './entities/qa-session.entity';
import { QAPair } from './entities/qa-pair.entity';
import { CreateQASessionDto } from './dto/create-qa-session.dto';
import { QASessionResponseDto } from './dto/qa-session-response.dto';
import { AddAnswerDto } from './dto/add-answer.dto';

@Injectable()
export class QAService {
  private qaStreams = new Map<string, Subject<any>>();
  private readonly qaWorkerUrl: string;

  constructor(
    @InjectRepository(QASession)
    private qaSessionRepository: Repository<QASession>,
    @InjectRepository(QAPair)
    private qaPairRepository: Repository<QAPair>,
    private configService: ConfigService,
  ) {
    this.qaWorkerUrl = this.configService.get<string>('QA_WORKER_URL', 'http://localhost:8003');
  }

  async createQASession(createQASessionDto: CreateQASessionDto): Promise<QASessionResponseDto> {
    try {
      // Call QA worker to generate session
      const response = await axios.post(`${this.qaWorkerUrl}/qa/generate`, {
        deck_id: createQASessionDto.deckId,
        session_name: createQASessionDto.name,
        sector: createQASessionDto.sector,
        stage: createQASessionDto.stage,
        num_questions: createQASessionDto.numQuestions,
      });

      return this.mapWorkerResponseToDto(response.data);
    } catch (error) {
      throw new Error(`Failed to create Q&A session: ${error.message}`);
    }
  }

  async createQASessionAsync(createQASessionDto: CreateQASessionDto) {
    try {
      // Call QA worker to start async generation
      const response = await axios.post(`${this.qaWorkerUrl}/qa/generate/async`, {
        deck_id: createQASessionDto.deckId,
        session_name: createQASessionDto.name,
        sector: createQASessionDto.sector,
        stage: createQASessionDto.stage,
        num_questions: createQASessionDto.numQuestions,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to start Q&A session generation: ${error.message}`);
    }
  }

  async getQASessionsByDeck(deckId: string) {
    try {
      const response = await axios.get(`${this.qaWorkerUrl}/qa/session`, {
        params: { deck_id: deckId }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Q&A sessions: ${error.message}`);
    }
  }

  async getQASession(sessionId: string): Promise<QASessionResponseDto> {
    try {
      const response = await axios.get(`${this.qaWorkerUrl}/qa/session/${sessionId}`);
      return this.mapWorkerResponseToDto(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundException('Q&A session not found');
      }
      throw new Error(`Failed to get Q&A session: ${error.message}`);
    }
  }

  async getSessionQuestions(sessionId: string) {
    try {
      const response = await axios.get(`${this.qaWorkerUrl}/qa/session/${sessionId}/questions`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get session questions: ${error.message}`);
    }
  }

  async addAnswer(questionId: string, answer: string) {
    try {
      const response = await axios.post(`${this.qaWorkerUrl}/qa/question/${questionId}/answer`, {
        answer: answer
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to add answer: ${error.message}`);
    }
  }

  async deleteQASession(sessionId: string) {
    try {
      const response = await axios.delete(`${this.qaWorkerUrl}/qa/session/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete Q&A session: ${error.message}`);
    }
  }

  async createEnhancedQASession(createQASessionDto: CreateQASessionDto): Promise<QASessionResponseDto> {
    try {
      // Call the enhanced QA worker endpoint
      const response = await axios.post(`${this.qaWorkerUrl}/qa/generate/enhanced-session`, {
        deck_id: createQASessionDto.deckId,
        session_name: createQASessionDto.name || 'Enhanced Investor Q&A Session',
        sector: createQASessionDto.sector || 'Technology',
        stage: createQASessionDto.stage || 'Series A',
        include_draft_answers: true,
        num_questions: createQASessionDto.numQuestions || 20,
      });

      // Save the session data to local database for tracking
      const session = this.qaSessionRepository.create({
        id: response.data.id,
        name: response.data.name,
        deckId: response.data.deck_id,
        sector: response.data.sector,
        stage: response.data.stage,
        status: response.data.status,
        questionCount: response.data.question_count,
        sessionType: 'enhanced',
      });

      await this.qaSessionRepository.save(session);

      // Save questions with enhanced data
      for (const question of response.data.questions) {
        const qaPair = this.qaPairRepository.create({
          id: question.id,
          sessionId: response.data.id,
          question: question.question,
          category: question.category,
          confidence: question.confidence,
          slideRefs: question.slide_refs,
          draftAnswer: question.draft_answer,
          answerConfidence: question.answer_confidence,
          followUpQuestions: question.follow_up_questions,
          needsExtraInfo: question.needs_extra_info,
        });
        await this.qaPairRepository.save(qaPair);
      }

      return this.mapEnhancedResponseToDto(response.data);

    } catch (error) {
      throw new Error(`Failed to create enhanced Q&A session: ${error.message}`);
    }
  }

  streamQASession(sessionId: string): Observable<any> {
    let stream = this.qaStreams.get(sessionId);
    if (!stream) {
      stream = new Subject();
      this.qaStreams.set(sessionId, stream);
    }
    return stream.asObservable();
  }

  private mapWorkerResponseToDto(workerData: any): QASessionResponseDto {
    return {
      id: workerData.id,
      name: workerData.name,
      deckId: workerData.deck_id,
      sector: workerData.sector,
      stage: workerData.stage,
      status: workerData.status,
      questionCount: workerData.question_count || 0,
      createdAt: new Date(workerData.created_at),
      updatedAt: new Date(workerData.updated_at),
      completedAt: workerData.completed_at ? new Date(workerData.completed_at) : undefined,
      questions: (workerData.questions || []).map((q: any) => ({
        id: q.id,
        question: q.question,
        category: q.category,
        confidence: q.confidence,
        slideRefs: q.slide_refs || [],
        needsExtraInfo: q.needs_extra_info,
        answer: q.answer,
        answeredAt: q.answered_at ? new Date(q.answered_at) : undefined,
        createdAt: new Date(q.created_at),
        updatedAt: new Date(q.updated_at),
      })),
    };
  }

  private mapEnhancedResponseToDto(workerData: any): QASessionResponseDto {
    return {
      id: workerData.id,
      name: workerData.name,
      deckId: workerData.deck_id,
      sector: workerData.sector,
      stage: workerData.stage,
      status: workerData.status,
      questionCount: workerData.question_count || 0,
      createdAt: new Date(workerData.created_at),
      updatedAt: new Date(workerData.updated_at),
      completedAt: workerData.completed_at ? new Date(workerData.completed_at) : undefined,
      questions: (workerData.questions || []).map((q: any) => ({
        id: q.id,
        question: q.question,
        category: q.category,
        confidence: q.confidence,
        slideRefs: q.slide_refs || [],
        needsExtraInfo: q.needs_extra_info,
        draftAnswer: q.draft_answer,
        answerConfidence: q.answer_confidence,
        followUpQuestions: q.follow_up_questions,
        answer: q.answer,
        answeredAt: q.answered_at ? new Date(q.answered_at) : undefined,
        createdAt: new Date(q.created_at),
        updatedAt: new Date(q.updated_at),
      })),
    };
  }
}
