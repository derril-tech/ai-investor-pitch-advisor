import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704067200000 implements MigrationInterface {
  name = 'InitialSchema1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "public"."project_status_enum" AS ENUM('active', 'archived', 'deleted')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."deck_status_enum" AS ENUM('uploading', 'parsing', 'parsed', 'analyzing', 'analyzed', 'error')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."deck_file_type_enum" AS ENUM('pptx', 'pdf', 'google_slides')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."analysis_type_enum" AS ENUM('deck', 'slide')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."suggestion_category_enum" AS ENUM('headline', 'structure', 'design', 'content', 'storytelling')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."suggestion_priority_enum" AS ENUM('low', 'medium', 'high', 'critical')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."suggestion_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'applied')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."qa_session_status_enum" AS ENUM('generating', 'completed', 'error')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."qa_category_enum" AS ENUM('business_model', 'market', 'competition', 'team', 'financials', 'traction', 'risks', 'exit_strategy')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."qa_confidence_enum" AS ENUM('low', 'medium', 'high')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."export_type_enum" AS ENUM('report', 'annotated', 'qa_handbook', 'json_bundle')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."export_format_enum" AS ENUM('pdf', 'docx', 'json')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."export_status_enum" AS ENUM('pending', 'processing', 'completed', 'error')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'admin', 'super_admin')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."user_status_enum" AS ENUM('active', 'inactive', 'suspended')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."audit_action_enum" AS ENUM('create', 'read', 'update', 'delete', 'export', 'login', 'logout')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."audit_resource_enum" AS ENUM('project', 'deck', 'slide', 'analysis', 'suggestion', 'qa_session', 'export', 'user')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "email" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "passwordHash" character varying,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'user',
        "status" "public"."user_status_enum" NOT NULL DEFAULT 'active',
        "metadata" jsonb,
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" character varying NOT NULL,
        "description" text,
        "status" "public"."project_status_enum" NOT NULL DEFAULT 'active',
        "metadata" jsonb,
        "ownerId" uuid NOT NULL,
        CONSTRAINT "PK_6271df0a7aed1d6c0691ce6a50e" PRIMARY KEY ("id")
      )
    `);

    // Create decks table
    await queryRunner.query(`
      CREATE TABLE "decks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" character varying NOT NULL,
        "description" text,
        "fileType" "public"."deck_file_type_enum" NOT NULL,
        "fileName" character varying NOT NULL,
        "fileSize" integer NOT NULL,
        "s3Key" character varying NOT NULL,
        "status" "public"."deck_status_enum" NOT NULL DEFAULT 'uploading',
        "metadata" jsonb,
        "parseResult" jsonb,
        "projectId" uuid NOT NULL,
        CONSTRAINT "PK_8c0c5c8c8c8c8c8c8c8c8c8c8c8" PRIMARY KEY ("id")
      )
    `);

    // Create slides table
    await queryRunner.query(`
      CREATE TABLE "slides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "slideNumber" integer NOT NULL,
        "title" character varying NOT NULL,
        "content" text,
        "notes" text,
        "imageS3Key" character varying,
        "metadata" jsonb,
        "deckId" uuid NOT NULL,
        CONSTRAINT "PK_8c0c5c8c8c8c8c8c8c8c8c8c8c9" PRIMARY KEY ("id")
      )
    `);

    // Create analysis table
    await queryRunner.query(`
      CREATE TABLE "analysis" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "type" "public"."analysis_type_enum" NOT NULL,
        "scores" jsonb NOT NULL,
        "features" jsonb,
        "explanations" jsonb,
        "metadata" jsonb,
        "deckId" uuid NOT NULL,
        "slideId" uuid,
        CONSTRAINT "PK_8c0c5c8c8c8c8c8c8c8c8c8c8ca" PRIMARY KEY ("id")
      )
    `);

    // Create suggestions table
    await queryRunner.query(`
      CREATE TABLE "suggestions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "text" text NOT NULL,
        "category" "public"."suggestion_category_enum" NOT NULL,
        "priority" "public"."suggestion_priority_enum" NOT NULL DEFAULT 'medium',
        "status" "public"."suggestion_status_enum" NOT NULL DEFAULT 'pending',
        "rationale" text,
        "metadata" jsonb,
        "deckId" uuid NOT NULL,
        "slideId" uuid,
        CONSTRAINT "PK_8c0c5c8c8c8c8c8c8c8c8c8c8cb" PRIMARY KEY ("id")
      )
    `);

    // Create qa_sessions table
    await queryRunner.query(`
      CREATE TABLE "qa_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" character varying NOT NULL,
        "status" "public"."qa_session_status_enum" NOT NULL DEFAULT 'generating',
        "stage" character varying,
        "sector" character varying,
        "metadata" jsonb,
        "deckId" uuid NOT NULL,
        CONSTRAINT "PK_8c0c5c8c8c8c8c8c8c8c8c8c8cc" PRIMARY KEY ("id")
      )
    `);

    // Create qa_pairs table
    await queryRunner.query(`
      CREATE TABLE "qa_pairs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "category" "public"."qa_category_enum" NOT NULL,
        "confidence" "public"."qa_confidence_enum" NOT NULL DEFAULT 'medium',
        "slideRefs" jsonb,
        "needsExtraInfo" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "sessionId" uuid NOT NULL,
        CONSTRAINT "PK_8c0c5c8c8c8c8c8c8c8c8c8c8cd" PRIMARY KEY ("id")
      )
    `);

    // Create exports table
    await queryRunner.query(`
      CREATE TABLE "exports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "type" "public"."export_type_enum" NOT NULL,
        "format" "public"."export_format_enum" NOT NULL,
        "status" "public"."export_status_enum" NOT NULL DEFAULT 'pending',
        "s3Key" character varying,
        "signedUrl" character varying,
        "signedUrlExpiresAt" TIMESTAMP,
        "metadata" jsonb,
        "deckId" uuid NOT NULL,
        CONSTRAINT "PK_8c0c5c8c8c8c8c8c8c8c8c8c8ce" PRIMARY KEY ("id")
      )
    `);

    // Create audit_log table
    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "action" "public"."audit_action_enum" NOT NULL,
        "resourceType" "public"."audit_resource_enum" NOT NULL,
        "resourceId" character varying,
        "userId" character varying,
        "userEmail" character varying,
        "ipAddress" character varying,
        "userAgent" character varying,
        "details" jsonb,
        "metadata" jsonb,
        CONSTRAINT "PK_8c0c5c8c8c8c8c8c8c8c8c8c8cf" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_owner" 
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "decks" ADD CONSTRAINT "FK_decks_project" 
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "slides" ADD CONSTRAINT "FK_slides_deck" 
      FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "analysis" ADD CONSTRAINT "FK_analysis_deck" 
      FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "analysis" ADD CONSTRAINT "FK_analysis_slide" 
      FOREIGN KEY ("slideId") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "suggestions" ADD CONSTRAINT "FK_suggestions_deck" 
      FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "suggestions" ADD CONSTRAINT "FK_suggestions_slide" 
      FOREIGN KEY ("slideId") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "qa_sessions" ADD CONSTRAINT "FK_qa_sessions_deck" 
      FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "qa_pairs" ADD CONSTRAINT "FK_qa_pairs_session" 
      FOREIGN KEY ("sessionId") REFERENCES "qa_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exports" ADD CONSTRAINT "FK_exports_deck" 
      FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_user_created" ON "audit_log" ("userId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_resource" ON "audit_log" ("resourceType", "resourceId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_action_created" ON "audit_log" ("action", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_audit_log_action_created"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_log_resource"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_log_user_created"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "exports" DROP CONSTRAINT "FK_exports_deck"`);
    await queryRunner.query(`ALTER TABLE "qa_pairs" DROP CONSTRAINT "FK_qa_pairs_session"`);
    await queryRunner.query(`ALTER TABLE "qa_sessions" DROP CONSTRAINT "FK_qa_sessions_deck"`);
    await queryRunner.query(`ALTER TABLE "suggestions" DROP CONSTRAINT "FK_suggestions_slide"`);
    await queryRunner.query(`ALTER TABLE "suggestions" DROP CONSTRAINT "FK_suggestions_deck"`);
    await queryRunner.query(`ALTER TABLE "analysis" DROP CONSTRAINT "FK_analysis_slide"`);
    await queryRunner.query(`ALTER TABLE "analysis" DROP CONSTRAINT "FK_analysis_deck"`);
    await queryRunner.query(`ALTER TABLE "slides" DROP CONSTRAINT "FK_slides_deck"`);
    await queryRunner.query(`ALTER TABLE "decks" DROP CONSTRAINT "FK_decks_project"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_owner"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(`DROP TABLE "exports"`);
    await queryRunner.query(`DROP TABLE "qa_pairs"`);
    await queryRunner.query(`DROP TABLE "qa_sessions"`);
    await queryRunner.query(`DROP TABLE "suggestions"`);
    await queryRunner.query(`DROP TABLE "analysis"`);
    await queryRunner.query(`DROP TABLE "slides"`);
    await queryRunner.query(`DROP TABLE "decks"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "public"."audit_resource_enum"`);
    await queryRunner.query(`DROP TYPE "public"."audit_action_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."export_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."export_format_enum"`);
    await queryRunner.query(`DROP TYPE "public"."export_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."qa_confidence_enum"`);
    await queryRunner.query(`DROP TYPE "public"."qa_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."qa_session_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."suggestion_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."suggestion_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."suggestion_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."analysis_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."deck_file_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."deck_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."project_status_enum"`);
  }
}
