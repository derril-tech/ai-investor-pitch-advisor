import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('exports')
@Index(['deckId', 'deletedAt'])
@Index(['createdAt'])
export class Export {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deckId: string;

  @Column({ type: 'varchar', length: 50 })
  exportType: string;

  @Column({ type: 'varchar', length: 10 })
  format: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  downloadUrl: string;

  @Column({ type: 'boolean', default: true })
  includeAnalysis: boolean;

  @Column({ type: 'boolean', default: false })
  includeQA: boolean;

  @Column({ type: 'uuid', nullable: true })
  qaSessionId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
