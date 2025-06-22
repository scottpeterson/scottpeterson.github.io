module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script', // Changed from 'module' to support our current structure
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': 'off', // Allow console.log for debugging
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'no-trailing-spaces': 'off', // Let Prettier handle this
    indent: 'off', // Let Prettier handle indentation
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'no-inner-declarations': 'off', // Allow function declarations inside blocks
    'no-undef': 'off', // Turn off for now due to global functions
  },
  globals: {
    // Global variables for browser environment
    window: 'readonly',
    document: 'readonly',
    console: 'readonly',
    // Our global functions
    initMobileNav: 'writable',
    setActiveNavLink: 'writable',
  },
};
