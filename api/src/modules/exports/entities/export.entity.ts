import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Deck } from '@/modules/decks/entities/deck.entity';

export enum ExportType {
  REPORT = 'report',
  ANNOTATED = 'annotated',
  QA_HANDBOOK = 'qa_handbook',
  JSON_BUNDLE = 'json_bundle',
}

export enum ExportFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  JSON = 'json',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

@Entity('exports')
export class Export extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ExportType,
  })
  type: ExportType;

  @Column({
    type: 'enum',
    enum: ExportFormat,
  })
  format: ExportFormat;

  @Column({
    type: 'enum',
    enum: ExportStatus,
    default: ExportStatus.PENDING,
  })
  status: ExportStatus;

  @Column({ nullable: true })
  s3Key?: string;

  @Column({ nullable: true })
  signedUrl?: string;

  @Column({ type: 'timestamp', nullable: true })
  signedUrlExpiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Deck, { onDelete: 'CASCADE' })
  deck: Deck;

  @Column()
  deckId: string;
}
