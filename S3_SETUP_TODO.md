# S3 Setup Instructions for Image Uploads

This document provides step-by-step instructions for setting up S3 (or S3-compatible) storage for image uploads in the SnapBack application.

## Current Status

The application currently has empty S3 configuration in the environment variables:

```env
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_ENDPOINT=""
S3_REGION=""
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

## Option 1: AWS S3 Setup (Recommended for Production)

### 1. Create AWS Account

-   Go to [AWS Console](https://aws.amazon.com/console/)
-   Sign up for a new account or sign in to your existing account

### 2. Create S3 Bucket

1. Navigate to S3 service in AWS Console
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `snapback-avatars-production`)
4. Select your preferred region
5. Keep default settings for now (you can adjust permissions later)
6. Click "Create bucket"

### 3. Create IAM User for S3 Access

1. Navigate to IAM service in AWS Console
2. Click "Users" in the left sidebar
3. Click "Add user"
4. Enter username (e.g., `snapback-s3-user`)
5. Select "Access key - Programmatic access" as the access type
6. Click "Next: Permissions"
7. Click "Attach existing policies directly"
8. Search for and select `AmazonS3FullAccess` (or create a custom policy with more restrictive permissions)
9. Click "Next: Tags" (optional)
10. Click "Next: Review"
11. Click "Create user"
12. Save the Access Key ID and Secret Access Key (you'll only see this once)

### 4. Configure Bucket Permissions (Optional but Recommended)

1. Go back to your S3 bucket
2. Click the "Permissions" tab
3. Edit the Bucket Policy to restrict access:

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "AllowUserToListAndWrite",
			"Effect": "Allow",
			"Principal": {
				"AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/snapback-s3-user"
			},
			"Action": [
				"s3:PutObject",
				"s3:PutObjectAcl",
				"s3:GetObject",
				"s3:DeleteObject"
			],
			"Resource": "arn:aws:s3:::snapback-avatars-production/*"
		}
	]
}
```

### 5. Update Environment Variables

Add the following to your `.env.local` file:

```env
S3_ACCESS_KEY_ID="your-access-key-id"
S3_SECRET_ACCESS_KEY="your-secret-access-key"
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="us-east-1"  # or your preferred region
NEXT_PUBLIC_AVATARS_BUCKET_NAME="snapback-avatars-production"
```

## Option 2: Supabase Storage Setup (Easier for Development)

### 1. Create Storage Bucket in Supabase

1. Go to your Supabase project dashboard
2. Navigate to Storage > Buckets
3. Click "New bucket"
4. Name it "avatars" (to match the existing configuration)
5. Set it as public if needed for avatar images

### 2. Update Environment Variables

Update the following in your `.env.local` file:

```env
S3_ACCESS_KEY_ID="your-supabase-service-role-key"
S3_SECRET_ACCESS_KEY="your-supabase-service-role-key"
S3_ENDPOINT="https://your-project-id.supabase.co/storage/v1"  # Replace with your Supabase project URL
S3_REGION="auto"
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

Note: You may need to modify the avatar upload code to work with Supabase Storage API instead of S3 API.

## Option 3: Local Development with MinIO (Docker)

### 1. Run MinIO Container

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  quay.io/minio/minio server /data --console-address ":9001"
```

### 2. Create Bucket

1. Visit http://localhost:9001
2. Log in with username/password: `minioadmin`/`minioadmin`
3. Create a bucket named "avatars"

### 3. Update Environment Variables

```env
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

## Testing the Setup

After configuring your S3 credentials:

1. Restart your development server
2. Try uploading an avatar image again
3. Check the browser console and server logs for any errors

## Troubleshooting

### Common Issues:

1. **Access Denied**: Check IAM permissions and bucket policies
2. **Endpoint Resolution**: Ensure S3_ENDPOINT is correct for your region
3. **CORS Issues**: Configure CORS settings on your S3 bucket if accessing from browser

### CORS Configuration for S3 Bucket:

```json
[
	{
		"AllowedHeaders": ["*"],
		"AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
		"AllowedOrigins": ["*"],
		"ExposeHeaders": []
	}
]
```

## Security Considerations

1. Never commit real credentials to version control
2. Use environment variables for all secrets
3. Restrict IAM permissions to only what's needed
4. Consider using temporary credentials with AWS STS for production
5. Enable S3 bucket logging for audit trails

## Future Improvements

-   [ ] Implement signed URLs for secure image uploads
-   [ ] Add image resizing and optimization
-   [ ] Implement backup strategy for stored images
-   [ ] Add support for multiple storage backends (S3, GCS, Azure)
