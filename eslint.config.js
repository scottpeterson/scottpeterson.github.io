const path = require('node:path');
const { includeIgnoreFile } = require('@eslint/compat');
const js = require('@eslint/js');
const globals = require('globals');
const prettierConfig = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  // ESLint 10 dropped --ignore-path, so .gitignore is read here instead.
  includeIgnoreFile(path.join(__dirname, '.gitignore')),
  {
    ignores: ['*.min.js', '**/*.min.js'],
  },
  js.configs.recommended,
  prettierConfig,
  {
    plugins: { prettier: prettierPlugin },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script', // Changed from 'module' to support our current structure
      globals: {
        ...globals.browser,
        ...globals.node,
        // Global variables for browser environment
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        // Cross-file global functions are declared via /* exported */ directives in
        // the files that define them (e.g. js/navigation.js), so no-unused-vars
        // doesn't flag their definitions. With no-undef off, the call sites are fine.
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // ESLint 9 changed the default to 'all'; 'none' keeps the v8 behavior
          // of not flagging unused catch-clause bindings.
          caughtErrors: 'none',
        },
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
  },
];
