import { User } from '@clerk/backend';
import { FastifyRequest as OriginalFastifyRequest } from 'fastify';
declare module 'danger';

declare module 'fastify' {
  export interface FastifyRequest extends OriginalFastifyRequest {
    user: User;
  }
}
