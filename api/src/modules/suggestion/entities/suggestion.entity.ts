import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('suggestions')
@Index(['deckId', 'deletedAt'])
@Index(['slideId', 'deletedAt'])
@Index(['status'])
@Index(['createdAt'])
export class Suggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deckId: string;

  @Column({ type: 'uuid', nullable: true })
  slideId: string;

  @Column({ type: 'uuid', nullable: true })
  runId: string;

  @Column({ type: 'varchar', length: 50 })
  suggestionType: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  rationale: string;

  @Column({ type: 'text', nullable: true })
  beforeText: string;

  @Column({ type: 'text', nullable: true })
  afterText: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  confidence: number;

  @Column({ type: 'varchar', length: 50, default: 'content' })
  category: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'applied' | 'accepted' | 'rejected' | 'dismissed';

  @Column({ type: 'timestamp', nullable: true })
  appliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
