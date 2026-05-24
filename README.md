# ResearchCitadel 🏰

> Your research stronghold - Collaborative research management platform with source organization, annotations, and citation generation.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)

## 🎯 Overview

ResearchCitadel is a comprehensive research management platform designed for researchers, students, and teams who need to organize sources, collaborate on annotations, and generate citations efficiently.

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens
- OTP verification via email (registration, password reset)
- Rate limiting for security-sensitive operations
- Role-based access control (RBAC)

### 📚 Vault Management
- Create private or public research vaults
- Invite team members with granular permissions (Owner, Contributor, Viewer)
- Organize sources by vault with tagging system
- Audit logging for all vault activities

### 📄 Source Management
- Support for multiple source types:
  - PDFs (research papers)
  - Web articles
  - Datasets (GitHub, Kaggle)
  - Videos (YouTube, lectures)
  - Books
- File upload to Cloudflare R2 storage
- AI-powered metadata extraction (title, authors, abstract, keywords)
- Source relationship tracking (cites, contradicts, supports, extends)

### ✍️ Collaborative Annotations
- Rich markdown annotations with HTML rendering
- Page and section references for PDFs
- Real-time edit locking to prevent conflicts
- Version tracking for conflict resolution
- Collaborative editing with WebSocket support

### 📖 Citation Generation
- Auto-generate citations in multiple formats:
  - APA
  - MLA
  - Chicago
  - Harvard
  - IEEE
  - BibTeX
- Cached citation storage for performance
- Export citations for bibliography

### 🔄 Real-Time Collaboration
- WebSocket-based real-time updates
- File upload locks
- Annotation edit locks
- Live collaboration indicators

### 🤖 AI Integration
- Google Gemini AI for metadata extraction
- Automatic abstract and keyword generation
- Smart source categorization

## 🛠️ Tech Stack

### Backend
- **Framework:** NestJS (Node.js)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Cache/Queue:** Redis + BullMQ
- **Storage:** Cloudflare R2 (S3-compatible)
- **Real-time:** Socket.IO
- **AI:** Google Gemini API

### Infrastructure
- **Authentication:** JWT + OTP
- **Email:** Nodemailer
- **API Documentation:** Swagger/OpenAPI
- **Validation:** class-validator + class-transformer

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Cloudflare R2 account (or AWS S3)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/research-citadel-server.git
   cd research-citadel-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Start Redis**
   ```bash
   redis-server
   ```

6. **Run the development server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## 📝 Environment Variables

See `.env.example` for all required variables. Key configurations:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=your_bucket_name
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Email
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# AI
GEMINI_API_KEY=your_gemini_api_key
```

## 📚 API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/docs-json`

### Key Endpoints

- **Auth:** `/api/v1/auth/*` - Registration, login, OTP verification
- **Vaults:** `/api/v1/vault/*` - Vault CRUD, member management
- **Sources:** `/api/v1/source/*` - Source management, file uploads
- **Annotations:** `/api/v1/annotation/*` - Collaborative annotations
- **Citations:** `/api/v1/citation/*` - Citation generation

## 🏗️ Project Structure

```
src/
├── auth/              # Authentication & authorization
├── user/              # User management
├── vault/             # Vault management
├── source/            # Source management
├── annotation/        # Annotation system
├── citation/          # Citation generation
├── storage/           # File storage (R2)
├── mailer/            # Email service
├── common/            # Shared utilities, guards, filters
└── main.ts            # Application entry point
```

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token rotation
- Rate limiting on sensitive endpoints
- OTP verification for critical actions
- CORS configuration
- Input validation and sanitization
- SQL injection prevention (Prisma)
- XSS protection

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 Deployment

### Build for production

```bash
npm run build
npm run start:prod
```

### Docker (Coming Soon)

```bash
docker-compose up -d
```

## 🤝 Contributing

This is a portfolio project, but suggestions and feedback are welcome!

## 📄 License

MIT License - feel free to use this project for learning and portfolio purposes.

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Database ORM by [Prisma](https://www.prisma.io/)
- Storage powered by [Cloudflare R2](https://www.cloudflare.com/products/r2/)
- AI by [Google Gemini](https://ai.google.dev/)

---

⭐ Star this repo if you find it helpful!
