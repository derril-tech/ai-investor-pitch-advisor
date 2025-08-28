import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export enum AuditResource {
  PROJECT = 'project',
  DECK = 'deck',
  SLIDE = 'slide',
  ANALYSIS = 'analysis',
  SUGGESTION = 'suggestion',
  QA_SESSION = 'qa_session',
  EXPORT = 'export',
  USER = 'user',
}

@Entity('audit_log')
@Index(['userId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['action', 'createdAt'])
export class AuditLog extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResource,
  })
  resourceType: AuditResource;

  @Column({ nullable: true })
  resourceId?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  userEmail?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
