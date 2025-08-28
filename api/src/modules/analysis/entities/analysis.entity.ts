import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('analyses')
@Index(['deckId', 'deletedAt'])
@Index(['createdAt'])
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deckId: string;

  @Column({ type: 'jsonb' })
  scores: {
    clarity: number;
    design: number;
    storytelling: number;
    investorFit: number;
  };

  @Column({ type: 'jsonb' })
  explanations: {
    clarity: string;
    design: string;
    storytelling: string;
    investorFit: string;
  };

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
