# Research Citadel - AI Features Implementation Roadmap

## Overview

This document tracks the implementation of AI-powered research features across 4 phases.

---

## ✅ Phase 1: PDF Text Extraction Foundation (COMPLETE)

**Goal**: Extract text from uploaded documents to enable AI features.

### Completed Tasks

- [x] Create Document Module
  - [x] `document-extraction.service.ts` - Main service
  - [x] `pdf.processor.ts` - PDF extraction
  - [x] `document-processor.interface.ts` - Extensibility interface
  - [x] `document-extraction.dto.ts` - Type-safe DTOs
  
- [x] Create AI Module
  - [x] `gemini.service.ts` - Core Gemini wrapper
  - [x] `markdown-enhance.service.ts` - Markdown enhancement
  - [x] `markdown-enhance.prompt.ts` - Prompt templates
  - [x] `ai-response.dto.ts` - Response DTOs
  
- [x] Update Database Schema
  - [x] Add `extractedText` to Source model
  - [x] Add `extractedMetadata` to Source model
  - [x] Add `textExtractedAt` to Source model
  - [x] Add `aiSummary` field (for Phase 2)
  - [x] Add `aiInsights` field (for Phase 3)
  - [x] Add `aiProcessedAt` field (for Phase 2/3)
  - [x] Create `SourceChunk` model (for Phase 4)
  
- [x] Integrate with Source Service
  - [x] Update `createWithFile` to extract text
  - [x] Auto-populate metadata from PDF
  - [x] Store extracted text in database
  - [x] Add audit logging for extraction
  
- [x] Update Existing Modules
  - [x] Migrate annotation module to use new AI module
  - [x] Remove old `gemini-enhance.service.ts`
  - [x] Update app.module.ts with new modules
  
- [x] Testing & Documentation
  - [x] Build succeeds without errors
  - [x] Prisma client generated
  - [x] Create comprehensive documentation
  - [x] Create testing guide

### Deliverables

- ✅ Document Module (extensible for DOCX, TXT, etc.)
- ✅ AI Module (centralized Gemini integration)
- ✅ Automatic text extraction on PDF upload
- ✅ Database schema updated
- ✅ Documentation complete

---

## 🔄 Phase 2: Smart Summarization (NEXT)

**Goal**: Generate AI summaries of research papers.

### Tasks

- [ ] Create Summarization Service
  - [ ] `summarization.service.ts` in AI module
  - [ ] `summarization.prompts.ts` - Prompt templates
  - [ ] `summarization.dto.ts` - Request/response DTOs
  
- [ ] Add Summarization Endpoint
  - [ ] `POST /vault/:vaultId/source/:id/summarize`
  - [ ] Controller method in `source.controller.ts`
  - [ ] Service method in `source.service.ts`
  
- [ ] Implement Summarization Logic
  - [ ] Generate summary from full text
  - [ ] Generate summary from sections (better accuracy)
  - [ ] Handle large documents (chunking)
  - [ ] Store summary in `aiSummary` field
  - [ ] Update `aiProcessedAt` timestamp
  
- [ ] Add Audit Logging
  - [ ] Log summary generation events
  - [ ] Track AI processing stats
  
- [ ] Testing
  - [ ] Test with various paper lengths
  - [ ] Test with different paper structures
  - [ ] Verify summary quality
  
- [ ] Documentation
  - [ ] API documentation
  - [ ] Usage examples
  - [ ] Testing guide

### Deliverables

- [ ] Summarization endpoint
- [ ] AI-generated summaries stored in database
- [ ] Support for different summary lengths
- [ ] Section-based summarization for accuracy

### Estimated Time

2-3 days

---

## 📋 Phase 3: Key Insights Extraction

**Goal**: Extract structured insights (methodology, findings, limitations).

### Tasks

- [ ] Create Insights Extraction Service
  - [ ] `insights-extraction.service.ts` in AI module
  - [ ] `insights-extraction.prompts.ts` - Structured prompts
  - [ ] `insights-extraction.dto.ts` - Structured response types
  
- [ ] Add Insights Endpoint
  - [ ] `POST /vault/:vaultId/source/:id/extract-insights`
  - [ ] Controller method
  - [ ] Service method
  
- [ ] Implement Extraction Logic
  - [ ] Extract methodology section
  - [ ] Extract key findings (array)
  - [ ] Extract limitations (array)
  - [ ] Extract future work suggestions
  - [ ] Parse JSON response from AI
  - [ ] Store in `aiInsights` field
  
- [ ] Add Validation
  - [ ] Validate JSON structure
  - [ ] Handle parsing errors
  - [ ] Fallback for malformed responses
  
- [ ] Testing
  - [ ] Test with various paper types
  - [ ] Verify JSON structure
  - [ ] Test error handling
  
- [ ] Documentation
  - [ ] API documentation
  - [ ] Insights schema documentation
  - [ ] Usage examples

### Deliverables

- [ ] Insights extraction endpoint
- [ ] Structured insights stored in database
- [ ] JSON schema for insights
- [ ] Validation and error handling

### Estimated Time

2-3 days

---

## 🤖 Phase 4: Research Q&A (RAG System)

**Goal**: Answer questions about sources using semantic search.

### Tasks

#### Part 1: Vector Embeddings Setup

- [ ] Install pgvector Extension
  - [ ] Update database with `CREATE EXTENSION vector`
  - [ ] Update Prisma schema with vector type
  - [ ] Run migration
  
- [ ] Create Embedding Service
  - [ ] `embedding.service.ts` in AI module
  - [ ] `generateEmbedding(text)` method
  - [ ] `generateEmbeddings(texts[])` batch method
  
- [ ] Create Chunking Service
  - [ ] `chunking.service.ts` in Document module
  - [ ] Smart chunking algorithm
  - [ ] Overlap handling
  - [ ] Metadata preservation

#### Part 2: Source Processing

- [ ] Add Chunk Processing Endpoint
  - [ ] `POST /vault/:vaultId/source/:id/process-for-qa`
  - [ ] Split source text into chunks
  - [ ] Generate embeddings for each chunk
  - [ ] Store in SourceChunk table
  
- [ ] Background Processing
  - [ ] Create BullMQ job for processing
  - [ ] Process sources asynchronously
  - [ ] Handle large documents
  - [ ] Progress tracking

#### Part 3: Q&A Implementation

- [ ] Create QA Service
  - [ ] `qa.service.ts` in AI module
  - [ ] `answerQuestion(vaultId, question)` method
  - [ ] Semantic search implementation
  - [ ] Context building from chunks
  
- [ ] Add Q&A Endpoint
  - [ ] `POST /vault/:vaultId/ask`
  - [ ] Controller method
  - [ ] Service integration
  
- [ ] Implement RAG Pipeline
  - [ ] Generate question embedding
  - [ ] Semantic search with pgvector
  - [ ] Retrieve top-k relevant chunks
  - [ ] Build context from chunks
  - [ ] Send to Gemini with context
  - [ ] Return answer with source citations

#### Part 4: Advanced Features

- [ ] Source Filtering
  - [ ] Filter by specific sources
  - [ ] Filter by date range
  - [ ] Filter by tags
  
- [ ] Conversation History
  - [ ] Store Q&A history
  - [ ] Context-aware follow-up questions
  
- [ ] Citation Tracking
  - [ ] Return source IDs with answers
  - [ ] Link to specific chunks/pages

#### Part 5: Testing & Optimization

- [ ] Testing
  - [ ] Test semantic search accuracy
  - [ ] Test with various question types
  - [ ] Test with multiple sources
  - [ ] Performance testing
  
- [ ] Optimization
  - [ ] Embedding caching
  - [ ] Query optimization
  - [ ] Index tuning
  
- [ ] Documentation
  - [ ] RAG architecture documentation
  - [ ] API documentation
  - [ ] Usage examples
  - [ ] Performance guidelines

### Deliverables

- [ ] Vector embeddings for all sources
- [ ] Semantic search with pgvector
- [ ] Q&A endpoint
- [ ] Source citations in answers
- [ ] Background processing for large documents

### Estimated Time

5-7 days

---

## 📊 Progress Tracking

### Overall Progress

- ✅ Phase 1: Complete (100%)
- ⏳ Phase 2: Not Started (0%)
- ⏳ Phase 3: Not Started (0%)
- ⏳ Phase 4: Not Started (0%)

**Total Progress**: 25% (1/4 phases complete)

### Timeline

- **Phase 1**: ✅ Complete
- **Phase 2**: Estimated 2-3 days
- **Phase 3**: Estimated 2-3 days
- **Phase 4**: Estimated 5-7 days

**Total Estimated Time**: 9-13 days for all phases

---

## 🎯 Success Criteria

### Phase 1 (Complete)
- ✅ PDFs automatically extract text on upload
- ✅ Text stored in database
- ✅ Metadata auto-populated
- ✅ Clean, modular architecture

### Phase 2
- [ ] Summaries generated for any source
- [ ] Multiple summary lengths supported
- [ ] Section-based summarization works
- [ ] Summaries stored and retrievable

### Phase 3
- [ ] Insights extracted in structured format
- [ ] JSON schema validated
- [ ] All insight types captured (methodology, findings, limitations)
- [ ] Insights stored and retrievable

### Phase 4
- [ ] Questions answered accurately
- [ ] Semantic search works correctly
- [ ] Source citations provided
- [ ] Performance acceptable (<3s response time)

---

## 🔧 Technical Debt & Future Improvements

### After Phase 4

- [ ] Add DOCX support (create DocxProcessor)
- [ ] Add OCR for scanned PDFs
- [ ] Add batch processing for multiple sources
- [ ] Add caching for AI responses
- [ ] Add rate limiting for AI endpoints
- [ ] Add cost tracking for AI usage
- [ ] Add streaming responses for Q&A
- [ ] Add conversation memory for follow-ups
- [ ] Add multi-language support
- [ ] Add custom prompt templates per vault

---

## 📝 Notes

### Design Decisions

1. **Generic Document Module**: Chose "document" over "pdf" for extensibility
2. **Separate AI Module**: Centralized AI operations for reusability
3. **Prompts in Separate Files**: Easy to update without code changes
4. **DTOs for Everything**: Type safety and auto-generated docs
5. **Graceful Degradation**: Features fail gracefully, don't block uploads

### Lessons Learned

- Text extraction should be async for large files (add to Phase 2)
- Section detection is heuristic-based (could improve with ML)
- PDF metadata is inconsistent (need fallbacks)
- Chunking strategy affects RAG accuracy (test different approaches)

---

**Last Updated**: Phase 1 Complete  
**Next Milestone**: Phase 2 - Smart Summarization  
**Status**: ✅ On Track
