# Cloudflare R2 Setup Guide

This guide will help you set up Cloudflare R2 as your file storage solution (replacing AWS S3).

## Why Cloudflare R2?

- ✅ **10 GB free storage** per month
- ✅ **Zero egress fees** (unlimited free bandwidth)
- ✅ **S3-compatible API** (minimal code changes)
- ✅ **Built-in CDN** (no need for CloudFront)
- ✅ **Fast global delivery**

## Setup Steps

### 1. Create a Cloudflare Account

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Sign up or log in to your account

### 2. Create an R2 Bucket

1. In the Cloudflare dashboard, navigate to **R2** in the left sidebar
2. Click **Create bucket**
3. Enter a bucket name (e.g., `syncscript-files`)
4. Click **Create bucket**

### 3. Enable Public Access (Optional but Recommended)

1. Go to your bucket settings
2. Click on **Settings** tab
3. Under **Public access**, click **Allow Access**
4. You'll get a public URL like: `https://pub-xxxxx.r2.dev`
5. Copy this URL - you'll need it for `R2_PUBLIC_URL`

**Alternative:** Set up a custom domain:
- Go to **Settings** → **Custom Domains**
- Add your domain (e.g., `files.yourdomain.com`)
- Follow DNS setup instructions

### 4. Create API Tokens

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Give it a name (e.g., `SyncScript API Token`)
4. Set permissions:
   - **Object Read & Write** (for uploading/deleting files)
5. Click **Create API Token**
6. **Important:** Copy the credentials shown:
   - Access Key ID
   - Secret Access Key
   - Account ID (also visible in the URL)

### 5. Update Your .env File

Replace the AWS S3 configuration with R2 configuration:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_BUCKET_NAME=syncscript-files
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Where to find these values:**
- `R2_ACCOUNT_ID`: In your Cloudflare dashboard URL or when creating API token
- `R2_BUCKET_NAME`: The name you chose when creating the bucket
- `R2_ACCESS_KEY_ID`: From the API token creation step
- `R2_SECRET_ACCESS_KEY`: From the API token creation step
- `R2_PUBLIC_URL`: From bucket settings → Public access (or your custom domain)

### 6. Remove Old AWS Dependencies (Optional)

Since we no longer use CloudFront, you can optionally remove it:

```bash
npm uninstall @aws-sdk/client-cloudfront
```

**Note:** We still use `@aws-sdk/client-s3` because R2 is S3-compatible!

### 7. Test Your Setup

1. Start your server:
   ```bash
   npm run start:dev
   ```

2. Try uploading a file through your API
3. Check if the file appears in your R2 bucket dashboard
4. Verify the public URL works

## Migration from S3 to R2

If you have existing files in S3, you have two options:

### Option 1: Manual Migration (Small datasets)
1. Download files from S3
2. Upload them to R2 using the dashboard or API

### Option 2: Automated Migration (Large datasets)
Use tools like:
- [rclone](https://rclone.org/) - supports both S3 and R2
- AWS CLI + R2 API

Example with rclone:
```bash
rclone copy s3:your-s3-bucket r2:your-r2-bucket
```

### Option 3: Dual Write (Gradual migration)
- Keep both S3 and R2 temporarily
- Write new files to R2
- Migrate old files gradually
- Update database URLs as you migrate

## Troubleshooting

### Error: "Missing required environment variables"
- Double-check all R2_* variables are set in .env
- Restart your server after updating .env

### Error: "Access Denied"
- Verify your API token has Read & Write permissions
- Check that the bucket name matches exactly

### Files upload but can't be accessed
- Ensure public access is enabled on your bucket
- Verify R2_PUBLIC_URL is correct

### CORS Issues
If accessing files from browser:
1. Go to bucket **Settings** → **CORS Policy**
2. Add CORS rules:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Cost Comparison

### AWS S3 (Previous)
- Storage: ~$0.023/GB/month
- Egress: $0.09/GB (first 10TB)
- CloudFront: Additional costs

### Cloudflare R2 (Current)
- Storage: **FREE** up to 10GB, then $0.015/GB/month
- Egress: **FREE** (unlimited)
- CDN: **FREE** (built-in)

**Estimated savings:** $10-50/month for typical usage

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [S3 Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
