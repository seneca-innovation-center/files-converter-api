import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer } from 'better-auth/plugins/bearer';
import type { Db, MongoClient } from 'mongodb';
import { Connection } from 'mongoose';
import { MONGOOSE_MODELS } from 'src/database';

import { UsersModule } from '../users/users.module';

import { BETTER_AUTH } from './constants/auth.constants';
import { AuthController } from './controllers/auth.controller';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    MongooseModule.forFeature(MONGOOSE_MODELS),
    ConfigModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: BETTER_AUTH,
      useFactory: async (
        configService: ConfigService,
        connection: Connection,
      ) => {
        const baseURL =
          configService.get<string>('API_URL') || 'http://localhost:3000';
        const trustedOrigins = (
          configService.get<string>('AUTH_TRUSTED_ORIGINS') || ''
        )
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);

        const resolvedClient: MongoClient =
          typeof (connection as { getClient?: () => MongoClient }).getClient ===
          'function'
            ? (connection as { getClient: () => MongoClient }).getClient()
            : (connection as unknown as { client: MongoClient }).client;

        if (!resolvedClient) {
          throw new Error('Unable to resolve MongoDB client instance');
        }

        const database = connection.db as Db | null;
        if (!database) {
          throw new Error('Database connection is not ready yet');
        }

        const googleClientId = configService.get<string>('GOOGLE_CLIENT_ID');
        const googleClientSecret = configService.get<string>(
          'GOOGLE_CLIENT_SECRET',
        );
        const githubClientId = configService.get<string>('GITHUB_CLIENT_ID');
        const githubClientSecret = configService.get<string>(
          'GITHUB_CLIENT_SECRET',
        );

        const socialProviders: BetterAuthOptions['socialProviders'] = {};

        if (googleClientId && googleClientSecret) {
          socialProviders.google = {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          };
        }

        if (githubClientId && githubClientSecret) {
          socialProviders.github = {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          };
        }

        return betterAuth({
          baseURL,
          basePath: '/api/auth',
          trustedOrigins,
          emailAndPassword: {
            enabled: true,
          },
          account: {
            storeStateStrategy: 'database',
          },
          socialProviders: Object.keys(socialProviders).length
            ? socialProviders
            : undefined,
          database: mongodbAdapter(database, {
            client: resolvedClient,
            transaction: false,
          }),
          plugins: [bearer()],
        });
      },
      inject: [ConfigService, getConnectionToken()],
    },
    AuthService,
    AuthGuard,
    AdminGuard,
    SuperAdminGuard,
  ],
  exports: [AuthService, AuthGuard, AdminGuard, SuperAdminGuard],
})
export class AuthModule {}
