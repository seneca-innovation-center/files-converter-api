import { join } from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import { AppController } from './app.controller';
import { ThreeDModule } from './modules/3d/3d.module';
import { ArchivesModule } from './modules/archives/archives.module';
import { AuthModule } from './modules/auth/auth.module';
import { CodeModule } from './modules/code/code.module';
import { EbooksModule } from './modules/ebooks/ebooks.module';
import { FilesModule } from './modules/files/files.module';
import { ImagesModule } from './modules/images/images.module';
import { MarkdownModule } from './modules/markdown/markdown.module';
import { MediaModule } from './modules/media/media.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { PresentationsModule } from './modules/presentations/presentations.module';
import { QrModule } from './modules/qr/qr.module';
import { UsersModule } from './modules/users/users.module';
import { TempFileCleanupService } from './utils/temp-file-cleanup.service';

@Module({
  imports: [
    // Global configuration module for environment variables and app settings
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Task scheduling module for cron jobs and intervals (used for temp file cleanup)
    ScheduleModule.forRoot(),
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds (1 minute)
        limit: 10, // Maximum number of requests per time window
      },
    ]),
    // MongoDB connection using URI from environment variables (remove this module if database is not needed)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    // Email service configuration using SMTP transport and Handlebars templates (remove this module if email functionality is not needed)
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get<string>('EMAIL_HOST'),
          port: 587,
          secure: false,
          auth: {
            user: config.get<string>('EMAIL_USER'),
            pass: config.get<string>('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: config.get<string>('EMAIL_SENDER'),
        },
        template: {
          // Use a path that works in dev (src) and prod (dist) builds.
          // In dev, __dirname points to src; in prod, it points to dist.
          dir: join(__dirname, 'email-templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
    // File conversion modules
    ImagesModule,
    ThreeDModule,
    FilesModule,
    // New conversion modules
    QrModule,
    ArchivesModule,
    MarkdownModule,
    MediaModule,
    OcrModule,
    CodeModule,
    PresentationsModule,
    EbooksModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Temporary file cleanup service
    TempFileCleanupService,
  ],
})
export class AppModule {}
