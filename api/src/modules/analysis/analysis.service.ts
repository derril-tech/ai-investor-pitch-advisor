import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';

import { Analysis } from './entities/analysis.entity';
import { Deck } from '../decks/entities/deck.entity';
import { Slide } from '../decks/entities/slide.entity';
import { RunAnalysisDto } from './dto/run-analysis.dto';
import { AnalysisResponseDto } from './dto/analysis-response.dto';

@Injectable()
export class AnalysisService {
  private analysisStreams = new Map<string, Subject<any>>();

  constructor(
    @InjectRepository(Analysis)
    private analysisRepository: Repository<Analysis>,
    @InjectRepository(Deck)
    private deckRepository: Repository<Deck>,
    @InjectRepository(Slide)
    private slideRepository: Repository<Slide>,
  ) {}

  async runAnalysis(deckId: string): Promise<AnalysisResponseDto> {
    // Check if deck exists
    const deck = await this.deckRepository.findOne({
      where: { id: deckId },
      relations: ['slides'],
    });

    if (!deck) {
      throw new NotFoundException(`Deck with ID ${deckId} not found`);
    }

    // Create analysis record
    const analysis = this.analysisRepository.create({
      deckId,
      type: 'deck',
      scores: {
        clarity: 0,
        design: 0,
        storytelling: 0,
        investorFit: 0,
      },
      status: 'processing',
    });

    await this.analysisRepository.save(analysis);

    // Start async analysis
    this.performAnalysis(deckId, deck, analysis.id);

    return {
      id: analysis.id,
      deckId,
      status: 'processing',
      scores: analysis.scores,
      explanations: {},
      createdAt: analysis.createdAt,
    };
  }

  async getAnalysis(deckId: string): Promise<AnalysisResponseDto> {
    const analysis = await this.analysisRepository.findOne({
      where: { deckId },
      order: { createdAt: 'DESC' },
    });

    if (!analysis) {
      throw new NotFoundException(`Analysis for deck ${deckId} not found`);
    }

    return {
      id: analysis.id,
      deckId,
      status: analysis.status,
      scores: analysis.scores,
      explanations: analysis.explanations || {},
      createdAt: analysis.createdAt,
    };
  }

  streamAnalysis(deckId: string): Observable<any> {
    let stream = this.analysisStreams.get(deckId);
    if (!stream) {
      stream = new Subject();
      this.analysisStreams.set(deckId, stream);
    }
    return stream.asObservable();
  }

  private async performAnalysis(deckId: string, deck: Deck, analysisId: string) {
    try {
      // Simulate analysis steps
      const stream = this.analysisStreams.get(deckId);
      
      if (stream) {
        stream.next({ step: 'parsing', progress: 20 });
        await this.delay(1000);
        
        stream.next({ step: 'structure_detection', progress: 40 });
        await this.delay(1000);
        
        stream.next({ step: 'scoring', progress: 60 });
        await this.delay(1000);
        
        stream.next({ step: 'generating_explanations', progress: 80 });
        await this.delay(1000);
        
        stream.next({ step: 'completed', progress: 100 });
      }

      // Update analysis with results
      const mockScores = {
        clarity: 7.5,
        design: 6.8,
        storytelling: 8.2,
        investorFit: 7.0,
      };

      const mockExplanations = {
        clarity: 'Good readability with concise sentences',
        design: 'Consistent visual hierarchy',
        storytelling: 'Strong narrative flow',
        investorFit: 'Good market understanding and competitive positioning',
      };

      await this.analysisRepository.update(analysisId, {
        scores: mockScores,
        explanations: mockExplanations,
        status: 'completed',
      });

    } catch (error) {
      await this.analysisRepository.update(analysisId, {
        status: 'error',
      });
      
      const stream = this.analysisStreams.get(deckId);
      if (stream) {
        stream.next({ step: 'error', error: error.message });
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
