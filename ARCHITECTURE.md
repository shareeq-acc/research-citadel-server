# Research Citadel - Backend Architecture

## Phase 1: Document Processing & AI Foundation

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Application                           │
│                    (Next.js Frontend - Phase 1)                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP/REST API
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NestJS Backend Server                        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      API Layer                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Source     │  │  Annotation  │  │    Vault     │      │   │
│  │  │  Controller  │  │  Controller  │  │  Controller  │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                  │                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Business Logic Layer                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Source     │  │  Annotation  │  │    Vault     │      │   │
│  │  │   Service    │  │   Service    │  │   Service    │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                  │                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Core Services Layer                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Document   │  │      AI      │  │   Storage    │      │   │
│  │  │  Extraction  │  │   Services   │  │   Service    │      │   │
│  │  │   Service    │  │   (Gemini)   │  │  (R2/S3)     │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                  │                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Data Access Layer                         │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │              Prisma ORM                              │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌────────────────────┐      ┌────────────────────┐
        │   PostgreSQL DB    │      │  Cloudflare R2     │
        │  (Source Data)     │      │  (File Storage)    │
        └────────────────────┘      └────────────────────┘
                    │
                    ▼
        ┌────────────────────┐
        │  Google Gemini API │
        │  (AI Processing)   │
        └────────────────────┘
```

## Module Architecture

### Document Module (Phase 1)

```
┌─────────────────────────────────────────────────────────────┐
│                      Document Module                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │       DocumentExtractionService                    │    │
│  │  - extractText(buffer, mimeType)                   │    │
│  │  - splitTextIntoChunks(text, size)                 │    │
│  │  - extractSections(text)                           │    │
│  │  - isSupported(mimeType)                           │    │
│  └────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         │ uses                               │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │         IDocumentProcessor Interface               │    │
│  │  - extractText(buffer): Promise<Result>            │    │
│  │  - supports(mimeType): boolean                     │    │
│  │  - getSupportedMimeTypes(): string[]               │    │
│  └────────────────────────────────────────────────────┘    │
│                         │                                    │
│           ┌─────────────┴─────────────┐                     │
│           ▼                           ▼                     │
│  ┌─────────────────┐        ┌─────────────────┐           │
│  │  PdfProcessor   │        │  DocxProcessor  │           │
│  │  (pdf-parse)    │        │  (future)       │           │
│  └─────────────────┘        └─────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### AI Module (Phase 1)

```
┌─────────────────────────────────────────────────────────────┐
│                         AI Module                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              GeminiService                         │    │
│  │  - generateContent(prompt, system)                 │    │
│  │  - generateContentStream(prompt)                   │    │
│  │  - getModel(name, instruction)                     │    │
│  │  - isConfigured()                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         │ used by                            │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │       MarkdownEnhanceService (Phase 1)             │    │
│  │  - enhanceMarkdown(content): Promise<string>       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │       SummarizationService (Phase 2)               │    │
│  │  - generateSummary(text): Promise<string>          │    │
│  │  - generateSummaryFromSections(sections)           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │       InsightsExtractionService (Phase 3)          │    │
│  │  - extractInsights(text): Promise<Insights>        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │       EmbeddingService (Phase 4)                   │    │
│  │  - generateEmbedding(text): Promise<number[]>      │    │
│  │  - generateEmbeddings(texts): Promise<number[][]>  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │       QaService (Phase 4)                          │    │
│  │  - answerQuestion(vaultId, question)               │    │
│  │  - processSourceForQA(sourceId)                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Source Upload Flow (Phase 1)

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /vault/:id/source
     │ multipart/form-data
     │ file: research.pdf
     ▼
┌─────────────────┐
│ SourceController│
└────┬────────────┘
     │ createWithFile()
     ▼
┌─────────────────┐
│  SourceService  │
└────┬────────────┘
     │
     ├─────────────────────────────────────────┐
     │                                         │
     ▼                                         ▼
┌──────────────┐                    ┌──────────────────────┐
│StorageService│                    │DocumentExtraction    │
│              │                    │Service               │
│ uploadFile() │                    │                      │
└──────┬───────┘                    │ extractText()        │
       │                            └──────┬───────────────┘
       │ Upload to R2                      │
       │                                   │ Extract text
       ▼                                   ▼
┌──────────────┐                    ┌──────────────────────┐
│Cloudflare R2 │                    │  PdfProcessor        │
│              │                    │                      │
│ File stored  │                    │  pdf-parse library   │
└──────────────┘                    └──────┬───────────────┘
                                           │
                                           │ Return text + metadata
                                           ▼
                                    ┌──────────────────────┐
                                    │  Extraction Result   │
                                    │  - text              │
                                    │  - metadata          │
                                    │  - wordCount         │
                                    └──────┬───────────────┘
                                           │
     ┌─────────────────────────────────────┘
     │
     ▼
┌─────────────────┐
│  Create Source  │
│  in Database    │
│                 │
│  - title        │
│  - fileId       │
│  - extractedText│ ← NEW
│  - metadata     │ ← NEW
│  - textExtracted│ ← NEW
│    At           │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Create Audit   │
│  Logs           │
│                 │
│  - SOURCE_ADDED │
│  - FILE_UPLOADED│
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Emit WebSocket │
│  Event          │
│                 │
│  sourceCreated  │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Return Source  │
│  with extracted │
│  text to client │
└─────────────────┘
```

## Database Schema (Phase 1 Updates)

```
┌─────────────────────────────────────────────────────────────┐
│                        Source Table                          │
├─────────────────────────────────────────────────────────────┤
│ id                UUID PRIMARY KEY                           │
│ vaultId           UUID FOREIGN KEY                           │
│ createdBy         UUID FOREIGN KEY                           │
│ title             VARCHAR                                    │
│ authors           TEXT[]                                     │
│ publication       VARCHAR                                    │
│ year              INTEGER                                    │
│ externalUrl       VARCHAR                                    │
│ sourceType        ENUM                                       │
│ fileId            UUID FOREIGN KEY                           │
│ abstract          TEXT                                       │
│ keywords          TEXT[]                                     │
│ ─────────────────────────────────────────────────────────── │
│ extractedText     TEXT              ← NEW (Phase 1)         │
│ extractedMetadata JSONB             ← NEW (Phase 1)         │
│ textExtractedAt   TIMESTAMP         ← NEW (Phase 1)         │
│ ─────────────────────────────────────────────────────────── │
│ aiSummary         TEXT              ← NEW (Phase 2)         │
│ aiInsights        JSONB             ← NEW (Phase 3)         │
│ aiProcessedAt     TIMESTAMP         ← NEW (Phase 2/3)       │
│ ─────────────────────────────────────────────────────────── │
│ createdAt         TIMESTAMP                                  │
│ updatedAt         TIMESTAMP                                  │
│ deletedAt         TIMESTAMP                                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SourceChunk Table                         │
│                    (Phase 4 - RAG)                           │
├─────────────────────────────────────────────────────────────┤
│ id                UUID PRIMARY KEY                           │
│ sourceId          UUID FOREIGN KEY                           │
│ vaultId           UUID FOREIGN KEY                           │
│ chunkText         TEXT                                       │
│ chunkIndex        INTEGER                                    │
│ pageNumber        INTEGER                                    │
│ embedding         VECTOR(768)        ← Phase 4 (pgvector)   │
│ createdAt         TIMESTAMP                                  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Text Extraction

```
┌─────────────┐
│   PDF File  │
│   (Buffer)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│      PdfProcessor                   │
│                                     │
│  1. Parse PDF with pdf-parse        │
│  2. Extract text content            │
│  3. Extract metadata                │
│     - Title                         │
│     - Author                        │
│     - Pages                         │
│     - Creation date                 │
│  4. Count words                     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   DocumentExtractionResult          │
│                                     │
│   {                                 │
│     text: "Full content...",        │
│     metadata: {                     │
│       title: "Paper Title",         │
│       author: "John Doe",           │
│       pages: 12                     │
│     },                              │
│     wordCount: 7500,                │
│     characterCount: 45000           │
│   }                                 │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Store in Database                 │
│                                     │
│   Source.extractedText = text       │
│   Source.extractedMetadata = meta   │
│   Source.textExtractedAt = now()    │
└─────────────────────────────────────┘
```

## Future Phases Preview

### Phase 2: Summarization Flow
```
Source.extractedText
       │
       ▼
SummarizationService
       │
       ▼
Gemini API (with prompt)
       │
       ▼
Source.aiSummary (stored)
```

### Phase 3: Insights Extraction Flow
```
Source.extractedText
       │
       ▼
extractSections()
       │
       ▼
InsightsExtractionService
       │
       ▼
Gemini API (structured JSON)
       │
       ▼
Source.aiInsights (stored)
```

### Phase 4: RAG Q&A Flow
```
Source.extractedText
       │
       ▼
Split into chunks
       │
       ▼
Generate embeddings
       │
       ▼
Store in SourceChunk
       │
       ▼
User asks question
       │
       ▼
Generate question embedding
       │
       ▼
Semantic search (pgvector)
       │
       ▼
Retrieve relevant chunks
       │
       ▼
Send to Gemini with context
       │
       ▼
Return answer
```

## Technology Stack

### Backend Framework
- **NestJS**: Modular architecture, dependency injection
- **TypeScript**: Type safety, better DX

### Database
- **PostgreSQL**: Relational data
- **Prisma ORM**: Type-safe database access
- **pgvector**: Vector similarity search (Phase 4)

### File Storage
- **Cloudflare R2**: S3-compatible object storage

### AI Services
- **Google Gemini**: Text generation, embeddings
- **pdf-parse**: PDF text extraction

### Real-time
- **Socket.io**: WebSocket for collaboration

### Background Jobs
- **BullMQ**: Job queue (ready for async processing)

## Security & Permissions

```
┌─────────────────────────────────────────────────────────────┐
│                    Permission Flow                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   AuthGuard           │
              │   (JWT validation)    │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Check Vault Member   │
              │  (OWNER/CONTRIBUTOR/  │
              │   VIEWER)             │
              └───────────┬───────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
        ┌───────────────┐   ┌───────────────┐
        │  Read Access  │   │  Write Access │
        │  (All roles)  │   │  (OWNER/      │
        │               │   │   CONTRIBUTOR)│
        └───────────────┘   └───────────────┘
```

## Performance Considerations

### Text Extraction
- ✅ One-time processing during upload
- ✅ Cached in database
- ✅ Async processing ready (BullMQ)

### AI Processing
- ✅ Chunking for large documents
- ✅ Token limit management
- ✅ Streaming support (Phase 4)

### Database
- ✅ Indexed fields (vaultId, sourceId, createdAt)
- ✅ Soft deletes (deletedAt)
- ✅ Pagination support

---

**Current Status**: Phase 1 Complete ✅  
**Next**: Phase 2 - Smart Summarization
