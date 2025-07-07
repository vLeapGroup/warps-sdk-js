module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    // Add this to transform ES module dependencies
    'node_modules/(?!(uuid|@multiversx)/)',
  ],
  testEnvironment: 'node',
}
