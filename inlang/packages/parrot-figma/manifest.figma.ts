export default {
  name: 'Parrot - Language Translation with ease - the Translator, i18n, l8n, Plugin (Free Beta)',
  id: '1205803482754362456',
  api: '1.0.0',
  editorType: [
    'figma',
    'dev',
  ],
  capabilities: ['inspect'],
  networkAccess: {
    allowedDomains: ['https://translate.googleapis.com', 'https://telemetry.inlang.com/', 'https://parrot-global.github.io', 'https://*.ingest.sentry.io', 'https://*.sentry.io', 'https://api.parrot.global', 'https://s3-alpha.figma.com'],
    devAllowedDomains: [
      'http://localhost:8080',
      'http://localhost:4006',
    ],
    reasoning: 'Parrot connects to various sources in order for it to operate and for us to create a proper experience. (Google Translate - to machine translate your designs, mixedpanel as analytics platform, Sentry to track bugs and crashes, and github.io to enforce updates)',
  },
  ui: 'dist/ui.html',
  main: 'dist/code.js',
  permissions: ['currentuser'],
  relaunchButtons: [
    { command: 'open', name: 'Localize' },
    { command: 'open-design-focus', name: 'Translation key', multipleSelection: false },
    { command: 'open-design', name: 'Language', multipleSelection: true },
  ],
};
