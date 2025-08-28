import { Test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from 'redis';
import { Client as NatsClient } from 'nats';

Test.describe('Pipeline Integration Tests', () => {
  let redisClient: any;
  let natsClient: NatsClient;

  Test.beforeAll(async () => {
    // Setup Redis client
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();

    // Setup NATS client
    // natsClient = await connect({
    //   servers: process.env.NATS_URL || 'nats://localhost:4222'
    // });
  });

  Test.afterAll(async () => {
    if (redisClient) await redisClient.disconnect();
    if (natsClient) await natsClient.close();
  });

  Test.beforeEach(async ({ request }) => {
    // Clean up any existing test data
    await redisClient.flushAll();

    // Ensure API is healthy
    const healthResponse = await request.get('/health');
    expect(healthResponse.ok()).toBeTruthy();
  });

  Test('Complete pipeline integration test', async ({ request }) => {
    // Create test deck file
    const testDeckPath = path.join(__dirname, '../fixtures/sample-deck.pptx');
    const testDeckBuffer = Buffer.from('mock PPTX content for integration testing');

    if (!fs.existsSync(path.dirname(testDeckPath))) {
      fs.mkdirSync(path.dirname(testDeckPath), { recursive: true });
    }
    fs.writeFileSync(testDeckPath, testDeckBuffer);

    // Step 1: Upload deck via API
    const uploadResponse = await request.post('/deck/upload', {
      multipart: {
        file: fs.createReadStream(testDeckPath)
      }
    });

    expect(uploadResponse.ok()).toBeTruthy();
    const uploadData = await uploadResponse.json();
    expect(uploadData.id).toBeTruthy();
    const deckId = uploadData.id;

    // Verify deck was created in database
    const deckResponse = await request.get(`/deck/${deckId}`);
    expect(deckResponse.ok()).toBeTruthy();
    const deckData = await deckResponse.json();
    expect(deckData.status).toBe('pending');

    // Step 2: Wait for parsing to complete (simulate worker processing)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

    // Check parsing status
    const parsedDeckResponse = await request.get(`/deck/${deckId}`);
    expect(parsedDeckResponse.ok()).toBeTruthy();
    const parsedDeckData = await parsedDeckResponse.json();

    // Verify slides were extracted
    expect(parsedDeckData.slides).toBeDefined();
    expect(Array.isArray(parsedDeckData.slides)).toBeTruthy();
    expect(parsedDeckData.slides.length).toBeGreaterThan(0);

    // Step 3: Run analysis
    const analysisResponse = await request.post('/analysis/run', {
      data: { deckId }
    });

    expect(analysisResponse.ok()).toBeTruthy();
    const analysisData = await analysisResponse.json();
    expect(analysisData.analysisId).toBeTruthy();
    const analysisId = analysisData.analysisId;

    // Step 4: Wait for analysis to complete
    let analysisResult;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
      const analysisStatusResponse = await request.get(`/analysis/${deckId}`);
      expect(analysisStatusResponse.ok()).toBeTruthy();
      analysisResult = await analysisStatusResponse.json();

      if (analysisResult.status === 'completed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    expect(analysisResult.status).toBe('completed');

    // Verify analysis results
    expect(analysisResult.scores).toBeDefined();
    expect(analysisResult.scores.clarity).toBeGreaterThanOrEqual(0);
    expect(analysisResult.scores.clarity).toBeLessThanOrEqual(10);
    expect(analysisResult.scores.design).toBeGreaterThanOrEqual(0);
    expect(analysisResult.scores.design).toBeLessThanOrEqual(10);
    expect(analysisResult.scores.storytelling).toBeGreaterThanOrEqual(0);
    expect(analysisResult.scores.storytelling).toBeLessThanOrEqual(10);
    expect(analysisResult.scores.investorFit).toBeGreaterThanOrEqual(0);
    expect(analysisResult.scores.investorFit).toBeLessThanOrEqual(10);

    // Verify explanations are present
    expect(analysisResult.explanations).toBeDefined();
    expect(analysisResult.explanations.clarity).toBeTruthy();
    expect(analysisResult.explanations.design).toBeTruthy();
    expect(analysisResult.explanations.storytelling).toBeTruthy();
    expect(analysisResult.explanations.investorFit).toBeTruthy();

    // Step 5: Verify slide analysis
    expect(analysisResult.slideAnalysis).toBeDefined();
    expect(Array.isArray(analysisResult.slideAnalysis)).toBeTruthy();

    // Each slide should have analysis
    analysisResult.slideAnalysis.forEach((slide: any) => {
      expect(slide.slideId).toBeTruthy();
      expect(slide.role).toBeTruthy();
      expect(slide.score).toBeGreaterThanOrEqual(0);
      expect(slide.score).toBeLessThanOrEqual(10);
    });

    // Cleanup
    fs.unlinkSync(testDeckPath);
  });

  Test('Pipeline performance benchmarks', async ({ request }) => {
    // Create test deck
    const testDeckPath = path.join(__dirname, '../fixtures/benchmark-deck.pptx');
    const testDeckBuffer = Buffer.from('mock PPTX content for performance testing');

    if (!fs.existsSync(path.dirname(testDeckPath))) {
      fs.mkdirSync(path.dirname(testDeckPath), { recursive: true });
    }
    fs.writeFileSync(testDeckPath, testDeckBuffer);

    const startTime = Date.now();

    // Upload deck
    const uploadResponse = await request.post('/deck/upload', {
      multipart: {
        file: fs.createReadStream(testDeckPath)
      }
    });
    expect(uploadResponse.ok()).toBeTruthy();
    const deckId = (await uploadResponse.json()).id;

    // Simulate parsing completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run analysis
    const analysisResponse = await request.post('/analysis/run', {
      data: { deckId }
    });
    expect(analysisResponse.ok()).toBeTruthy();

    // Wait for completion
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const statusResponse = await request.get(`/analysis/${deckId}`);
      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Assert performance targets
    expect(totalDuration).toBeLessThan(45000); // < 45 seconds total

    // Verify Redis cache is populated
    const cacheKey = `analysis:${deckId}`;
    const cachedResult = await redisClient.get(cacheKey);
    expect(cachedResult).toBeTruthy();

    // Cleanup
    fs.unlinkSync(testDeckPath);
  });

  Test('Pipeline error handling', async ({ request }) => {
    // Test with invalid deck ID
    const analysisResponse = await request.post('/analysis/run', {
      data: { deckId: 'invalid-deck-id' }
    });

    expect(analysisResponse.status()).toBe(404);

    // Test with malformed data
    const malformedResponse = await request.post('/analysis/run', {
      data: { invalidField: 'test' }
    });

    expect(malformedResponse.status()).toBe(400);
  });

  Test('Pipeline determinism test', async ({ request }) => {
    // Create test deck
    const testDeckPath = path.join(__dirname, '../fixtures/determinism-test.pptx');
    const testDeckBuffer = Buffer.from('mock PPTX content for determinism testing');

    if (!fs.existsSync(path.dirname(testDeckPath))) {
      fs.mkdirSync(path.dirname(testDeckPath), { recursive: true });
    }
    fs.writeFileSync(testDeckPath, testDeckBuffer);

    // Upload deck
    const uploadResponse = await request.post('/deck/upload', {
      multipart: {
        file: fs.createReadStream(testDeckPath)
      }
    });
    const deckId = (await uploadResponse.json()).id;

    // Simulate parsing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run analysis multiple times
    const results = [];
    for (let i = 0; i < 3; i++) {
      const analysisResponse = await request.post('/analysis/run', {
        data: { deckId }
      });
      const analysisId = (await analysisResponse.json()).analysisId;

      // Wait for completion
      let attempts = 0;
      while (attempts < 30) {
        const statusResponse = await request.get(`/analysis/${deckId}`);
        const statusData = await statusResponse.json();

        if (statusData.status === 'completed') {
          results.push(statusData);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    // Verify determinism - results should be identical
    expect(results.length).toBe(3);

    for (let i = 1; i < results.length; i++) {
      expect(results[i].scores.clarity).toBe(results[0].scores.clarity);
      expect(results[i].scores.design).toBe(results[0].scores.design);
      expect(results[i].scores.storytelling).toBe(results[0].scores.storytelling);
      expect(results[i].scores.investorFit).toBe(results[0].scores.investorFit);
    }

    // Cleanup
    fs.unlinkSync(testDeckPath);
  });

  Test('Pipeline caching behavior', async ({ request }) => {
    // Create test deck
    const testDeckPath = path.join(__dirname, '../fixtures/cache-test.pptx');
    const testDeckBuffer = Buffer.from('mock PPTX content for cache testing');

    if (!fs.existsSync(path.dirname(testDeckPath))) {
      fs.mkdirSync(path.dirname(testDeckPath), { recursive: true });
    }
    fs.writeFileSync(testDeckPath, testDeckBuffer);

    // Upload deck
    const uploadResponse = await request.post('/deck/upload', {
      multipart: {
        file: fs.createReadStream(testDeckPath)
      }
    });
    const deckId = (await uploadResponse.json()).id;

    // Simulate parsing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // First analysis request
    const startTime1 = Date.now();
    const analysisResponse1 = await request.post('/analysis/run', {
      data: { deckId }
    });
    const analysisId1 = (await analysisResponse1.json()).analysisId;

    // Wait for completion
    let attempts = 0;
    while (attempts < 30) {
      const statusResponse = await request.get(`/analysis/${deckId}`);
      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    const endTime1 = Date.now();

    // Second analysis request (should use cache)
    const startTime2 = Date.now();
    const analysisResponse2 = await request.post('/analysis/run', {
      data: { deckId }
    });
    const analysisId2 = (await analysisResponse2.json()).analysisId;

    // Wait for completion
    attempts = 0;
    while (attempts < 30) {
      const statusResponse = await request.get(`/analysis/${deckId}`);
      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    const endTime2 = Date.now();

    // Second request should be significantly faster (cached)
    const duration1 = endTime1 - startTime1;
    const duration2 = endTime2 - startTime2;

    expect(duration2).toBeLessThan(duration1); // Cache should be faster

    // Verify Redis cache
    const cacheKey = `analysis:${deckId}`;
    const cachedResult = await redisClient.get(cacheKey);
    expect(cachedResult).toBeTruthy();

    // Cleanup
    fs.unlinkSync(testDeckPath);
  });

  Test('Pipeline concurrent requests handling', async ({ request }) => {
    // Create test deck
    const testDeckPath = path.join(__dirname, '../fixtures/concurrent-test.pptx');
    const testDeckBuffer = Buffer.from('mock PPTX content for concurrent testing');

    if (!fs.existsSync(path.dirname(testDeckPath))) {
      fs.mkdirSync(path.dirname(testDeckPath), { recursive: true });
    }
    fs.writeFileSync(testDeckPath, testDeckBuffer);

    // Upload deck
    const uploadResponse = await request.post('/deck/upload', {
      multipart: {
        file: fs.createReadStream(testDeckPath)
      }
    });
    const deckId = (await uploadResponse.json()).id;

    // Simulate parsing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send multiple concurrent analysis requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request.post('/analysis/run', {
          data: { deckId }
        })
      );
    }

    const responses = await Promise.all(promises);

    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });

    // Verify results are consistent
    const analysisIds = await Promise.all(
      responses.map(async (response) => {
        const data = await response.json();
        return data.analysisId;
      })
    );

    // Should get same analysis ID for concurrent requests (idempotent)
    const uniqueIds = [...new Set(analysisIds)];
    expect(uniqueIds.length).toBe(1);

    // Cleanup
    fs.unlinkSync(testDeckPath);
  });

  Test('Pipeline resource cleanup', async ({ request }) => {
    // Create test deck
    const testDeckPath = path.join(__dirname, '../fixtures/cleanup-test.pptx');
    const testDeckBuffer = Buffer.from('mock PPTX content for cleanup testing');

    if (!fs.existsSync(path.dirname(testDeckPath))) {
      fs.mkdirSync(path.dirname(testDeckPath), { recursive: true });
    }
    fs.writeFileSync(testDeckPath, testDeckBuffer);

    // Upload deck
    const uploadResponse = await request.post('/deck/upload', {
      multipart: {
        file: fs.createReadStream(testDeckPath)
      }
    });
    const deckId = (await uploadResponse.json()).id;

    // Verify Redis keys before analysis
    const keysBefore = await redisClient.keys('*');
    const analysisKeysBefore = keysBefore.filter((key: string) => key.includes('analysis'));

    // Run analysis
    await request.post('/analysis/run', {
      data: { deckId }
    });

    // Simulate completion
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify Redis keys after analysis
    const keysAfter = await redisClient.keys('*');
    const analysisKeysAfter = keysAfter.filter((key: string) => key.includes('analysis'));

    // Should have more keys after analysis (caching)
    expect(analysisKeysAfter.length).toBeGreaterThan(analysisKeysBefore.length);

    // Verify database records exist
    const deckResponse = await request.get(`/deck/${deckId}`);
    expect(deckResponse.ok()).toBeTruthy();

    // Cleanup
    fs.unlinkSync(testDeckPath);
  });
});
