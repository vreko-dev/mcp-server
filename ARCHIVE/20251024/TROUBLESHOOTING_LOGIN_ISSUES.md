# Troubleshooting Login Issues with Better Auth

## Common Causes of Login Failures

1. **Database Connection Issues**

    - SSL configuration problems
    - Incorrect database credentials
    - Network connectivity issues

2. **Session Management Problems**

    - Cookie configuration issues
    - Session storage problems
    - CSRF protection conflicts

3. **Authentication Flow Errors**
    - Misconfigured OAuth providers
    - Missing environment variables
    - Plugin configuration issues

## Diagnostic Steps

### 1. Check Database Connection

Run the database test script:

```bash
pnpm test:auth
```

Look for:

-   Database connection status: true
-   Simple query successful message

### 2. Verify Environment Variables

Check that all required environment variables are set in `.env.local`:

-   `DATABASE_URL` - Should point to your PostgreSQL database
-   `SUPABASE_URL` - Your Supabase project URL
-   `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
-   OAuth credentials for Google and GitHub

### 3. Check Authentication Logs

Look for authentication-related logs in your console output:

-   "Authentication attempt started"
-   "Authentication attempt completed"
-   Any error messages

### 4. Test Registration vs Login

Since registration works but login fails:

-   The database connection is likely working for writes but may have issues with reads
-   Session creation might be failing
-   Cookie settings might be incorrect

## Potential Fixes

### 1. Database SSL Configuration

Ensure your database URL includes the correct SSL mode:

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres?sslmode=require"
```

### 2. Cookie Configuration

Check the cookie settings in your auth configuration:

-   In development, `secure` should be false
-   `sameSite` should be "lax" for most cases

### 3. Session Configuration

Verify session settings:

-   `expiresIn` - Session duration
-   `freshAge` - How long a session is considered "fresh"

### 4. OAuth Provider Configuration

Ensure your OAuth providers are correctly configured:

-   Client IDs and secrets are correct
-   Redirect URIs are properly set up
-   Scopes are appropriate

## Debugging Commands

Run the authentication test suite:

```bash
pnpm test:auth
```

Check for specific error messages in your application logs when attempting to log in.

## Additional Resources

-   Better Auth documentation: https://www.better-auth.com/
-   Supabase integration guide
-   PostgreSQL connection troubleshooting
