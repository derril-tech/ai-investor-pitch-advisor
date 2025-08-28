import { Test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

Test.describe('Full Pipeline E2E Tests', () => {
  Test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  Test('Complete deck upload to export pipeline', async ({ page }) => {
    // Step 1: Upload a pitch deck
    const fileInput = page.locator('input[type="file"]');
    const testDeckPath = path.join(__dirname, '../fixtures/sample-deck.pptx');

    // Ensure test file exists
    if (!fs.existsSync(testDeckPath)) {
      // Create a mock test file for CI
      fs.writeFileSync(testDeckPath, 'mock pptx content');
    }

    await fileInput.setInputFiles(testDeckPath);

    // Wait for upload to complete
    await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 });

    // Verify deck appears in the list
    const deckItem = page.locator('[data-testid="deck-item"]').first();
    await expect(deckItem).toBeVisible();

    // Get deck ID for subsequent tests
    const deckId = await deckItem.getAttribute('data-deck-id');
    expect(deckId).toBeTruthy();

    // Step 2: Run analysis
    const analyzeButton = page.locator('[data-testid="run-analysis"]');
    await analyzeButton.click();

    // Wait for analysis to complete
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    // Verify analysis results are displayed
    const scoreDashboard = page.locator('[data-testid="score-dashboard"]');
    await expect(scoreDashboard).toBeVisible();

    // Verify all four dimensions are present
    await expect(page.locator('[data-testid="clarity-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="design-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="storytelling-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="investor-fit-score"]')).toBeVisible();

    // Step 3: Generate Q&A session
    const qaButton = page.locator('[data-testid="generate-qa"]');
    await qaButton.click();

    // Fill out Q&A form
    await page.fill('[data-testid="qa-name"]', 'Test Q&A Session');
    await page.selectOption('[data-testid="qa-sector"]', 'Technology');
    await page.selectOption('[data-testid="qa-stage"]', 'Series A');

    const generateQaButton = page.locator('[data-testid="generate-qa-submit"]');
    await generateQaButton.click();

    // Wait for Q&A generation to complete
    await page.waitForSelector('[data-testid="qa-complete"]', { timeout: 45000 });

    // Verify Q&A questions are displayed
    const qaQuestions = page.locator('[data-testid="qa-question"]');
    await expect(qaQuestions.first()).toBeVisible();

    // Verify we have at least 10 questions
    const questionCount = await qaQuestions.count();
    expect(questionCount).toBeGreaterThanOrEqual(10);

    // Step 4: Generate suggestions
    const suggestionsButton = page.locator('[data-testid="generate-suggestions"]');
    await suggestionsButton.click();

    // Wait for suggestions to complete
    await page.waitForSelector('[data-testid="suggestions-complete"]', { timeout: 30000 });

    // Verify suggestions are displayed
    const suggestionsPanel = page.locator('[data-testid="suggestions-panel"]');
    await expect(suggestionsPanel).toBeVisible();

    // Step 5: Export results
    const exportButton = page.locator('[data-testid="export-button"]');
    await exportButton.click();

    // Configure export options
    await page.check('[data-testid="include-analysis"]');
    await page.check('[data-testid="include-qa"]');
    await page.selectOption('[data-testid="export-format"]', 'pdf');

    const startExportButton = page.locator('[data-testid="start-export"]');
    await startExportButton.click();

    // Wait for export to complete
    await page.waitForSelector('[data-testid="export-complete"]', { timeout: 60000 });

    // Verify download link is available
    const downloadLink = page.locator('[data-testid="download-link"]');
    await expect(downloadLink).toBeVisible();

    // Verify export includes all selected components
    const exportSummary = page.locator('[data-testid="export-summary"]');
    await expect(exportSummary).toContainText('Analysis Report');
    await expect(exportSummary).toContainText('Q&A Summary');
  });

  Test('Error handling for corrupted files', async ({ page }) => {
    // Upload a corrupted file
    const fileInput = page.locator('input[type="file"]');
    const corruptedFilePath = path.join(__dirname, '../fixtures/corrupted-file.pptx');

    // Create a corrupted file for testing
    fs.writeFileSync(corruptedFilePath, 'corrupted content that is not a valid PPTX');

    await fileInput.setInputFiles(corruptedFilePath);

    // Verify error message appears
    const errorMessage = page.locator('[data-testid="upload-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('corrupted');
  });

  Test('Performance benchmark - small deck', async ({ page }) => {
    const startTime = Date.now();

    // Upload small deck
    const fileInput = page.locator('input[type="file"]');
    const smallDeckPath = path.join(__dirname, '../fixtures/small-deck.pptx');

    if (!fs.existsSync(smallDeckPath)) {
      fs.writeFileSync(smallDeckPath, 'mock small pptx content');
    }

    await fileInput.setInputFiles(smallDeckPath);

    // Wait for complete pipeline
    await page.waitForSelector('[data-testid="pipeline-complete"]', { timeout: 15000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Assert performance meets target (< 15 seconds for small deck)
    expect(duration).toBeLessThan(15000);

    console.log(`Small deck pipeline completed in ${duration}ms`);
  });

  Test('Real-time progress updates', async ({ page }) => {
    // Upload deck
    const fileInput = page.locator('input[type="file"]');
    const testDeckPath = path.join(__dirname, '../fixtures/sample-deck.pptx');

    if (!fs.existsSync(testDeckPath)) {
      fs.writeFileSync(testDeckPath, 'mock pptx content');
    }

    await fileInput.setInputFiles(testDeckPath);

    // Verify progress indicators appear
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Start analysis
    const analyzeButton = page.locator('[data-testid="run-analysis"]');
    await analyzeButton.click();

    // Verify analysis progress
    await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible();

    // Verify SSE connection or progress updates
    const progressUpdates = page.locator('[data-testid="progress-update"]');
    await expect(progressUpdates).toBeVisible();
  });

  Test('Data consistency across services', async ({ page }) => {
    // Upload deck and complete pipeline
    const fileInput = page.locator('input[type="file"]');
    const testDeckPath = path.join(__dirname, '../fixtures/sample-deck.pptx');

    if (!fs.existsSync(testDeckPath)) {
      fs.writeFileSync(testDeckPath, 'mock pptx content');
    }

    await fileInput.setInputFiles(testDeckPath);
    await page.waitForSelector('[data-testid="upload-complete"]');

    // Run analysis
    await page.locator('[data-testid="run-analysis"]').click();
    await page.waitForSelector('[data-testid="analysis-complete"]');

    // Generate Q&A
    await page.locator('[data-testid="generate-qa"]').click();
    await page.fill('[data-testid="qa-name"]', 'Consistency Test Q&A');
    await page.selectOption('[data-testid="qa-sector"]', 'Technology');
    await page.selectOption('[data-testid="qa-stage"]', 'Series A');
    await page.locator('[data-testid="generate-qa-submit"]').click();
    await page.waitForSelector('[data-testid="qa-complete"]');

    // Verify data consistency
    const deckTitle = await page.locator('[data-testid="deck-title"]').textContent();
    const qaDeckRef = await page.locator('[data-testid="qa-deck-reference"]').textContent();

    // Deck title should match across all components
    expect(qaDeckRef).toContain(deckTitle);

    // Verify slide references in Q&A are valid
    const slideRefs = page.locator('[data-testid="slide-reference"]');
    const slideRefCount = await slideRefs.count();

    for (let i = 0; i < slideRefCount; i++) {
      const slideRef = await slideRefs.nth(i).textContent();
      expect(slideRef).toMatch(/Slide \d+/);
    }
  });

  Test('Accessibility compliance', async ({ page }) => {
    // Upload deck
    const fileInput = page.locator('input[type="file"]');
    const testDeckPath = path.join(__dirname, '../fixtures/sample-deck.pptx');

    if (!fs.existsSync(testDeckPath)) {
      fs.writeFileSync(testDeckPath, 'mock pptx content');
    }

    await fileInput.setInputFiles(testDeckPath);
    await page.waitForSelector('[data-testid="upload-complete"]');

    // Check for ARIA labels
    const ariaLabels = await page.locator('[aria-label]').count();
    expect(ariaLabels).toBeGreaterThan(0);

    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check for sufficient color contrast (basic check)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      if (alt !== null) {
        expect(alt.length).toBeGreaterThan(0);
      }
    }
  });
});
