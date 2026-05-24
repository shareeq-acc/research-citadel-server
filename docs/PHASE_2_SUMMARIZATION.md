# Phase 2: Smart Summarization - Implementation Guide

## Overview

Phase 2 adds AI-powered summarization capabilities to Research Citadel. Users can now generate concise, accurate summaries of research papers in three different lengths.

## Features Implemented

### 1. **Multiple Summary Lengths**
- **Short**: 100-150 words - Quick overview
- **Medium**: 250-350 words - Balanced detail (default)
- **Long**: 500-700 words - Comprehensive summary

### 2. **Intelligent Summarization**
- **Section-based approach**: Identifies key sections (abstract, intro, methods, results, conclusion)
- **Chunked processing**: Handles large documents by splitting into manageable chunks
- **Context preservation**: Maintains coherence across chunks with overlap
- **Metadata integration**: Uses paper title, authors, and year for better context

### 3. **Database Integration**
- Summaries stored in `Source.aiSummary` field
- Timestamp tracked in `Source.aiProcessedAt`
- Audit logging for all summary generation events

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Source Controller                        │
│  POST /vault/:vaultId/source/:id/summarize                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Source Service                           │
│  - Validates source exists                                   │
│  - Checks for extracted text                                 │
│  - Calls SummarizationService                                │
│  - Updates database with summary                             │
│  - Creates audit log                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 SummarizationService                         │
│  - Determines if chunking is needed                          │
│  - Generates prompts based on length                         │
│  - Calls GeminiService                                       │
│  - Combines chunk summaries if needed                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     GeminiService                            │
│  - Sends requests to Google Gemini API                       │
│  - Handles errors and retries                                │
└─────────────────────────────────────────────────────────────┘
```

## Files Created

### 1. DTOs (`src/ai/dto/summarization.dto.ts`)
```typescript
- SummaryLength enum (SHORT, MEDIUM, LONG)
- GenerateSummaryDto (request)
- SummaryResponseDto (response)
```

### 2. Prompts (`src/ai/prompts/summarization.prompt.ts`)
```typescript
- SUMMARIZATION_SYSTEM_INSTRUCTION
- generateFullTextSummaryPrompt()
- generateSectionBasedSummaryPrompt()
- generateChunkSummaryPrompt()
- generateCombineSummariesPrompt()
```

### 3. Service (`src/ai/services/summarization.service.ts`)
```typescript
- generateSummary() - Main entry point
- generateDirectSummary() - For small documents
- generateChunkedSummary() - For large documents
- splitIntoChunks() - Smart text chunking
- estimateWordCount() - Word counting utility
```

### 4. Updated Files
- `src/ai/ai.module.ts` - Added SummarizationService
- `src/source/source.controller.ts` - Added summarize endpoint
- `src/source/source.service.ts` - Added generateSummary method
- `src/source/source.module.ts` - Imported AiModule
- `src/source/queries/index.ts` - Added AI fields to select

## API Endpoint

### Generate Summary

**Endpoint**: `POST /vault/:vaultId/source/:id/summarize`

**Authentication**: Required (Bearer token)

**Authorization**: CONTRIBUTOR or OWNER role

**Request Body**:
```json
{
  "length": "medium"  // Optional: "short" | "medium" | "long"
}
```

**Response**:
```json
{
  "message": "Summary generated successfully",
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Attention Is All You Need",
    "authors": ["Vaswani et al."],
    "aiSummary": "This paper introduces the Transformer...",
    "aiProcessedAt": "2026-05-25T10:30:00Z",
    // ... other source fields
  }
}
```

**Error Responses**:

- `400 Bad Request`: No extracted text available
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions (VIEWER role)
- `404 Not Found`: Source or vault not found
- `500 Internal Server Error`: AI generation failed
- `503 Service Unavailable`: Gemini API key not configured

## Usage Examples

### Example 1: Generate Medium Summary (Default)

```bash
curl -X POST \
  http://localhost:3000/vault/abc-123/source/def-456/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Example 2: Generate Short Summary

```bash
curl -X POST \
  http://localhost:3000/vault/abc-123/source/def-456/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "short"}'
```

### Example 3: Generate Long Summary

```bash
curl -X POST \
  http://localhost:3000/vault/abc-123/source/def-456/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "long"}'
```

## How It Works

### Small Documents (<100k characters)

1. **Direct Summarization**:
   - Uses section-based prompt
   - Single API call to Gemini
   - Returns summary directly

### Large Documents (>100k characters)

1. **Chunking**:
   - Splits text into 80k character chunks
   - 2k character overlap between chunks
   - Breaks at sentence boundaries when possible

2. **Chunk Summarization**:
   - Each chunk summarized to 100-150 words
   - Parallel processing possible (currently sequential)

3. **Combination**:
   - Chunk summaries combined into final summary
   - Eliminates redundancy
   - Maintains logical flow
   - Respects target word count

## Prompt Engineering

### System Instruction
```
You are an expert research paper summarizer. Your task is to create 
clear, accurate, and concise summaries of academic papers.

Guidelines:
- Focus on main contributions, methodology, and key findings
- Use clear, accessible language while maintaining technical accuracy
- Preserve important technical terms and concepts
- Structure logically (context → methods → results → implications)
- Avoid unnecessary jargon
- Do not include citations
- Write in present tense
```

### Section-Based Prompt Structure
```
1. Identify key sections (abstract, intro, methods, results, conclusion)
2. Extract most important information from each section
3. Synthesize into target word count
4. Cover: problem, methodology, findings, implications
```

## Configuration

### Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

### Chunking Parameters

Located in `summarization.service.ts`:

```typescript
const MAX_CHARS_PER_REQUEST = 100000; // ~25k words
const CHUNK_SIZE = 80000;             // ~20k words per chunk
const CHUNK_OVERLAP = 2000;           // Small overlap for context
```

Adjust these based on:
- Gemini API token limits
- Response time requirements
- Cost considerations

## Testing

### Manual Testing Steps

1. **Upload a PDF**:
   ```bash
   curl -X POST \
     http://localhost:3000/vault/YOUR_VAULT_ID/source \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "title=Test Paper" \
     -F "file=@paper.pdf"
   ```

2. **Verify Text Extraction**:
   ```bash
   curl -X GET \
     http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   
   Check that `extractedText` is populated.

3. **Generate Summary**:
   ```bash
   curl -X POST \
     http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"length": "medium"}'
   ```

4. **Verify Summary**:
   - Check `aiSummary` field is populated
   - Check `aiProcessedAt` timestamp is set
   - Verify word count matches target range
   - Assess summary quality and accuracy

### Test Cases

#### Test Case 1: Short Paper (< 10 pages)
- **Expected**: Direct summarization
- **Verify**: Single API call, fast response

#### Test Case 2: Medium Paper (10-30 pages)
- **Expected**: Direct summarization
- **Verify**: Good quality, reasonable time

#### Test Case 3: Long Paper (> 30 pages)
- **Expected**: Chunked summarization
- **Verify**: Multiple API calls, coherent result

#### Test Case 4: Different Lengths
- **Test**: Generate short, medium, and long summaries
- **Verify**: Word counts match targets

#### Test Case 5: No Extracted Text
- **Test**: Try to summarize source without text
- **Expected**: 400 Bad Request error

#### Test Case 6: Insufficient Permissions
- **Test**: VIEWER tries to generate summary
- **Expected**: 403 Forbidden error

## Audit Logging

Every summary generation creates an audit log:

```typescript
{
  vaultId: "uuid",
  userId: "uuid",
  action: "SOURCE_UPDATED",
  entityType: "source",
  entityId: "uuid",
  details: {
    action: "ai_summary_generated",
    summaryLength: "medium",
    wordCount: 287
  }
}
```

Query audit logs:
```sql
SELECT * FROM "AuditLog" 
WHERE "entityType" = 'source' 
  AND "details"->>'action' = 'ai_summary_generated'
ORDER BY "createdAt" DESC;
```

## Performance Considerations

### Response Times

- **Small documents**: 2-5 seconds
- **Medium documents**: 5-10 seconds
- **Large documents**: 15-30 seconds (chunked)

### Cost Optimization

Gemini 2.5 Flash pricing (as of 2024):
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

Typical costs per summary:
- **Short paper**: ~$0.001-0.002
- **Medium paper**: ~$0.003-0.005
- **Long paper**: ~$0.008-0.015

### Rate Limiting

Consider implementing:
- Per-user rate limits (e.g., 10 summaries/hour)
- Per-vault rate limits
- Queue system for batch processing

## Error Handling

### Common Errors

1. **No Extracted Text**:
   ```
   Cannot generate summary: No extracted text available. 
   Please upload a document first.
   ```
   **Solution**: Ensure PDF was uploaded and text extraction succeeded

2. **Gemini API Error**:
   ```
   AI generation failed: [error message]
   ```
   **Solution**: Check API key, network, and Gemini service status

3. **Empty Response**:
   ```
   Empty response from Gemini
   ```
   **Solution**: Retry or check prompt formatting

### Graceful Degradation

- Errors don't affect source record
- Original text remains intact
- Can retry summary generation
- Audit log captures failures

## Future Enhancements

### Phase 2.1 (Optional)
- [ ] Parallel chunk processing
- [ ] Summary caching
- [ ] Regenerate summary option
- [ ] Summary history/versions
- [ ] Custom summary templates
- [ ] Multi-language support

### Phase 2.2 (Advanced)
- [ ] Streaming responses
- [ ] Progress indicators for long documents
- [ ] Summary quality scoring
- [ ] A/B testing different prompts
- [ ] User feedback on summaries

## Troubleshooting

### Issue: Build Fails

**Check**:
```bash
cd server
npm run build
```

**Common causes**:
- Missing imports
- Type mismatches
- Prisma client not generated

**Solution**:
```bash
npx prisma generate
npm run build
```

### Issue: Summary Generation Fails

**Check logs**:
```bash
# In server logs, look for:
[SummarizationService] Summarization failed: [error]
```

**Debug steps**:
1. Verify Gemini API key is set
2. Check source has extractedText
3. Test Gemini API directly
4. Check network connectivity

### Issue: Poor Summary Quality

**Possible causes**:
- Extracted text is garbled
- Document structure is unusual
- Prompt needs tuning

**Solutions**:
1. Check extracted text quality
2. Try different summary length
3. Adjust prompts in `summarization.prompt.ts`
4. Test with different papers

## Next Steps

With Phase 2 complete, you're ready for:

**Phase 3: Key Insights Extraction**
- Extract structured insights (methodology, findings, limitations)
- Store in `aiInsights` JSON field
- Provide structured data for analysis

See `IMPLEMENTATION_ROADMAP.md` for Phase 3 details.

---

## Summary

Phase 2 successfully implements:
- ✅ Smart summarization with 3 length options
- ✅ Section-based approach for accuracy
- ✅ Chunked processing for large documents
- ✅ Database storage and audit logging
- ✅ RESTful API endpoint
- ✅ Comprehensive error handling

**Status**: Phase 2 Complete ✅

**Next**: Phase 3 - Key Insights Extraction
