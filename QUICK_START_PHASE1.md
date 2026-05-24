# 🚀 Quick Start: Testing Phase 1

## Prerequisites
- Server running: `npm run start:dev`
- Valid auth token
- A PDF file to test with

## Test 1: Upload PDF and Extract Text

### Request
```bash
curl -X POST http://localhost:3000/vault/{VAULT_ID}/source \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -F "file=@test-paper.pdf" \
  -F "title=Test Research Paper"
```

### Expected Response
```json
{
  "success": true,
  "message": "Source created and file uploaded successfully",
  "data": {
    "id": "uuid-here",
    "title": "Test Research Paper",
    "sourceType": "PDF",
    "extractedText": "Abstract\n\nThis paper presents...",
    "extractedMetadata": {
      "title": "Original PDF Title",
      "author": "John Doe",
      "pages": 12,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "subject": "Research",
      "producer": "LaTeX"
    },
    "textExtractedAt": "2024-01-15T10:30:00.000Z",
    "file": {
      "id": "file-uuid",
      "fileName": "test-paper.pdf",
      "fileUrl": "https://...",
      "pageCount": 12
    }
  }
}
```

### What to Check
✅ `extractedText` is populated with PDF content  
✅ `extractedMetadata` contains PDF info  
✅ `textExtractedAt` has a timestamp  
✅ `file.pageCount` matches PDF pages  

## Test 2: Get Source with Extracted Text

### Request
```bash
curl -X GET http://localhost:3000/vault/{VAULT_ID}/source/{SOURCE_ID} \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

### Expected Response
Same as above - extracted text is persisted in database.

## Test 3: Check Logs

### Look for These Log Messages
```
[DocumentExtractionService] Extracting text from application/pdf document
[DocumentExtractionService] Successfully extracted 7500 words from document
[SourceService] Successfully extracted 7500 words from document
```

### If Extraction Fails (Non-Critical)
```
[SourceService] Document text extraction failed: ...
```
Source is still created, just without `extractedText`.

## Test 4: Database Verification

### Check Extracted Text
```sql
SELECT 
  id,
  title,
  LENGTH(extracted_text) as text_length,
  (extracted_metadata->>'pages')::int as pages,
  (extracted_metadata->>'author') as author,
  text_extracted_at
FROM "Source"
WHERE extracted_text IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

### Expected Output
```
id                  | title              | text_length | pages | author   | text_extracted_at
--------------------|--------------------| ------------|-------|----------|-------------------
uuid-1              | Test Paper         | 45000       | 12    | John Doe | 2024-01-15 10:30
```

## Test 5: Test Markdown Enhancement (Existing Feature)

### Request
```bash
curl -X POST http://localhost:3000/vault/{VAULT_ID}/source/{SOURCE_ID}/annotation/enhance \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "contentMarkdown": "this is a test note about the paper findings"
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Annotation content enhanced successfully",
  "data": {
    "enhancedMarkdown": "## Key Findings\n\nThis is a test note about the paper findings.\n\n- Well-structured\n- Clear and concise"
  }
}
```

### What to Check
✅ AI module is working  
✅ Markdown is enhanced  
✅ No errors about missing Gemini service  

## Common Issues & Solutions

### Issue: `extractedText` is null
**Cause**: PDF extraction failed  
**Solution**: Check logs for error message. File might be:
- Scanned image (no text layer)
- Encrypted/password protected
- Corrupted

**Fix**: Upload a different PDF or add OCR support later.

### Issue: Build fails with pdf-parse error
**Cause**: Import syntax issue  
**Solution**: Already fixed - using `import pdfParse from 'pdf-parse'`

### Issue: "AI service is not configured"
**Cause**: Missing `GEMINI_API_KEY` in `.env`  
**Solution**: Add to `server/.env`:
```env
GEMINI_API_KEY=your-api-key-here
```

### Issue: Prisma client errors
**Cause**: Schema changed but client not regenerated  
**Solution**:
```bash
cd server
npx prisma generate
```

## Environment Variables

### Required
```env
# Existing
DATABASE_URL=postgresql://...
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=...

# For AI features
GEMINI_API_KEY=your-gemini-api-key
```

### Optional
None for Phase 1.

## File Structure Quick Reference

```
server/src/
├── ai/                          # AI services (Gemini)
│   ├── services/
│   │   ├── gemini.service.ts    # Core AI wrapper
│   │   └── markdown-enhance.service.ts
│   └── prompts/
│       └── markdown-enhance.prompt.ts
│
├── document/                    # Document processing
│   ├── document-extraction.service.ts  # Main service
│   └── processors/
│       └── pdf.processor.ts     # PDF extraction
│
├── source/
│   └── source.service.ts        # Integrates document extraction
│
└── annotation/
    └── annotation.service.ts    # Uses AI module
```

## Next Steps

### Ready to Move to Phase 2?
1. ✅ Phase 1 tests passing
2. ✅ PDFs extracting text successfully
3. ✅ Database storing extracted text
4. ✅ No build errors

### Start Phase 2: Smart Summarization
See `PHASE2_PLAN.md` (to be created) for:
- Adding summarization endpoint
- Creating summarization prompts
- Storing summaries in database
- Testing summary generation

## Quick Commands

### Start Development
```bash
cd server
npm run start:dev
```

### Run Build
```bash
npm run build
```

### Generate Prisma Client
```bash
npx prisma generate
```

### Create Migration (when ready)
```bash
npx prisma migrate dev --name add_document_extraction
```

### View Logs
```bash
# In development mode, logs appear in console
# Look for [DocumentExtractionService] and [SourceService] tags
```

## Support

### Check Implementation Details
- `PHASE1_IMPLEMENTATION.md` - Technical details
- `PHASE1_SUMMARY.md` - Overview and architecture

### Need Help?
1. Check logs for error messages
2. Verify environment variables
3. Test with a simple PDF first
4. Check database for extracted text

---

**Phase 1 Status**: ✅ Complete  
**Next**: Phase 2 - Smart Summarization
