# Phase 2: Smart Summarization - Quick Start

## 🎯 What's New

Phase 2 adds AI-powered summarization to Research Citadel. Generate concise summaries of research papers in three lengths.

## 🚀 Quick Start

### 1. Setup

```bash
# Ensure Gemini API key is set
echo "GEMINI_API_KEY=your_key_here" >> .env

# Build and start
npm run build
npm run start:dev
```

### 2. Test It

```bash
# Upload a PDF
curl -X POST http://localhost:3000/vault/YOUR_VAULT_ID/source \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Paper" \
  -F "file=@paper.pdf"

# Generate summary
curl -X POST http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": "medium"}'
```

### 3. Check Result

```bash
# Get source with summary
curl -X GET http://localhost:3000/vault/YOUR_VAULT_ID/source/SOURCE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Look for `aiSummary` and `aiProcessedAt` fields in the response.

## 📁 What Was Built

```
server/src/ai/
├── dto/
│   └── summarization.dto.ts          # Request/response types
├── prompts/
│   └── summarization.prompt.ts       # AI prompt templates
└── services/
    └── summarization.service.ts      # Core summarization logic

server/docs/
├── PHASE_2_SUMMARIZATION.md          # Implementation guide
├── TESTING_PHASE_2.md                # Testing guide
└── API_SUMMARIZATION.md              # API reference

server/
├── PHASE_2_COMPLETE.md               # Completion summary
└── PHASE_2_CHECKLIST.md              # Testing checklist
```

## 🎨 Features

### Three Summary Lengths

| Length | Words   | Use Case                    | Time    |
|--------|---------|----------------------------|---------|
| Short  | 100-150 | Quick overview             | 2-5s    |
| Medium | 250-350 | Balanced detail (default)  | 5-10s   |
| Long   | 500-700 | Comprehensive analysis     | 10-20s  |

### Smart Processing

- **Section-based**: Identifies key sections (abstract, methods, results)
- **Chunking**: Handles large documents (>100k characters)
- **Context-aware**: Uses paper metadata (title, authors, year)

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [PHASE_2_SUMMARIZATION.md](docs/PHASE_2_SUMMARIZATION.md) | Complete implementation guide |
| [TESTING_PHASE_2.md](docs/TESTING_PHASE_2.md) | Step-by-step testing guide |
| [API_SUMMARIZATION.md](docs/API_SUMMARIZATION.md) | API reference with examples |
| [PHASE_2_COMPLETE.md](PHASE_2_COMPLETE.md) | Completion summary |
| [PHASE_2_CHECKLIST.md](PHASE_2_CHECKLIST.md) | Testing checklist |

## 🔧 API Endpoint

```
POST /vault/:vaultId/source/:id/summarize
```

**Request**:
```json
{
  "length": "medium"  // "short" | "medium" | "long"
}
```

**Response**:
```json
{
  "message": "Summary generated successfully",
  "success": true,
  "data": {
    "id": "...",
    "title": "Attention Is All You Need",
    "aiSummary": "This paper introduces the Transformer...",
    "aiProcessedAt": "2026-05-25T10:05:23.456Z"
  }
}
```

## ✅ Testing

Follow the comprehensive testing guide:

```bash
# See detailed test scenarios
cat docs/TESTING_PHASE_2.md

# Or use the checklist
cat PHASE_2_CHECKLIST.md
```

### Quick Test

1. Upload a PDF (text extraction happens automatically)
2. Generate a summary
3. Verify `aiSummary` field is populated
4. Check summary quality and word count

## 🐛 Troubleshooting

### "AI service is not configured"
- Set `GEMINI_API_KEY` in `.env`
- Restart server

### "No extracted text available"
- Ensure PDF was uploaded (not just metadata)
- Check `extractedText` field is populated
- Verify PDF is not scanned/image-only

### "Summary is poor quality"
- Check extracted text quality
- Try different summary length
- Adjust prompts in `src/ai/prompts/summarization.prompt.ts`

## 📊 Progress

- ✅ Phase 1: PDF Text Extraction (Complete)
- ✅ Phase 2: Smart Summarization (Complete)
- ⏳ Phase 3: Key Insights Extraction (Next)
- ⏳ Phase 4: Research Q&A (RAG System)

**Overall Progress**: 50% (2/4 phases)

## 🎯 Next Steps

1. **Test Phase 2** - Follow `docs/TESTING_PHASE_2.md`
2. **Deploy to staging** (optional)
3. **Gather feedback** on summary quality
4. **Start Phase 3** - Key Insights Extraction

## 💡 Tips

### For Frontend Developers
```typescript
// Generate summary
const response = await fetch(
  `/vault/${vaultId}/source/${sourceId}/summarize`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ length: 'medium' }),
  }
);

const { data } = await response.json();
console.log(data.aiSummary); // The generated summary
```

### For Backend Developers
```typescript
// Use the service directly
import { SummarizationService } from './ai/services/summarization.service';

const summary = await summarizationService.generateSummary(
  extractedText,
  SummaryLength.MEDIUM,
  { title, authors, year }
);
```

## 📈 Performance

- **Small papers** (<10 pages): 2-5 seconds
- **Medium papers** (10-30 pages): 5-10 seconds  
- **Large papers** (>30 pages): 15-30 seconds

## 💰 Cost

Gemini 2.5 Flash (approximate):
- Short: ~$0.001-0.002 per summary
- Medium: ~$0.003-0.005 per summary
- Long: ~$0.008-0.015 per summary

## 🔗 Related

- [Implementation Roadmap](IMPLEMENTATION_ROADMAP.md)
- [Phase 1 Documentation](docs/PHASE_1_TEXT_EXTRACTION.md)
- [Swagger API Docs](http://localhost:3000/api)

## 📞 Support

- **Issues**: Check `docs/PHASE_2_SUMMARIZATION.md` troubleshooting section
- **Testing**: Follow `docs/TESTING_PHASE_2.md`
- **API**: See `docs/API_SUMMARIZATION.md`

---

**Status**: ✅ Complete and Ready for Testing  
**Version**: 1.0.0  
**Date**: May 25, 2026
