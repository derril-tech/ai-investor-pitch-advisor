import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('suggestion_runs')
@Index(['deckId', 'deletedAt'])
@Index(['status'])
@Index(['createdAt'])
export class SuggestionRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deckId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';

  @Column({ type: 'jsonb', nullable: true })
  slideIds: string[];

  @Column({ type: 'jsonb', nullable: true })
  suggestionTypes: string[];

  @Column({ type: 'int', default: 0 })
  suggestionsGenerated: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
