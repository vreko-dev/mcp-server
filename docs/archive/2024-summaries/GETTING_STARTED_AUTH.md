# Getting Started with Authentication

This document explains how to set up and use the authentication system in SnapBack.

## Prerequisites

1. Node.js >= 20
2. PostgreSQL (local or Supabase)
3. pnpm package manager

## Quick Setup

1. **Install dependencies**:

    ```bash
    pnpm install
    ```

2. **Set up environment variables**:
   Copy `.env.local.example` to `.env.local` and configure the required variables:

    ```bash
    cp .env.local.example .env.local
    ```

3. **Start PostgreSQL** (if using local database):

    ```bash
    brew services start postgresql@14
    ```

4. **Create database and user**:

    ```bash
    createdb snapback_dev
    psql snapback_dev -c "CREATE USER snapback WITH PASSWORD 'dev_password'; GRANT ALL PRIVILEGES ON DATABASE snapback_dev TO snapback;"
    ```

5. **Start the development server**:

    ```bash
    pnpm dev
    ```

6. **Access the application**:
   Open your browser to `http://localhost:3005` (or the port shown in the terminal)

## Authentication Flow

### 1. User Signup

-   Navigate to `/auth/signup`
-   Fill in name, email, and password
-   Click "Sign Up"
-   If email verification is enabled, check your email for verification link

### 2. User Login

-   Navigate to `/auth/login`
-   Enter email and password
-   Click "Sign In"

### 3. Dashboard Access

-   After successful login, you'll be redirected to `/app/dashboard`
-   The dashboard requires authentication and will redirect to login if not authenticated

## OAuth Providers

To enable Google or GitHub login:

1. Create OAuth applications in the respective developer consoles
2. Add the client IDs and secrets to your `.env.local`:
    ```
    GITHUB_CLIENT_ID="your_github_client_id"
    GITHUB_CLIENT_SECRET="your_github_client_secret"
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"
    ```

## Supabase Integration

To use Supabase instead of local PostgreSQL:

1. Create a Supabase project at https://app.supabase.com/
2. Get your project URL and keys from the API settings
3. Add the credentials to your `.env.local`:
    ```
    NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
    SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
    ```

## Testing

To run authentication tests:

```bash
cd packages/auth
DATABASE_URL="postgresql://snapback:dev_password@localhost:5432/snapback_dev?schema=public&sslmode=disable" \
BETTER_AUTH_SECRET="your-super-secret-auth-key-min-32-chars" \
NEXT_PUBLIC_SUPABASE_URL="https://test.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="test-anon-key" \
SUPABASE_SERVICE_ROLE_KEY="test-service-key" \
npx vitest run
```

## Troubleshooting

### Database Connection Issues

-   Ensure PostgreSQL is running: `brew services start postgresql@14`
-   Verify database credentials in `.env.local`
-   Check that the `snapback` user and `snapback_dev` database exist

### Authentication Issues

-   Verify `BETTER_AUTH_SECRET` is at least 32 characters long
-   Check browser console for client-side errors
-   Ensure cookies are enabled in your browser

### OAuth Issues

-   Verify client IDs and secrets are correct
-   Ensure redirect URLs are configured in the OAuth provider settings
-   Check the application logs for error messages

## Security Notes

-   Never commit `.env.local` to version control
-   Use strong, unique passwords for production
-   Rotate secrets regularly
-   Enable two-factor authentication for admin accounts
-   Monitor authentication logs for suspicious activity
