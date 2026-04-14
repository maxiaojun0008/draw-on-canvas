module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  extends: ['eslint:recommended', 'prettier'],
  ignorePatterns: ['dist', 'node_modules']
};
