module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'vue'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '.(css|less|scss|sass)$': '<rootDir>/tests/jest/styleMock.cjs',
  },
  transform: {
    '^.+.vue$': '@vue/vue3-jest',
    '^.+.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.vitest.json' }],
  },
};
