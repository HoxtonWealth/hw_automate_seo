export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'api/**/*.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
