import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Deck } from '@/modules/decks/entities/deck.entity';
import { QaPair } from './qa-pair.entity';

export enum QaSessionStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  ERROR = 'error',
}

@Entity('qa_sessions')
export class QaSession extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: QaSessionStatus,
    default: QaSessionStatus.GENERATING,
  })
  status: QaSessionStatus;

  @Column({ nullable: true })
  stage?: string;

  @Column({ nullable: true })
  sector?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Deck, { onDelete: 'CASCADE' })
  deck: Deck;

  @Column()
  deckId: string;

  @OneToMany(() => QaPair, (qaPair) => qaPair.session)
  qaPairs: QaPair[];
}
