# How to Access the Dashboard

## Prerequisites

1. Make sure you've run the seed script to create test data
2. Ensure the development server is running

## Steps to Access

### 1. Start the Development Server

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
npm run dev
```

### 2. Open Your Browser

Navigate to: http://localhost:3000/app/dashboard

### 3. Log In

Use the test credentials:

-   Email: `dashboard@example.com`
-   Password: Set this through the app interface

If you haven't set a password yet:

1. Go to http://localhost:3000/auth/login
2. Click "Forgot Password"
3. Enter: `dashboard@example.com`
4. Check the console output for the password reset link

### 4. View Dashboard

After logging in, you'll be redirected to the dashboard page which will display:

-   User metrics (snapshots, recoveries, files protected, AI detection rate)
-   AI tool detection statistics
-   Recent activity feed

## Troubleshooting

### Database Connection Issues

If you see database errors:

1. Verify your `.env.local` file has the correct DATABASE_URL
2. Make sure the database service is running
3. Run the seed script again if needed:
    ```bash
    cd packages/database
    npm run seed:dev
    ```

### Missing Data

If dashboard shows no data:

1. Verify the seed script ran successfully
2. Check that the test user exists in the database
3. Confirm snapshots and other data were created

## Development Notes

The dashboard is implemented as a server component for better performance. Data fetching happens on the server side before the page is rendered.

Key files:

-   `apps/web/app/(saas)/app/dashboard/page.tsx` - Main dashboard page
-   `apps/web/lib/dashboard/metrics.ts` - Data fetching functions
