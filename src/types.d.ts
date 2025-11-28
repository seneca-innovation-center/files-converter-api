import { FastifyRequest as OriginalFastifyRequest } from 'fastify';

import { AuthenticatedUser } from './modules/auth/types/auth-user.type';
declare module 'danger';

declare module 'fastify' {
  export interface FastifyRequest extends OriginalFastifyRequest {
    user: AuthenticatedUser;
  }
}

declare module 'better-call/dist/node.cjs' {
  import { IncomingMessage, ServerResponse } from 'http';

  export function toNodeHandler(
    handler: (request: Request) => Promise<Response>,
  ): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}
