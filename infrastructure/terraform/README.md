# SnapBack Cloud Infrastructure

This directory contains Terraform configurations for SnapBack's cloud infrastructure.

## Components

1. **S3 Bucket** - For storing encrypted snapshots
2. **CloudFront CDN** - For fast global access to snapshots
3. **Security Policies** - CORS, lifecycle management, access controls

## Prerequisites

1. AWS CLI installed and configured
2. Terraform installed (v1.0+)
3. Appropriate AWS credentials

## Setup

1. Initialize Terraform:
   ```bash
   terraform init
   ```

2. Create a terraform.tfvars file with your environment variables:
   ```hcl
   environment = "dev"
   aws_region  = "us-east-1"
   ```

3. Plan the infrastructure:
   ```bash
   terraform plan
   ```

4. Apply the infrastructure:
   ```bash
   terraform apply
   ```

## Configuration Details

### S3 Bucket
- Bucket name: `snapback-snapshots-${environment}`
- Versioning enabled for data protection
- CORS configured for web and VS Code extension access
- Lifecycle policy:
  - Transition to Glacier after 90 days
  - Expire after 365 days

### CloudFront CDN
- Connected to S3 bucket
- HTTPS redirect enforced
- Caching configured (1 hour default, 24 hour max)
- Global distribution for low-latency access

## Security

- Origin Access Identity (OAI) for secure S3 access
- CORS restricted to SnapBack domains
- No public read access to bucket objects
