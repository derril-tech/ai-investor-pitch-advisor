import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

import { AppModule } from '../../src/app.module';
import { Deck } from '../../src/modules/decks/entities/deck.entity';
import { Slide } from '../../src/modules/slides/entities/slide.entity';
import { Analysis } from '../../src/modules/analysis/entities/analysis.entity';

describe('Upload → Parse → Analysis Pipeline (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'postgres'),
            database: configService.get('DB_DATABASE', 'pitch_advisor_test'),
            entities: [Deck, Slide, Analysis],
            synchronize: true,
            dropSchema: true,
          }),
          inject: [ConfigService],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = moduleFixture.get<ConfigService>(ConfigService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Pipeline', () => {
    it('should process a PPTX file through the entire pipeline', async () => {
      const testFilePath = join(__dirname, '../fixtures/sample-deck.pptx');
      
      // Skip if test file doesn't exist
      if (!existsSync(testFilePath)) {
        console.log('Test file not found, skipping integration test');
        return;
      }

      // Step 1: Upload deck
      const uploadResponse = await request(app.getHttpServer())
        .post('/v1/decks/upload')
        .attach('file', testFilePath)
        .field('name', 'Test Pitch Deck')
        .field('description', 'Integration test deck')
        .expect(201);

      const deckId = uploadResponse.body.id;
      expect(deckId).toBeDefined();

      // Step 2: Wait for parsing to complete
      let deckStatus = 'processing';
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (deckStatus === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const deckResponse = await request(app.getHttpServer())
          .get(`/v1/decks/${deckId}`)
          .expect(200);

        deckStatus = deckResponse.body.status;
        attempts++;
      }

      expect(deckStatus).toBe('completed');
      expect(attempts).toBeLessThan(maxAttempts);

      // Step 3: Verify slides were extracted
      const slidesResponse = await request(app.getHttpServer())
        .get(`/v1/decks/${deckId}/slides`)
        .expect(200);

      expect(slidesResponse.body.slides).toBeDefined();
      expect(slidesResponse.body.slides.length).toBeGreaterThan(0);

      // Step 4: Start analysis
      const analysisResponse = await request(app.getHttpServer())
        .post('/v1/analysis/run')
        .send({ deckId })
        .expect(201);

      const analysisId = analysisResponse.body.id;
      expect(analysisId).toBeDefined();

      // Step 5: Wait for analysis to complete
      let analysisStatus = 'processing';
      attempts = 0;

      while (analysisStatus === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const analysisResultResponse = await request(app.getHttpServer())
          .get(`/v1/analysis/${analysisId}`)
          .expect(200);

        analysisStatus = analysisResultResponse.body.status;
        attempts++;
      }

      expect(analysisStatus).toBe('completed');
      expect(attempts).toBeLessThan(maxAttempts);

      // Step 6: Verify analysis results
      const finalAnalysisResponse = await request(app.getHttpServer())
        .get(`/v1/analysis/${analysisId}`)
        .expect(200);

      const analysis = finalAnalysisResponse.body;
      expect(analysis.scores).toBeDefined();
      expect(analysis.explanations).toBeDefined();
      expect(analysis.scores.clarity).toBeGreaterThan(0);
      expect(analysis.scores.design).toBeGreaterThan(0);
      expect(analysis.scores.storytelling).toBeGreaterThan(0);
      expect(analysis.scores.investorFit).toBeGreaterThan(0);

      // Step 7: Test SSE streaming
      const sseResponse = await request(app.getHttpServer())
        .get(`/v1/analysis/${deckId}/stream`)
        .set('Accept', 'text/event-stream')
        .expect(200);

      expect(sseResponse.headers['content-type']).toContain('text/event-stream');
    }, 60000); // 60 second timeout

    it('should handle PDF files correctly', async () => {
      const testFilePath = join(__dirname, '../fixtures/sample-deck.pdf');
      
      if (!existsSync(testFilePath)) {
        console.log('PDF test file not found, skipping test');
        return;
      }

      const uploadResponse = await request(app.getHttpServer())
        .post('/v1/decks/upload')
        .attach('file', testFilePath)
        .field('name', 'Test PDF Deck')
        .field('description', 'PDF integration test')
        .expect(201);

      const deckId = uploadResponse.body.id;
      
      // Wait for processing
      let deckStatus = 'processing';
      let attempts = 0;
      const maxAttempts = 30;

      while (deckStatus === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const deckResponse = await request(app.getHttpServer())
          .get(`/v1/decks/${deckId}`)
          .expect(200);

        deckStatus = deckResponse.body.status;
        attempts++;
      }

      expect(deckStatus).toBe('completed');
    }, 60000);

    it('should handle large files within reasonable time', async () => {
      const testFilePath = join(__dirname, '../fixtures/large-deck.pptx');
      
      if (!existsSync(testFilePath)) {
        console.log('Large test file not found, skipping test');
        return;
      }

      const startTime = Date.now();

      const uploadResponse = await request(app.getHttpServer())
        .post('/v1/decks/upload')
        .attach('file', testFilePath)
        .field('name', 'Large Test Deck')
        .field('description', 'Large file test')
        .expect(201);

      const deckId = uploadResponse.body.id;

      // Wait for processing
      let deckStatus = 'processing';
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds for large files

      while (deckStatus === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const deckResponse = await request(app.getHttpServer())
          .get(`/v1/decks/${deckId}`)
          .expect(200);

        deckStatus = deckResponse.body.status;
        attempts++;
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(deckStatus).toBe('completed');
      expect(processingTime).toBeLessThan(60000); // Should complete within 60 seconds
    }, 120000);
  });

  describe('Error Handling', () => {
    it('should handle corrupted files gracefully', async () => {
      const corruptedFilePath = join(__dirname, '../fixtures/corrupted-file.pptx');
      
      if (!existsSync(corruptedFilePath)) {
        console.log('Corrupted test file not found, skipping test');
        return;
      }

      const uploadResponse = await request(app.getHttpServer())
        .post('/v1/decks/upload')
        .attach('file', corruptedFilePath)
        .field('name', 'Corrupted Deck')
        .field('description', 'Corrupted file test')
        .expect(201);

      const deckId = uploadResponse.body.id;

      // Wait for processing
      let deckStatus = 'processing';
      let attempts = 0;
      const maxAttempts = 30;

      while (deckStatus === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const deckResponse = await request(app.getHttpServer())
          .get(`/v1/decks/${deckId}`)
          .expect(200);

        deckStatus = deckResponse.body.status;
        attempts++;
      }

      // Should either complete or fail gracefully
      expect(['completed', 'failed']).toContain(deckStatus);
    }, 60000);

    it('should handle unsupported file types', async () => {
      const unsupportedFilePath = join(__dirname, '../fixtures/unsupported.txt');
      
      if (!existsSync(unsupportedFilePath)) {
        console.log('Unsupported test file not found, skipping test');
        return;
      }

      await request(app.getHttpServer())
        .post('/v1/decks/upload')
        .attach('file', unsupportedFilePath)
        .field('name', 'Unsupported File')
        .field('description', 'Unsupported file test')
        .expect(400); // Should reject unsupported file types
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet latency requirements for small files', async () => {
      const testFilePath = join(__dirname, '../fixtures/small-deck.pptx');
      
      if (!existsSync(testFilePath)) {
        console.log('Small test file not found, skipping test');
        return;
      }

      const startTime = Date.now();

      const uploadResponse = await request(app.getHttpServer())
        .post('/v1/decks/upload')
        .attach('file', testFilePath)
        .field('name', 'Small Test Deck')
        .field('description', 'Small file test')
        .expect(201);

      const deckId = uploadResponse.body.id;

      // Wait for processing
      let deckStatus = 'processing';
      let attempts = 0;
      const maxAttempts = 15; // 15 seconds for small files

      while (deckStatus === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const deckResponse = await request(app.getHttpServer())
          .get(`/v1/decks/${deckId}`)
          .expect(200);

        deckStatus = deckResponse.body.status;
        attempts++;
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(deckStatus).toBe('completed');
      expect(processingTime).toBeLessThan(15000); // Should complete within 15 seconds
    }, 30000);

    it('should maintain consistent performance across multiple uploads', async () => {
      const testFilePath = join(__dirname, '../fixtures/sample-deck.pptx');
      
      if (!existsSync(testFilePath)) {
        console.log('Test file not found, skipping performance test');
        return;
      }

      const processingTimes: number[] = [];

      // Process 3 files and measure times
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();

        const uploadResponse = await request(app.getHttpServer())
          .post('/v1/decks/upload')
          .attach('file', testFilePath)
          .field('name', `Performance Test Deck ${i + 1}`)
          .field('description', `Performance test ${i + 1}`)
          .expect(201);

        const deckId = uploadResponse.body.id;

        // Wait for processing
        let deckStatus = 'processing';
        let attempts = 0;
        const maxAttempts = 30;

        while (deckStatus === 'processing' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const deckResponse = await request(app.getHttpServer())
            .get(`/v1/decks/${deckId}`)
            .expect(200);

          deckStatus = deckResponse.body.status;
          attempts++;
        }

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        expect(deckStatus).toBe('completed');
        processingTimes.push(processingTime);
      }

      // Calculate variance in processing times
      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const variance = processingTimes.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / processingTimes.length;
      const standardDeviation = Math.sqrt(variance);

      // Processing times should be reasonably consistent (within 50% of average)
      expect(standardDeviation / avgTime).toBeLessThan(0.5);
    }, 180000);
  });
});
