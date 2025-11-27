import { UserRole } from '../../users/models/user.schema';

export interface AuthenticatedUser {
  authId: string;
  email: string;
  fullName?: string;
  role: UserRole;
  sessionId: string;
}
