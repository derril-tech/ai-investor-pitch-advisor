import { Entity, Column, OneToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Deck } from '@/modules/decks/entities/deck.entity';
import { User } from '@/modules/users/entities/user.entity';

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Entity('projects')
export class Project extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  status: ProjectStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany(() => Deck, (deck) => deck.project)
  decks: Deck[];
}
