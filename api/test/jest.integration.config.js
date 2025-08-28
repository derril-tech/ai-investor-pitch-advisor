module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/integration/**/*.integration-spec.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
  testTimeout: 60000, // 60 seconds for integration tests
  maxWorkers: 1, // Run integration tests sequentially
  forceExit: true,
  detectOpenHandles: true,
};
