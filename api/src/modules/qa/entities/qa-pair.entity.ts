import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { QaSession } from './qa-session.entity';

export enum QaCategory {
  BUSINESS_MODEL = 'business_model',
  MARKET = 'market',
  COMPETITION = 'competition',
  TEAM = 'team',
  FINANCIALS = 'financials',
  TRACTION = 'traction',
  RISKS = 'risks',
  EXIT_STRATEGY = 'exit_strategy',
}

export enum QaConfidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('qa_pairs')
export class QaPair extends BaseEntity {
  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({
    type: 'enum',
    enum: QaCategory,
  })
  category: QaCategory;

  @Column({
    type: 'enum',
    enum: QaConfidence,
    default: QaConfidence.MEDIUM,
  })
  confidence: QaConfidence;

  @Column({ type: 'jsonb', nullable: true })
  slideRefs?: string[];

  @Column({ type: 'boolean', default: false })
  needsExtraInfo: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => QaSession, { onDelete: 'CASCADE' })
  session: QaSession;

  @Column()
  sessionId: string;
}
