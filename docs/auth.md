# Auth Module

Authentication via Better Auth. All auth routes are proxied through a single catch-all endpoint.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| ALL | `/api/auth/*` | Proxy all Better Auth routes |

## ALL `/api/auth/*`

The auth controller forwards every request to Better Auth's handler. This includes sign-up, sign-in, OAuth callbacks, session management, and password reset flows.

### Common Better Auth Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-up/email` | Register with email/password |
| POST | `/api/auth/sign-in/email` | Sign in with email/password |
| POST | `/api/auth/sign-in/social` | OAuth sign-in (Google, GitHub, etc.) |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/sign-out` | Sign out |

### Authentication

Most API endpoints require a Bearer token obtained from sign-in:

```bash
# Sign in
curl -X POST http://localhost:4001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Use token in subsequent requests
curl http://localhost:4001/api/users/me \
  -H "Authorization: Bearer <token>"
```

### Guards

Three guards control access to protected endpoints:

| Guard | Role | Description |
|-------|------|-------------|
| `AuthGuard` | Any authenticated user | Verifies valid session token |
| `AdminGuard` | `admin` or `super-admin` | Admin-level access |
| `SuperAdminGuard` | `super-admin` only | Full system access |

### Notes

- Uses [Better Auth](https://www.better-auth.com/) for session-based authentication
- OAuth callbacks redirect to the frontend URL configured via `BASE_URL` or `AUTH_TRUSTED_ORIGINS`
- CORS headers are set manually since `reply.hijack()` bypasses Fastify middleware
- New users are automatically persisted to MongoDB via `UsersService.ensureUserFromAuth()`
