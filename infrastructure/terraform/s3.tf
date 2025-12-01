resource "aws_s3_bucket" "snapback_snapshots" {
  bucket = "snapback-snapshots-${var.environment}"

  tags = {
    Name        = "SnapBack Snapshots"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "snapback_snapshots" {
  bucket = aws_s3_bucket.snapback_snapshots.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "snapback_snapshots" {
  bucket = aws_s3_bucket.snapback_snapshots.id

  cors_rule {
    allowed_origins = ["https://snapback.dev", "https://*.snapback.dev", "vscode-webview://*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "snapback_snapshots" {
  bucket = aws_s3_bucket.snapback_snapshots.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

resource "aws_cloudfront_distribution" "snapback_cdn" {
  origin {
    domain_name = aws_s3_bucket.snapback_snapshots.bucket_regional_domain_name
    origin_id   = "S3-snapback-snapshots"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.snapback.cloudfront_access_identity_path
    }
  }

  enabled = true
  comment = "SnapBack Snapshots CDN"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-snapback-snapshots"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_cloudfront_origin_access_identity" "snapback" {
  comment = "OAI for SnapBack CloudFront to access S3"
}

output "cdn_url" {
  value = aws_cloudfront_distribution.snapback_cdn.domain_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.snapback_snapshots.bucket
}
