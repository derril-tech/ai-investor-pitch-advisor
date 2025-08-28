import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Project } from '@/modules/projects/entities/project.entity';
import { Slide } from './slide.entity';
import { Analysis } from '@/modules/analysis/entities/analysis.entity';
import { QaSession } from '@/modules/qa/entities/qa-session.entity';
import { Export } from '@/modules/exports/entities/export.entity';

export enum DeckStatus {
  UPLOADING = 'uploading',
  PARSING = 'parsing',
  PARSED = 'parsed',
  ANALYZING = 'analyzing',
  ANALYZED = 'analyzed',
  ERROR = 'error',
}

export enum DeckFileType {
  PPTX = 'pptx',
  PDF = 'pdf',
  GOOGLE_SLIDES = 'google_slides',
}

@Entity('decks')
export class Deck extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: DeckFileType,
  })
  fileType: DeckFileType;

  @Column()
  fileName: string;

  @Column()
  fileSize: number;

  @Column()
  s3Key: string;

  @Column({
    type: 'enum',
    enum: DeckStatus,
    default: DeckStatus.UPLOADING,
  })
  status: DeckStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  parseResult?: Record<string, any>;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  projectId: string;

  @OneToMany(() => Slide, (slide) => slide.deck)
  slides: Slide[];

  @OneToMany(() => Analysis, (analysis) => analysis.deck)
  analyses: Analysis[];

  @OneToMany(() => QaSession, (qaSession) => qaSession.deck)
  qaSessions: QaSession[];

  @OneToMany(() => Export, (export_) => export_.deck)
  exports: Export[];
}
