# Users Module

User management and role-based access control.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Get current user profile |
| GET | `/api/users` | List all users (Admin) |
| PATCH | `/api/users/:id` | Update user role (Super Admin) |
| DELETE | `/api/users/:id` | Delete user (Super Admin) |

## GET `/api/users/me`

**Auth**: `AuthGuard` (any authenticated user)

Returns the current user's profile.

```bash
curl http://localhost:4001/api/users/me \
  -H "Authorization: Bearer <token>"
```

**Response**:

```json
{
  "authId": "abc123",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "user"
}
```

## GET `/api/users`

**Auth**: `AdminGuard` (admin or super-admin)

Returns all users sorted by creation date (newest first).

```bash
curl http://localhost:4001/api/users \
  -H "Authorization: Bearer <admin-token>"
```

## PATCH `/api/users/:id`

**Auth**: `SuperAdminGuard`

**Content-Type**: `application/json`

```json
{
  "role": "admin",
  "permissions": ["manage-users", "view-reports"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | `super-admin`, `admin`, or `user` |
| `permissions` | string[] | No | Custom permission list |

```bash
curl -X PATCH http://localhost:4001/api/users/<user-id> \
  -H "Authorization: Bearer <super-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

## DELETE `/api/users/:id`

**Auth**: `SuperAdminGuard`

Permanently deletes a user.

```bash
curl -X DELETE http://localhost:4001/api/users/<user-id> \
  -H "Authorization: Bearer <super-admin-token>"
```

**Response**:

```json
{
  "status": true,
  "message": "User deleted successfully"
}
```

### Notes

- Users are automatically created on first sign-in via `ensureUserFromAuth()`
- Default role for new users is `user`
- Roles: `super-admin` > `admin` > `user`
- Responses are serialized to exclude internal fields (MongoDB `_id`, `__v`, etc.)
