/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: [
    "<rootDir>/tests/frontend/**/*.test.{ts,tsx}",
    "<rootDir>/tests/unit/**/*.test.{ts,tsx}",
    "<rootDir>/tests/integration/**/*.test.{ts,tsx}",
    "<rootDir>/tests/chaos/**/*.test.{ts,tsx}"
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  setupFiles: ['dotenv/config'],
};
