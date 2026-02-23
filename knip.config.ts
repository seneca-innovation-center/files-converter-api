import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/main.ts'],
  project: ['src/**/*.ts'],
  ignore: [
    // Mail module is scaffolded but not yet wired into AppModule
    'src/modules/mail/mail.module.ts',
    'src/modules/mail/controllers/mail.controller.ts',
  ],
  ignoreDependencies: [
    // NestJS CLI plugins used implicitly via nest build/start
    'ts-loader',
    'source-map-support',
    'tsconfig-paths',
    // Used by nestjs-pino in dev via transport target
    'pino-pretty',
  ],
  ignoreBinaries: [
    // start:prod script runs compiled output directly
    'dist/main',
  ],
};

export default config;
