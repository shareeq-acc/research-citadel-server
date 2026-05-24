# Summarization API Reference

## Overview

The Summarization API allows you to generate AI-powered summaries of research papers in three different lengths.

**Base URL**: `http://localhost:3000` (development)

**Authentication**: Required (Bearer token)

---

## Endpoints

### Generate Summary

Generate an AI summary for a source document.

**Endpoint**: `POST /vault/:vaultId/source/:id/summarize`

**Authentication**: Required

**Authorization**: CONTRIBUTOR or OWNER role

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| vaultId   | UUID   | Yes      | Vault ID    |
| id        | UUID   | Yes      | Source ID   |

#### Request Body

| Field  | Type   | Required | Default | Description |
|--------|--------|----------|---------|-------------|
| length | string | No       | medium  | Summary length: `short`, `medium`, or `long` |

**Example Request**:

```bash
POST /vault/abc-123/source/def-456/summarize
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "length": "medium"
}
```

#### Response

**Success Response** (200 OK):

```json
{
  "message": "Summary generated successfully",
  "success": true,
  "data": {
    "id": "def-456",
    "vaultId": "abc-123",
    "createdBy": "user-123",
    "title": "Attention Is All You Need",
    "authors": ["Vaswani", "Shazeer", "Parmar", "Uszkoreit", "Jones", "Gomez", "Kaiser", "Polosukhin"],
    "publication": "NeurIPS",
    "year": 2017,
    "externalUrl": "https://arxiv.org/abs/1706.03762",
    "sourceType": "PDF",
    "fileId": "file-789",
    "aiExtracted": false,
    "abstract": null,
    "keywords": [],
    "extractedText": "Abstract\nThe dominant sequence transduction models...",
    "extractedMetadata": {
      "title": "Attention Is All You Need",
      "author": "Ashish Vaswani et al.",
      "pages": 15,
      "createdAt": "2017-06-12T00:00:00Z"
    },
    "textExtractedAt": "2026-05-25T10:00:00.000Z",
    "aiSummary": "This paper introduces the Transformer, a novel neural network architecture based entirely on attention mechanisms, dispensing with recurrence and convolutions. The Transformer achieves superior performance on machine translation tasks while being more parallelizable and requiring significantly less time to train. The model uses multi-head self-attention to compute representations of input and output sequences, allowing it to model dependencies without regard to their distance in the sequences. Experiments on English-to-German and English-to-French translation tasks demonstrate that the Transformer outperforms existing models, including ensembles, while being more efficient to train. The architecture's ability to parallelize and its effectiveness in capturing long-range dependencies make it a significant advancement in sequence modeling.",
    "aiInsights": null,
    "aiProcessedAt": "2026-05-25T10:05:23.456Z",
    "createdAt": "2026-05-25T09:55:00.000Z",
    "updatedAt": "2026-05-25T10:05:23.456Z",
    "deletedAt": null,
    "creator": {
      "id": "user-123",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": null
    },
    "file": {
      "id": "file-789",
      "fileName": "attention-is-all-you-need.pdf",
      "fileUrl": "https://storage.example.com/uploads/sources/...",
      "fileSize": 2048576,
      "fileMimeType": "application/pdf",
      "fileType": "PDF",
      "pageCount": 15
    }
  }
}
```

**Error Responses**:

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400         | Bad Request | No extracted text available |
| 401         | Unauthorized | Missing or invalid authentication token |
| 403         | Forbidden | Insufficient permissions (VIEWER role) |
| 404         | Not Found | Source or vault not found |
| 500         | Internal Server Error | AI generation failed |
| 503         | Service Unavailable | Gemini API key not configured |

**Error Response Example** (400 Bad Request):

```json
{
  "message": "Cannot generate summary: No extracted text available. Please upload a document first.",
  "success": false,
  "statusCode": 400
}
```

---

## Summary Lengths

### Short Summary
- **Word Count**: 100-150 words
- **Use Case**: Quick overview, abstracts, previews
- **Response Time**: ~2-5 seconds
- **Best For**: Browsing multiple papers, quick reference

**Example**:
```
This paper introduces the Transformer architecture, which relies entirely on 
attention mechanisms without recurrence or convolutions. The model achieves 
state-of-the-art results on machine translation tasks while being more 
parallelizable and faster to train than previous architectures. Multi-head 
self-attention allows the model to jointly attend to information from different 
representation subspaces. Experiments demonstrate superior performance on 
English-to-German and English-to-French translation, establishing the Transformer 
as a powerful new approach for sequence modeling tasks.
```

### Medium Summary (Default)
- **Word Count**: 250-350 words
- **Use Case**: Balanced detail, general understanding
- **Response Time**: ~5-10 seconds
- **Best For**: Most use cases, comprehensive yet concise

**Example**:
```
This paper introduces the Transformer, a novel neural network architecture based 
entirely on attention mechanisms, dispensing with recurrence and convolutions. 
The Transformer achieves superior performance on machine translation tasks while 
being more parallelizable and requiring significantly less time to train.

The model uses multi-head self-attention to compute representations of input and 
output sequences, allowing it to model dependencies without regard to their 
distance in the sequences. The architecture consists of an encoder-decoder 
structure, where both components are composed of stacked self-attention and 
point-wise fully connected layers. Multi-head attention allows the model to 
jointly attend to information from different representation subspaces at 
different positions.

Experiments on English-to-German and English-to-French translation tasks 
demonstrate that the Transformer outperforms existing models, including ensembles, 
while being more efficient to train. On the WMT 2014 English-to-German translation 
task, the model achieves a BLEU score of 28.4, improving over the existing best 
results by over 2 BLEU points. The architecture's ability to parallelize and its 
effectiveness in capturing long-range dependencies make it a significant 
advancement in sequence modeling.
```

### Long Summary
- **Word Count**: 500-700 words
- **Use Case**: Detailed analysis, in-depth understanding
- **Response Time**: ~10-20 seconds
- **Best For**: Deep dives, research analysis, comprehensive reviews

---

## Code Examples

### JavaScript/TypeScript (Fetch API)

```typescript
async function generateSummary(
  vaultId: string,
  sourceId: string,
  length: 'short' | 'medium' | 'long' = 'medium',
  token: string
) {
  const response = await fetch(
    `http://localhost:3000/vault/${vaultId}/source/${sourceId}/summarize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ length }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage
try {
  const result = await generateSummary(
    'abc-123',
    'def-456',
    'medium',
    'your-jwt-token'
  );
  console.log('Summary:', result.data.aiSummary);
} catch (error) {
  console.error('Failed to generate summary:', error.message);
}
```

### Python (Requests)

```python
import requests

def generate_summary(vault_id, source_id, length='medium', token=''):
    url = f'http://localhost:3000/vault/{vault_id}/source/{source_id}/summarize'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    data = {'length': length}
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    
    return response.json()

# Usage
try:
    result = generate_summary('abc-123', 'def-456', 'medium', 'your-jwt-token')
    print('Summary:', result['data']['aiSummary'])
except requests.exceptions.HTTPError as e:
    print('Failed to generate summary:', e)
```

### cURL

```bash
# Short summary
curl -X POST \
  http://localhost:3000/vault/abc-123/source/def-456/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "short"}'

# Medium summary (default)
curl -X POST \
  http://localhost:3000/vault/abc-123/source/def-456/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Long summary
curl -X POST \
  http://localhost:3000/vault/abc-123/source/def-456/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "long"}'
```

---

## Rate Limiting

**Current**: No rate limiting implemented

**Recommended** (for production):
- 10 requests per hour per user
- 50 requests per hour per vault
- 429 Too Many Requests response when exceeded

---

## Cost Considerations

Gemini 2.5 Flash pricing (approximate):
- **Short summary**: ~$0.001-0.002 per request
- **Medium summary**: ~$0.003-0.005 per request
- **Long summary**: ~$0.008-0.015 per request

**Large documents** (>100k characters) may cost 2-3x more due to chunking.

---

## Best Practices

### 1. Check for Extracted Text First

Before generating a summary, verify the source has extracted text:

```typescript
const source = await getSource(vaultId, sourceId);
if (!source.extractedText) {
  console.log('No text extracted yet. Upload a document first.');
  return;
}
```

### 2. Choose Appropriate Length

- Use **short** for quick previews and lists
- Use **medium** for most cases (default)
- Use **long** for detailed analysis

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await generateSummary(vaultId, sourceId, 'medium', token);
  return result.data.aiSummary;
} catch (error) {
  if (error.statusCode === 400) {
    return 'No text available to summarize';
  } else if (error.statusCode === 503) {
    return 'AI service temporarily unavailable';
  }
  throw error;
}
```

### 4. Cache Summaries

Summaries are stored in the database. Retrieve them instead of regenerating:

```typescript
// Get existing summary
const source = await getSource(vaultId, sourceId);
if (source.aiSummary) {
  return source.aiSummary; // Use cached summary
}

// Generate new summary only if needed
const result = await generateSummary(vaultId, sourceId, 'medium', token);
return result.data.aiSummary;
```

### 5. Show Progress for Large Documents

For documents >100 pages, consider showing a loading indicator:

```typescript
const source = await getSource(vaultId, sourceId);
const estimatedTime = source.extractedText.length > 100000 ? 20 : 5;

showLoadingIndicator(`Generating summary (est. ${estimatedTime}s)...`);
const result = await generateSummary(vaultId, sourceId, 'medium', token);
hideLoadingIndicator();
```

---

## Swagger/OpenAPI

The endpoint is documented in Swagger UI:

**URL**: `http://localhost:3000/api`

Navigate to **Source** → **Generate AI Summary**

---

## Related Endpoints

- `POST /vault/:vaultId/source` - Upload source with file
- `GET /vault/:vaultId/source/:id` - Get source (includes summary)
- `PUT /vault/:vaultId/source/:id` - Update source
- `DELETE /vault/:vaultId/source/:id` - Delete source

---

## Changelog

### v1.0.0 (Phase 2)
- Initial release
- Three summary lengths (short, medium, long)
- Section-based summarization
- Chunked processing for large documents
- Audit logging

---

## Support

For issues or questions:
- Check logs: `server/logs/`
- Review documentation: `server/docs/PHASE_2_SUMMARIZATION.md`
- Test guide: `server/docs/TESTING_PHASE_2.md`

---

**API Version**: 1.0.0  
**Last Updated**: Phase 2 Complete
