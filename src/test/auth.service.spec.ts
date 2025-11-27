import { ConfigService } from '@nestjs/config';

import { AuthService } from '../modules/auth/services/auth.service';

const mockVerifyToken = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@clerk/backend', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

jest.mock('@clerk/fastify', () => ({
  createClerkClient: () => ({
    users: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

describe('AuthService', () => {
  const configMock = {
    get: (key: string) => {
      if (key === 'CLERK_SECRET_KEY') return 'secret';
      if (key === 'CLERK_JWT_KEY') return 'jwt-key';
      if (key === 'API_URL') return 'http://localhost';
      return null;
    },
  } as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve role from Clerk token metadata', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'user_123' });
    mockGetUser.mockResolvedValue({
      publicMetadata: { role: 'user' },
    });

    const service = new AuthService(configMock);
    const role = await service.getRole('token');

    expect(role).toBe('user');
    expect(mockVerifyToken).toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalled();
  });
});
