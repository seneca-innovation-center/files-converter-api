# Mail Module

Internal email service. No public API endpoints.

## Endpoints

None — this module is used internally by other services.

## Service API

### `sendEmail(email, firstName, lastName)`

Sends a templated email to the given address.

| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | string | Recipient email address |
| `firstName` | string | Recipient first name |
| `lastName` | string | Recipient last name |

The email includes a link to the frontend login URL configured via `FRONTEND_LOGIN_URL`.

## Configuration

| Env Variable | Description |
|-------------|-------------|
| `FRONTEND_LOGIN_URL` | Login page URL included in emails |
| SMTP settings | Configured via `@nestjs-modules/mailer` |

### Notes

- Uses `@nestjs-modules/mailer` with Handlebars templates
- Email templates are stored in `src/email-templates/` (`.hbs` files)
- Do not send emails directly from controllers; always go through `MailService`
