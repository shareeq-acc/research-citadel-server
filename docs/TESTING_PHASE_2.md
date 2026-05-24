# Phase 2 Testing Guide - Smart Summarization

## Prerequisites

1. **Server Running**:
   ```bash
   cd server
   npm run start:dev
   ```

2. **Environment Variables Set**:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Authentication Token**:
   - Register/login to get a JWT token
   - Create a vault
   - Note your vaultId

## Test Scenarios

### Scenario 1: Upload PDF and Generate Summary

#### Step 1: Upload a PDF with Text Extraction

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Attention Is All You Need" \
  -F "authors=Vaswani,Shazeer,Parmar" \
  -F "year=2017" \
  -F "file=@/path/to/paper.pdf"
```

**Expected Response**:
```json
{
  "message": "Source created and file uploaded successfully",
  "success": true,
  "data": {
    "id": "source-uuid",
    "title": "Attention Is All You Need",
    "extractedText": "Abstract\nThe dominant sequence...",
    "textExtractedAt": "2026-05-25T10:00:00Z",
    "aiSummary": null,
    "aiProcessedAt": null
  }
}
```

**Verify**:
- ✅ `extractedText` is populated
- ✅ `textExtractedAt` has a timestamp
- ✅ `aiSummary` is null (not generated yet)

#### Step 2: Generate Medium Summary (Default)

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response**:
```json
{
  "message": "Summary generated successfully",
  "success": true,
  "data": {
    "id": "source-uuid",
    "title": "Attention Is All You Need",
    "aiSummary": "This paper introduces the Transformer, a novel neural network architecture...",
    "aiProcessedAt": "2026-05-25T10:05:00Z"
  }
}
```

**Verify**:
- ✅ `aiSummary` contains text (250-350 words)
- ✅ `aiProcessedAt` has a timestamp
- ✅ Summary is coherent and accurate
- ✅ Response time < 10 seconds

#### Step 3: Generate Short Summary

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "short"}'
```

**Verify**:
- ✅ Summary is 100-150 words
- ✅ Captures key points concisely
- ✅ Faster response time

#### Step 4: Generate Long Summary

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "long"}'
```

**Verify**:
- ✅ Summary is 500-700 words
- ✅ More detailed and comprehensive
- ✅ Longer response time

---

### Scenario 2: Error Handling

#### Test 2.1: No Extracted Text

Create a source without a file:

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Manual Entry",
    "authors": ["Author Name"]
  }'
```

Then try to summarize:

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "message": "Cannot generate summary: No extracted text available. Please upload a document first.",
  "success": false,
  "statusCode": 400
}
```

**Verify**:
- ✅ Returns 400 Bad Request
- ✅ Clear error message

#### Test 2.2: Insufficient Permissions

As a VIEWER user, try to generate summary:

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
  -H "Authorization: Bearer VIEWER_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "message": "Forbidden: only CONTRIBUTOR or OWNER can create or edit sources",
  "success": false,
  "statusCode": 403
}
```

**Verify**:
- ✅ Returns 403 Forbidden
- ✅ Clear permission error

#### Test 2.3: Invalid Source ID

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/invalid-uuid/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "message": "Source not found",
  "success": false,
  "statusCode": 404
}
```

**Verify**:
- ✅ Returns 404 Not Found

#### Test 2.4: Missing Gemini API Key

1. Stop server
2. Remove `GEMINI_API_KEY` from `.env`
3. Restart server
4. Try to generate summary

**Expected Response**:
```json
{
  "message": "AI service is not configured (missing GEMINI_API_KEY)",
  "success": false,
  "statusCode": 503
}
```

**Verify**:
- ✅ Returns 503 Service Unavailable
- ✅ Clear configuration error

---

### Scenario 3: Large Document Handling

#### Test with Large PDF (>100 pages)

Upload a large research paper:

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Large Research Paper" \
  -F "file=@/path/to/large-paper.pdf"
```

Generate summary:

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "long"}'
```

**Verify**:
- ✅ Chunking is triggered (check logs)
- ✅ Summary is still coherent
- ✅ Response time < 30 seconds
- ✅ No errors or timeouts

**Check Logs**:
```
[SummarizationService] Text is large, using chunked summarization approach
[SummarizationService] Split text into 5 chunks
[SummarizationService] Summarizing chunk 1/5
[SummarizationService] Summarizing chunk 2/5
...
[SummarizationService] Combining chunk summaries into final summary
```

---

### Scenario 4: Audit Logging

After generating a summary, check the audit log:

```sql
SELECT * FROM "AuditLog" 
WHERE "entityType" = 'source' 
  AND "details"->>'action' = 'ai_summary_generated'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected Result**:
```
| id | vaultId | userId | action | entityId | details | createdAt |
|----|---------|--------|--------|----------|---------|-----------|
| ... | vault-id | user-id | SOURCE_UPDATED | source-id | {"action":"ai_summary_generated","summaryLength":"medium","wordCount":287} | 2026-05-25... |
```

**Verify**:
- ✅ Audit log entry created
- ✅ Contains summary length
- ✅ Contains word count
- ✅ Correct timestamps

---

### Scenario 5: Retrieve Summary

Get the source with summary:

```bash
curl -X GET \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "message": "Source retrieved successfully",
  "success": true,
  "data": {
    "id": "source-uuid",
    "title": "Attention Is All You Need",
    "authors": ["Vaswani", "Shazeer", "Parmar"],
    "year": 2017,
    "extractedText": "Abstract\nThe dominant...",
    "textExtractedAt": "2026-05-25T10:00:00Z",
    "aiSummary": "This paper introduces the Transformer...",
    "aiProcessedAt": "2026-05-25T10:05:00Z",
    "creator": { ... },
    "file": { ... }
  }
}
```

**Verify**:
- ✅ All fields present
- ✅ Summary is readable
- ✅ Timestamps are correct

---

### Scenario 6: Regenerate Summary

Generate a new summary (overwrites previous):

```bash
curl -X POST \
  http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "long"}'
```

**Verify**:
- ✅ New summary replaces old one
- ✅ `aiProcessedAt` is updated
- ✅ New audit log entry created

---

## Performance Benchmarks

Test with different paper sizes:

| Paper Size | Pages | Characters | Summary Length | Expected Time | Chunking |
|------------|-------|------------|----------------|---------------|----------|
| Small      | 5-10  | 20k-40k    | Medium         | 2-5s          | No       |
| Medium     | 10-30 | 40k-100k   | Medium         | 5-10s         | No       |
| Large      | 30-50 | 100k-200k  | Medium         | 15-25s        | Yes      |
| Very Large | 50+   | 200k+      | Medium         | 25-40s        | Yes      |

---

## Quality Assessment

For each generated summary, assess:

### Accuracy
- [ ] Captures main research problem
- [ ] Describes methodology correctly
- [ ] Includes key findings
- [ ] Mentions implications

### Clarity
- [ ] Uses clear language
- [ ] Logical flow
- [ ] No contradictions
- [ ] Appropriate technical level

### Completeness
- [ ] Covers all major sections
- [ ] No critical omissions
- [ ] Balanced coverage

### Length
- [ ] Matches target word count
- [ ] Not too verbose
- [ ] Not too brief

---

## Troubleshooting

### Issue: "Empty response from Gemini"

**Possible Causes**:
- Prompt too long
- API rate limit
- Network issue

**Solutions**:
1. Check Gemini API status
2. Retry after a few seconds
3. Check server logs for details

### Issue: Summary is Poor Quality

**Possible Causes**:
- Extracted text is garbled
- PDF has unusual structure
- Prompt needs tuning

**Solutions**:
1. Check `extractedText` quality
2. Try different summary length
3. Test with different paper
4. Adjust prompts if needed

### Issue: Timeout

**Possible Causes**:
- Document too large
- Slow network
- Gemini API slow

**Solutions**:
1. Increase timeout in code
2. Optimize chunking parameters
3. Use shorter summary length

---

## Success Criteria

Phase 2 is successful if:

- ✅ All test scenarios pass
- ✅ Error handling works correctly
- ✅ Summaries are accurate and coherent
- ✅ Performance is acceptable
- ✅ Audit logging works
- ✅ Large documents are handled
- ✅ All three lengths work
- ✅ No build errors
- ✅ Documentation is complete

---

## Next Steps

After successful testing:

1. **Deploy to staging** (if applicable)
2. **User acceptance testing**
3. **Monitor performance and costs**
4. **Gather feedback on summary quality**
5. **Move to Phase 3**: Key Insights Extraction

---

## Test Checklist

- [ ] Scenario 1: Upload and summarize (all lengths)
- [ ] Scenario 2: All error cases
- [ ] Scenario 3: Large document
- [ ] Scenario 4: Audit logging
- [ ] Scenario 5: Retrieve summary
- [ ] Scenario 6: Regenerate summary
- [ ] Performance benchmarks
- [ ] Quality assessment
- [ ] Documentation review

**Testing Status**: Ready for Testing ✅
