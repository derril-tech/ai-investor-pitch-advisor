import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  // Create test fixtures directory if it doesn't exist
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Create mock test files for CI
  const testFiles = [
    'sample-deck.pptx',
    'small-deck.pptx',
    'corrupted-file.pptx',
    'unsupported.txt'
  ];

  for (const file of testFiles) {
    const filePath = path.join(fixturesDir, file);
    if (!fs.existsSync(filePath)) {
      const content = file.includes('corrupted')
        ? 'corrupted content'
        : file.includes('unsupported')
        ? 'unsupported file format'
        : 'mock PPTX content for testing';
      fs.writeFileSync(filePath, content);
    }
  }

  // Verify database connection and setup test data
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to health check endpoint
    await page.goto(`${config.projects[0].use.baseURL}/api/health`);
    const content = await page.textContent('body');

    if (!content.includes('healthy')) {
      throw new Error('API is not healthy');
    }

    console.log('✅ API health check passed');
  } catch (error) {
    console.error('❌ API health check failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
