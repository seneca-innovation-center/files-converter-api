import { Readable } from 'node:stream';

import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Auth } from 'better-auth';
import { FastifyReply, FastifyRequest } from 'fastify';

import { UsersService } from '../../users/services/users.service';
import { BETTER_AUTH } from '../constants/auth.constants';
import { AuthenticatedUser } from '../types/auth-user.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(BETTER_AUTH) private readonly auth: Auth,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async handleAuthRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    reply.hijack();
    const webRequest = this.createWebRequest(request);
    const response = await this.auth.handler(webRequest);
    await this.sendResponse(reply, response, request);
  }

  async getRole(token: string): Promise<string> {
    const authUser = await this.verifyToken(token);
    return authUser.role;
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException(
        'You should be logged in to access this resource',
      );
    }

    try {
      const sessionResponse = await this.auth.api.getSession({
        headers: new Headers({
          authorization: `Bearer ${token}`,
        }),
      });

      if (
        !sessionResponse ||
        !sessionResponse.user ||
        !sessionResponse.session
      ) {
        throw new UnauthorizedException('Invalid session');
      }
      const { user, session } = sessionResponse;

      const persistedUser = await this.usersService.ensureUserFromAuth({
        authId: user.id,
        email: user.email ?? '',
        fullName: user.name ?? user.email ?? undefined,
      });

      return {
        authId: persistedUser.authId,
        email: persistedUser.email,
        fullName: persistedUser.fullName,
        role: persistedUser.role,
        sessionId: session.token ?? session.id ?? 'active-session',
      };
    } catch (error) {
      this.logger.error(
        'Better Auth session verification failed',
        error as Error,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }

  private createWebRequest(request: FastifyRequest): Request {
    const method = request.raw.method ?? 'GET';
    const headers = new Headers();

    for (const [key, value] of Object.entries(request.headers)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        value.forEach((val) => headers.append(key, val));
      } else {
        headers.append(key, value);
      }
    }

    const forwardedProto = (request.headers['x-forwarded-proto'] as string)
      ?.split(',')[0]
      ?.trim();
    const forwardedHost = (request.headers['x-forwarded-host'] as string)
      ?.split(',')[0]
      ?.trim();

    const protocol = forwardedProto || request.protocol || 'http';
    const host =
      forwardedHost || (request.headers.host as string) || 'localhost:3000';
    const url = `${protocol}://${host}${request.raw.url ?? ''}`;
    const hasBody = method !== 'GET' && method !== 'HEAD';

    let body: BodyInit | undefined = undefined;

    if (hasBody) {
      // If Fastify has already parsed the body (JSON, form-data, etc.), use it
      if (request.body !== undefined && request.body !== null) {
        const contentType = (request.headers['content-type'] as string) || '';

        if (contentType.includes('application/json')) {
          // Serialize parsed JSON body back to string
          body = JSON.stringify(request.body);
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          // Handle form-urlencoded data
          if (typeof request.body === 'object' && request.body !== null) {
            const formData = new URLSearchParams();
            for (const [key, value] of Object.entries(
              request.body as Record<string, unknown>,
            )) {
              formData.append(key, String(value));
            }
            body = formData.toString();
          } else if (
            typeof request.body === 'string' ||
            typeof request.body === 'number' ||
            typeof request.body === 'boolean'
          ) {
            body = String(request.body);
          } else {
            body = '';
          }
        } else {
          // For other types, try to use the raw stream if available
          if (request.raw.readable) {
            body = Readable.toWeb(request.raw) as unknown as BodyInit;
          } else {
            // Fallback: serialize as JSON if it's an object, otherwise as string
            if (typeof request.body === 'object' && request.body !== null) {
              body = JSON.stringify(request.body);
            } else if (
              typeof request.body === 'string' ||
              typeof request.body === 'number' ||
              typeof request.body === 'boolean'
            ) {
              body = String(request.body);
            } else {
              body = '';
            }
          }
        }
      } else if (request.raw.readable) {
        // Body hasn't been parsed yet, use the raw stream
        body = Readable.toWeb(request.raw) as unknown as BodyInit;
      }
    }

    const init: RequestInit & { duplex?: 'half' } = {
      method,
      headers,
      body,
    };

    if (
      body &&
      typeof body !== 'string' &&
      !(body instanceof URLSearchParams)
    ) {
      init.duplex = 'half';
    }

    return new Request(url, init);
  }

  private async sendResponse(
    reply: FastifyReply,
    response: Response,
    request: FastifyRequest,
  ) {
    // Get allowed origins from environment variables
    const baseUrlOrigins =
      this.configService
        .get<string>('BASE_URL')
        ?.split(',')
        .map((url) => url.trim()) || [];
    const authTrustedOrigins =
      this.configService
        .get<string>('AUTH_TRUSTED_ORIGINS')
        ?.split(',')
        .map((url) => url.trim()) || [];
    const allOrigins = [...new Set([...baseUrlOrigins, ...authTrustedOrigins])];
    const allowedOrigins =
      allOrigins.length > 0
        ? allOrigins
        : process.env.NODE_ENV === 'production'
          ? []
          : ['http://localhost:3000'];

    // Get origin from request
    const origin =
      (request.headers.origin as string) ||
      (request.headers.referer as string)?.split('/').slice(0, 3).join('/');

    // Determine CORS origin (check if request origin is allowed, or use first allowed origin, or allow all in dev)
    let corsOrigin: string = '*';
    if (allowedOrigins.length > 0) {
      if (origin && allowedOrigins.includes(origin)) {
        corsOrigin = origin;
      } else if (allowedOrigins.length === 1) {
        corsOrigin = allowedOrigins[0];
      } else {
        corsOrigin = allowedOrigins[0]; // Use first allowed origin as fallback
      }
    } else if (process.env.NODE_ENV !== 'production') {
      corsOrigin = origin || '*';
    }

    // Add CORS headers manually since reply.hijack() bypasses Fastify middleware
    reply.raw.setHeader('Access-Control-Allow-Origin', corsOrigin);
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
    reply.raw.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    );
    reply.raw.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Cache-Control, X-Requested-With',
    );

    const setCookieValues: string[] = [];
    const apiUrl =
      this.configService.get<string>('API_URL') || 'http://localhost:3001';
    const frontendUrl =
      this.configService.get<string>('BASE_URL')?.split(',')[0]?.trim() ||
      this.configService
        .get<string>('AUTH_TRUSTED_ORIGINS')
        ?.split(',')[0]
        ?.trim() ||
      'http://localhost:3000';

    // Check if this is a redirect response (OAuth callback)
    const isRedirect =
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.has('location');
    let redirectLocation: string | null = null;

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        setCookieValues.push(value);
        return;
      }

      // Don't override CORS headers that we just set
      if (key.toLowerCase().startsWith('access-control-')) {
        return;
      }

      // Intercept Location header for redirects and modify to point to frontend
      if (key.toLowerCase() === 'location' && isRedirect) {
        const location = value;
        // If redirect points to API URL, redirect to frontend instead
        if (location.startsWith(apiUrl)) {
          // Extract path from API URL and redirect to frontend
          const url = new URL(location);
          redirectLocation = `${frontendUrl}${url.pathname}${url.search}${url.hash}`;
          reply.raw.setHeader('Location', redirectLocation);
        } else if (location === '/' || location.startsWith('/')) {
          // If it's a relative path, redirect to frontend with that path
          redirectLocation = `${frontendUrl}${location}`;
          reply.raw.setHeader('Location', redirectLocation);
        } else {
          // Keep original location if it's already pointing to frontend or external URL
          reply.raw.setHeader(key, value);
        }
        return;
      }

      reply.raw.setHeader(key, value);
    });

    if (setCookieValues.length > 0) {
      reply.raw.setHeader('set-cookie', setCookieValues);
    }

    reply.raw.statusCode = response.status;
    reply.raw.statusMessage = response.statusText;

    if (!response.body) {
      reply.raw.end();
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    reply.raw.end(buffer);
  }
}
