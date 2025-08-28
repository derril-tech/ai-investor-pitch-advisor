import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Deck } from './deck.entity';
import { Analysis } from '@/modules/analysis/entities/analysis.entity';
import { Suggestion } from '@/modules/suggestions/entities/suggestion.entity';

@Entity('slides')
export class Slide extends BaseEntity {
  @Column()
  slideNumber: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  imageS3Key?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Deck, { onDelete: 'CASCADE' })
  deck: Deck;

  @Column()
  deckId: string;

  @OneToMany(() => Analysis, (analysis) => analysis.slide)
  analyses: Analysis[];

  @OneToMany(() => Suggestion, (suggestion) => suggestion.slide)
  suggestions: Suggestion[];
}
