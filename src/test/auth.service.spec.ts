import { ConfigService } from '@nestjs/config';
import type { Auth } from 'better-auth';

import { AuthService } from '../modules/auth/services/auth.service';
import { UsersService } from '../modules/users/services/users.service';

describe('AuthService', () => {
  const mockGetSession = jest.fn();
  const mockEnsureUser = jest.fn();

  const createService = () =>
    new AuthService(
      {
        handler: jest.fn().mockResolvedValue(new Response('ok')),
        api: {
          getSession: mockGetSession,
        },
      } as unknown as Auth,
      {
        ensureUserFromAuth: mockEnsureUser,
      } as unknown as UsersService,
      new ConfigService(),
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve authenticated user from Better Auth session', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'auth_1', email: 'user@example.com', name: 'Test User' },
      session: { id: 'session_1' },
    });

    mockEnsureUser.mockResolvedValue({
      authId: 'auth_1',
      email: 'user@example.com',
      fullName: 'Test User',
      role: 'admin',
    });

    const service = createService();
    const user = await service.verifyToken('token');

    expect(user.role).toBe('admin');
    expect(mockGetSession).toHaveBeenCalled();
    expect(mockEnsureUser).toHaveBeenCalledWith({
      authId: 'auth_1',
      email: 'user@example.com',
      fullName: 'Test User',
    });
  });
});
