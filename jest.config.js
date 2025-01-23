module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: true,
};
