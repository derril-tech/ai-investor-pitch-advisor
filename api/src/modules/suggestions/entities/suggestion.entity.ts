import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Deck } from '@/modules/decks/entities/deck.entity';
import { Slide } from '@/modules/decks/entities/slide.entity';

export enum SuggestionCategory {
  HEADLINE = 'headline',
  STRUCTURE = 'structure',
  DESIGN = 'design',
  CONTENT = 'content',
  STORYTELLING = 'storytelling',
}

export enum SuggestionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  APPLIED = 'applied',
}

@Entity('suggestions')
export class Suggestion extends BaseEntity {
  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: SuggestionCategory,
  })
  category: SuggestionCategory;

  @Column({
    type: 'enum',
    enum: SuggestionPriority,
    default: SuggestionPriority.MEDIUM,
  })
  priority: SuggestionPriority;

  @Column({
    type: 'enum',
    enum: SuggestionStatus,
    default: SuggestionStatus.PENDING,
  })
  status: SuggestionStatus;

  @Column({ type: 'text', nullable: true })
  rationale?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Deck, { onDelete: 'CASCADE' })
  deck: Deck;

  @Column()
  deckId: string;

  @ManyToOne(() => Slide, { onDelete: 'CASCADE', nullable: true })
  slide?: Slide;

  @Column({ nullable: true })
  slideId?: string;
}
