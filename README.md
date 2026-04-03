# Production-Grade Backend with Drizzle ORM

A TypeScript-based Express authentication and user management backend featuring a modern service-oriented architecture with comprehensive security practices.

## Project Overview

This backend application implements a complete authentication system with email verification, password reset functionality, and token-based access control. The architecture follows clean code principles with clear separation of concerns through DTOs, services, controllers, and middleware layers.

## Project Structure

```
d:/production-grade/backend-drizzle/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── controller.ts          # HTTP request handlers
│   │   │   ├── services.ts            # Business logic layer
│   │   │   ├── models.ts              # DTO definitions
│   │   │   ├── routes.ts              # Route definitions
│   │   │   ├── utils/
│   │   │   │   ├── index.ts           # Password hashing and token generation
│   │   │   │   └── mail.ts            # Email sending utilities
│   │   │   └── utils/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts     # Token validation and DTO validation
│   │   │   └── error.middleware.ts    # Global error handling
│   │   └── index.ts                   # App initialization
│   ├── config/
│   │   └── env.ts                     # Environment configuration
│   ├── db/
│   │   ├── index.ts                   # Database connection
│   │   └── schema.ts                  # Database schema definition
│   ├── dto/
│   │   └── base.dto.ts                # Base DTO class
│   ├── types/
│   │   └── express/
│   │       └── index.d.ts             # Express type extensions
│   ├── utils/
│   │   ├── api-error.ts               # Custom error class
│   │   ├── api-response.ts            # Standardized response class
│   │   └── index.ts                   # Main application entry point
│   └── index.ts
├── drizzle/                           # Database migrations
│   ├── meta/                          # Migration metadata
│   └── *.sql                          # Migration files
├── docker-compose.yml                 # Database services
├── drizzle.config.js                  # Drizzle configuration
├── package.json                       # Project dependencies
├── pnpm-lock.yaml                     # Dependency lock file
└── tsconfig.json                      # TypeScript configuration
```

## Installation

### Prerequisites

Ensure you have the following installed:
- Node.js version 18 or higher
- pnpm version 10.12.1 or higher
- PostgreSQL 15+
- Docker and Docker Compose (optional, for database)

### Clone the Repository

```bash
git clone https://github.com/yourusername/backend-drizzle.git
cd backend-drizzle
```

### Install Dependencies using pnpm

pnpm is a fast, disk space efficient package manager. Install dependencies with:

```bash
pnpm install
```

This command will:
- Read dependencies from package.json
- Create a lockfile (pnpm-lock.yaml) for reproducible installs
- Install all packages in node_modules with efficient linking

### Environment Configuration

A .env.sample file is provided as a template. Create your .env file by copying and customizing it:

```bash
cp .env.sample .env
```

Then edit the .env file with your actual configuration values:

```env
# Database Configuration
# Example: postgresql://username:password@localhost:5432/backend_drizzle
DATABASE_URL=postgresql://username:password@localhost:5432/backend_drizzle

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secrets
# Generate strong random strings using: openssl rand -base64 32
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key

# Base URL
# Used in email links for verification and password reset
BASE_URL=http://localhost:3000

# Email Configuration
# Get API key from https://resend.com
RESEND_API_KEY=your-resend-api-key
```

Key considerations:
- DATABASE_URL: Ensure PostgreSQL credentials match your setup
- ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET: Generate strong random strings
- BASE_URL: Must match your frontend domain (important for email links)
- RESEND_API_KEY: Optional until you enable email features

### Database Setup

#### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This starts a PostgreSQL database container with the configured credentials.

#### Using Existing PostgreSQL

Update the DATABASE_URL in your .env file with your PostgreSQL connection string.

### Run Database Migrations

```bash
pnpm run db:generate
pnpm run db:migrate
```

## Available Commands

```bash
# Development with auto-reload
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start

# Generate new database migration
pnpm run db:generate

# Apply pending database migrations
pnpm run db:migrate

# Open Drizzle Studio (database GUI)
pnpm run studio
```

## Architecture & Design Patterns

### Controller-Service-Repository Pattern

The application follows a layered architecture:

1. Routes/Controllers: Handle HTTP requests and responses
2. Services: Contain all business logic
3. Database Layer: Handle data persistence

This separation ensures:
- Controllers are thin and focused on HTTP concerns
- Services are reusable and testable
- Business logic is decoupled from HTTP framework
- Easy to test each layer independently

### Data Transfer Objects (DTO) Pattern

DTOs are used for request validation and data transformation:

```typescript
export class SignUpDto extends BaseDto {
  static schema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().nullable().optional(),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  });
}
```

Benefits of using DTOs:

1. Type Safety: Full TypeScript support for input validation
2. Single Source of Truth: Schema defined once, used for validation and type inference
3. Validation: Centralized validation rules with descriptive error messages
4. Documentation: DTOs serve as API contract documentation
5. Separation of Concerns: Input validation is separate from business logic
6. Reusability: DTOs can be composed and extended
7. Testing: Easy to create test data matching the schema

The validate middleware automatically validates incoming requests against the DTO schema before reaching the controller.

## Authentication Architecture

### Token-Based Authentication with Cookies

This application uses a dual-token approach stored in HTTP-only cookies:

#### Why Cookies Over LocalStorage?

1. Security: HTTP-Only cookies cannot be accessed by JavaScript, preventing XSS attacks
2. Automatic Transmission: Cookies are sent automatically with every request, no manual header management needed
3. CSRF Protection: With proper SameSite attributes, automatically protected against CSRF
4. Native Browser Feature: Better support for expiration and domain restrictions

#### Access Token vs Refresh Token

Access Token:
- Short-lived (5 minutes)
- Used for API requests authorization
- Contains user ID in JWT payload
- Stored in httpOnly cookie with sameSite="lax"

Refresh Token:
- Long-lived (24 hours)
- Used only for obtaining new access tokens
- Validated against database for revocation capability
- Stored in httpOnly cookie with sameSite="lax"

### Token Flow

1. User signs in with email and password
2. Backend validates credentials and generates both tokens
3. Tokens stored in httpOnly, secure, sameSite cookies
4. Frontend makes subsequent requests with cookies automatically included
5. Auth middleware validates accessToken on protected routes
6. When accessToken expires, frontend calls refresh endpoint
7. Backend validates refreshToken and issues new accessToken

### Why sameSite="lax" Instead of Strict?

The application uses sameSite="lax" instead of sameSite="strict" because:

1. Cross-Site Form Submissions: The lax setting allows form submissions from external sites (e.g., clicking a link on Gmail that leads to your app). strict would block these legitimate use cases.

2. No POST Requests on Other Pages: Since this application does not make POST requests on other domains (no external API calls that send cookies), the lax setting is safe.

3. URL-Based Tokens: When users click email verification links in emails or reset password links, these are GET requests. The lax setting allows these to work properly.

4. User Experience: Some legitimate cross-site navigations work better with lax (like deep links in emails or shared links).

5. Security Trade-off: While strict is more restrictive, lax provides sufficient protection against CSRF attacks for this use case without sacrificing usability. The attack vector would require:
   - User to be authenticated on the site
   - User to click a malicious link on another site
   - That link to perform an action (which our API only allows via GET for read-only operations)

### Cookie Security Attributes

All authentication cookies include:

```typescript
const cookieOptions: CookieOptions = {
  httpOnly: true,      // Cannot be accessed by JavaScript - prevents XSS
  secure: true,        // Only sent over HTTPS - prevents MITM attacks
  sameSite: "lax",     // Prevents CSRF attacks with reasonable UX
  path: "/",           // Available across entire application
};
```

### Why This Approach Works Perfectly Here

1. No External API Calls: Since no POST requests are made to external domains, there's no risk of accidentally sending cookies to unauthorized services.

2. Email-Based Verification: Email verification and password reset links use GET requests with tokens in the URL path:
   - GET /verify/email/:token
   - POST /forgot-password/:token (body contains new password)

3. Same-Origin Requests: All API calls are to the same domain, so cookies are always sent automatically.

4. No Manual Header Management: Unlike Authorization headers, cookies don't require manual JavaScript code to attach to requests.

5. Built-in Expiration: Cookie maxAge ensures tokens expire automatically without client-side logic.

6. Database Validation: RefreshToken is validated against the database, allowing immediate invalidation (revocation) even before expiration.

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/signup
Register a new user with email verification.

Request:
```json
{
  "firstName": "Saurav",
  "lastName": "Jha",
  "email": "srvjha123@gmail.com",
  "password": "securepassword123"
}
```

Response (201 Created):
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User created successfully. Please Check your mail and verify.",
  "data": {
    "id": "user-uuid"
  }
}
```

#### GET /api/auth/verify/email/:token
Verify user email with token from email link.

Response (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User verified Successfully"
}
```

#### POST /api/auth/signin
Authenticate user and set authentication cookies.

Request:
```json
{
  "email": "srvjha123@gmail.com",
  "password": "securepassword123"
}
```

Response (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User Logged in Succesfully"
}
```

Sets accessToken and refreshToken in httpOnly cookies.

#### GET /api/auth/me
Get authenticated user profile. Requires valid accessToken cookie.

Response (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User fetched successfully",
  "data": {
    "firstName": "Saurav",
    "lastName": "Jha",
    "email": "srvjha123@gmail.com",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/auth/signout
Sign out user and clear authentication cookies. Requires valid accessToken cookie.

Response (204 No Content):
Cookies are cleared, no response body.

#### GET /api/auth/refresh/token
Refresh expired accessToken using refreshToken. Automatically included in request via cookies.

Response (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tokens refreshed successfully"
}
```

New tokens are set in cookies.

#### POST /api/auth/resend/email
Resend email verification link to user.

Request:
```json
{
  "email": "srvjha123@gmail.com"
}
```

Response (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Verification link sent successfully. Check Inbox"
}
```

#### POST /api/auth/forgot-password
Initiate password reset flow.

Request:
```json
{
  "email": "srvjha123@gmail.com"
}
```

Response (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reset password link sent successfully. Check Inbox"
}
```

#### POST /api/auth/forgot-password/:token
Reset password using token from email link.

Request:
```json
{
  "newPassword": "newsecurepassword123"
}
```

Response (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully"
}
```

#### POST /api/auth/change-password
Change password for authenticated user. Requires valid accessToken cookie.

Request:
```json
{
  "oldPassword": "currentpassword123",
  "newPassword": "newpassword123",
  "confirmNewPassword": "newpassword123"
}
```

Response (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password changed successfully"
}
```

## Middleware

### Authentication Middleware (auth.middleware.ts)

Two main functions:

1. validate(DtoClass, source): Validates request data against DTO schema
   - source can be "body" (default), "params", or "query"
   - Returns 400 Bad Request if validation fails

2. restrictToAuthenticatedUser(): Protects routes requiring authentication
   - Extracts and verifies accessToken from cookies
   - Attaches user payload to req.user
   - Returns 401 Unauthorized if token invalid or missing

### Error Middleware (error.middleware.ts)

Global error handler that:
- Catches all thrown errors
- Converts errors to standardized ApiError responses
- Returns appropriate HTTP status codes
- Prevents server crashes from unhandled errors

## Service Layer

The services layer (AuthenticationService) encapsulates all business logic:

1. User Registration: Create account with hashed password and email verification
2. Email Verification: Validate and mark email as verified
3. User Login: Authenticate credentials and generate tokens
4. Token Refresh: Validate refresh token and issue new access token
5. Password Management: Handle forgotten and changing passwords
6. Session Management: Sign out and revoke tokens

Services handle all database operations and business rules, making controllers simple HTTP handlers.

## Security Practices

### Password Security

- Passwords hashed using PBKDF2 with unique salt per user
- Original password never stored in database
- Salt stored with hash for verification
- Minimum 8 character requirement

### Token Security

- JWT tokens signed with strong secrets
- Short access token lifetime (5 minutes) limits exposure
- Refresh token validated against database for revocation
- Tokens stored in httpOnly cookies preventing XSS access

### Email Verification

- Tokens expire automatically after 24 hours
- Tokens hashed before storage in database
- Verification link can only be used once
- Error messages distinguish between invalid and expired tokens

### CSRF Protection

- sameSite cookie attribute prevents cross-site requests
- No sensitive operations via GET requests
- All state-changing operations require POST/PUT/DELETE

### Input Validation

- All inputs validated via Zod schemas in DTOs
- Type-safe validation with helpful error messages
- Invalid inputs rejected before reaching business logic

## Development Workflow

1. Start development server: pnpm run dev
2. Server runs on http://localhost:3000
3. Auto-reloads on file changes
4. Type checking enforced via TypeScript compiler

## Production Deployment

1. Build application: pnpm run build
2. Compiles TypeScript to JavaScript in dist/ folder
3. Start with: pnpm start
4. Ensure environment variables are properly configured
5. Use a process manager like PM2 for process management
6. Set NODE_ENV=production for optimization

## Dependencies Overview

- express: Web framework for REST API
- TypeScript: Type-safe JavaScript
- jsonwebtoken: JWT token generation and verification
- zod: Schema validation library
- drizzle-orm: Type-safe ORM for database
- pg: PostgreSQL client
- cookie-parser: Parse HTTP cookies
- resend: Email service for notifications
- dotenv: Environment variable management

## Common Issues and Solutions

### Tokens Not Being Set
Ensure cookies are being sent with secure: true only in HTTPS environments. In development, set secure: false for localhost.

### Email Verification Link Not Working
Check EMAIL_VERIFICATION_URL environment variable matches your frontend domain.

### Token Validation Fails
Verify JWT_SECRET environment variables match between signing and verification. Check token hasn't expired.

### Database Connection Error
Verify DATABASE_URL is correctly formatted and PostgreSQL is running. Check network connectivity.


