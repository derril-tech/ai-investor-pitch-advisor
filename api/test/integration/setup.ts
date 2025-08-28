import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DatabaseService } from '../../src/common/database/database.service';

let app: INestApplication;
let databaseService: DatabaseService;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  databaseService = moduleFixture.get(DatabaseService);

  // Initialize database connection
  await databaseService.connect();

  await app.init();
});

afterAll(async () => {
  // Clean up database
  if (databaseService) {
    // Clear test data
    await databaseService.query('DELETE FROM qa_pairs WHERE session_id LIKE ?', ['test-%']);
    await databaseService.query('DELETE FROM qa_sessions WHERE id LIKE ?', ['test-%']);
    await databaseService.query('DELETE FROM analyses WHERE deck_id LIKE ?', ['test-%']);
    await databaseService.query('DELETE FROM slides WHERE deck_id LIKE ?', ['test-%']);
    await databaseService.query('DELETE FROM decks WHERE id LIKE ?', ['test-%']);

    await databaseService.disconnect();
  }

  if (app) {
    await app.close();
  }
});
