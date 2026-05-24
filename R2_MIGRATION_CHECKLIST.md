# Cloudflare R2 Migration Checklist

Use this checklist to ensure a smooth migration from AWS S3 to Cloudflare R2.

## Pre-Migration

- [ ] Read `CLOUDFLARE_R2_SETUP.md` for detailed instructions
- [ ] Review `MIGRATION_SUMMARY.md` to understand changes
- [ ] Backup your current `.env` file
- [ ] Note down any existing S3 files that need migration

## Cloudflare Setup

- [ ] Create/login to Cloudflare account
- [ ] Navigate to R2 section
- [ ] Create a new R2 bucket
- [ ] Enable public access on the bucket (or set up custom domain)
- [ ] Copy the public URL (e.g., `https://pub-xxxxx.r2.dev`)
- [ ] Create R2 API token with Read & Write permissions
- [ ] Save the following credentials:
  - [ ] Account ID
  - [ ] Access Key ID
  - [ ] Secret Access Key

## Code Configuration

- [ ] Update `.env` file with R2 credentials:
  ```env
  R2_ACCOUNT_ID=your_account_id
  R2_BUCKET_NAME=your_bucket_name
  R2_ACCESS_KEY_ID=your_access_key
  R2_SECRET_ACCESS_KEY=your_secret_key
  R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
  ```
- [ ] Remove old AWS S3 environment variables
- [ ] Verify all R2_* variables are set correctly

## Testing

- [ ] Start the development server:
  ```bash
  cd server
  npm run start:dev
  ```
- [ ] Check for any startup errors
- [ ] Test file upload through your API
- [ ] Verify file appears in R2 dashboard
- [ ] Test file access via public URL
- [ ] Test file deletion
- [ ] Verify deleted file is removed from R2

## Data Migration (if applicable)

Choose one option:

### Option A: No existing files
- [ ] Skip this section - you're done! 🎉

### Option B: Small dataset (manual)
- [ ] Download files from S3
- [ ] Upload to R2 via dashboard or API
- [ ] Update database URLs if needed

### Option C: Large dataset (automated)
- [ ] Install rclone or similar tool
- [ ] Configure both S3 and R2 endpoints
- [ ] Run migration script
- [ ] Verify file count matches
- [ ] Update database URLs

## Production Deployment

- [ ] Set R2 environment variables in production environment
- [ ] Deploy updated code
- [ ] Monitor logs for errors
- [ ] Test file upload in production
- [ ] Test file access in production
- [ ] Monitor R2 dashboard for activity

## Post-Migration

- [ ] Verify all file operations work correctly
- [ ] Check R2 usage in Cloudflare dashboard
- [ ] Update documentation/README if needed
- [ ] Consider setting up CORS if accessing from browser
- [ ] (Optional) Set up custom domain for cleaner URLs
- [ ] (Optional) Delete old S3 bucket after confirming everything works

## Rollback (if needed)

If something goes wrong:

- [ ] Restore old `.env` file
- [ ] Reinstall CloudFront SDK: `npm install @aws-sdk/client-cloudfront`
- [ ] Revert `storage.service.ts` from git
- [ ] Restart server

## Cost Monitoring

- [ ] Check Cloudflare R2 usage dashboard
- [ ] Verify you're within free tier (10GB storage)
- [ ] Set up billing alerts if needed
- [ ] (Optional) Cancel AWS S3 after successful migration

## Troubleshooting

If you encounter issues:

1. **Server won't start:**
   - Check all R2_* env variables are set
   - Verify no typos in variable names
   - Check server logs for specific error

2. **Upload fails:**
   - Verify API token has Write permissions
   - Check bucket name is correct
   - Ensure account ID is correct

3. **Can't access files:**
   - Verify public access is enabled
   - Check R2_PUBLIC_URL is correct
   - Test URL directly in browser

4. **CORS errors:**
   - Add CORS policy in R2 bucket settings
   - See `CLOUDFLARE_R2_SETUP.md` for CORS config

## Resources

- 📖 [Cloudflare R2 Setup Guide](./CLOUDFLARE_R2_SETUP.md)
- 📋 [Migration Summary](./MIGRATION_SUMMARY.md)
- 🔗 [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- 💰 [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)

---

**Estimated Time:** 15-30 minutes (excluding data migration)

**Difficulty:** Easy (R2 is S3-compatible!)

**Cost Savings:** ~$10-50/month
