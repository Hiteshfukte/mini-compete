# Mini Compete 

A full-stack competition management platform built with NestJS, Next.js, Prisma, and BullMQ. This system enables organizers to create competitions and participants to register with robust concurrency control, background job processing, and scheduled reminders.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Key Implementation Details](#key-implementation-details)

---

## ✨ Features

### Core Functionality
- **JWT Authentication**: Secure signup/login with role-based access control
- **Competition Management**: Organizers can create and manage competitions
- **Registration System**: Participants can register for competitions with idempotency support
- **Concurrency Control**: Database transactions prevent overselling when multiple users register simultaneously
- **Background Jobs**: Async email confirmations using BullMQ 
- **Email Simulation**: All emails stored in database MailBox table

## 🛠 Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Queue**: BullMQ + Redis 7
- **Authentication**: JWT with Passport

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Native fetch API

### Infrastructure
- **Monorepo**: Turborepo
- **Containerization**: Docker Compose
- **Database Migrations**: Prisma Migrate
- **Development Tools**: Prisma Studio, Redis Commander

---

## 🏗 Architecture

### Concurrency Control Strategy
```typescript
// Prevents race conditions during registration
await prisma.$transaction(async (tx) => {
  // 1. Lock competition row for reading
  const competition = await tx.competition.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } }
  });
  
  // 2. Check capacity (within transaction)
  if (competition._count.registrations >= competition.capacity) {
    throw new ConflictException('Competition is full');
  }
  
  // 3. Create registration (atomic operation)
  return await tx.registration.create({ data: {...} });
});
```

**Why this works:**
- Transaction ensures atomicity (all-or-nothing)
- Database-level locking prevents concurrent modifications
- Capacity check happens within locked context
- No race condition possible between check and insert

### Idempotency Implementation
```typescript
// 1. Check if idempotency key exists
if (idempotencyKey) {
  const existing = await prisma.registration.findUnique({
    where: { idempotencyKey }
  });
  if (existing) return existing; // Return cached result
}

// 2. Process registration with idempotency key
const registration = await prisma.registration.create({
  data: { userId, competitionId, idempotencyKey }
});
```

**Benefits:**
- Client can safely retry failed requests
- No duplicate registrations from network issues
- Unique constraint on idempotencyKey ensures safety

### Background Job Architecture
```
Registration Created
       ↓
Add Job to Queue (BullMQ)
       ↓
Worker Process Picks Up Job
       ↓
Send Confirmation Email

---

## 🚀 Setup Instructions

### Prerequisites
```bash
node --version  # v18.0.0 or higher
docker --version  # Docker Desktop installed
npm --version  # v9.0.0 or higher
```

### Installation

**1. Clone Repository**
```bash
git clone <repository-url>
cd mini-compete
```

**2. Install Dependencies**
```bash
# Root dependencies
npm install

# Backend dependencies
cd apps/backend
npm install

# Frontend dependencies
cd ../frontend
npm install
cd ../..
```

**3. Environment Setup**
```bash
# Copy environment files
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env

# Edit .env files if needed (default values work for local development)
```

**4. Start Docker Services**
```bash
docker compose up -d

# Verify services are running
docker compose ps
# Should show: mini-compete-postgres (Up), mini-compete-redis (Up)
```

**5. Database Setup**
```bash
cd apps/backend

# Run migrations
npx prisma migrate dev --name init

# Seed database with test data
npx prisma db seed

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

**6. Start Development Servers**
```bash
# Terminal 1 - Backend
cd apps/backend
npm run start:dev
# Should show: ✅ Application is running on: http://localhost:3001

# Terminal 2 - Frontend
cd apps/frontend
npm run dev
# Should show: ▲ Next.js ready on http://localhost:3000
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555 (run `npx prisma studio`)

---

## 📚 API Documentation

### Authentication Endpoints

#### POST /auth/signup
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "PARTICIPANT" // or "ORGANIZER"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "PARTICIPANT"
  }
}
```

#### POST /auth/login
Login with existing credentials.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as signup

#### GET /auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "PARTICIPANT"
}
```

---

### Competition Endpoints

#### POST /competitions
Create a competition (organizer only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "title": "Hackathon 2025",
  "description": "Build the next big thing in 48 hours",
  "tags": ["coding", "hackathon"],
  "capacity": 100,
  "regDeadline": "2025-11-01T23:59:59Z",
  "startDate": "2025-11-02T09:00:00Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Hackathon 2025",
  "description": "Build the next big thing in 48 hours",
  "tags": ["coding", "hackathon"],
  "capacity": 100,
  "regDeadline": "2025-11-01T23:59:59.000Z",
  "startDate": "2025-11-02T09:00:00.000Z",
  "createdById": "uuid",
  "createdAt": "2025-10-16T00:00:00.000Z",
  "updatedAt": "2025-10-16T00:00:00.000Z"
}
```

#### GET /competitions
List all competitions.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Hackathon 2025",
    "organizer": {
      "id": "uuid",
      "name": "Alice Johnson",
      "email": "alice@organizer.com"
    },
    "_count": {
      "registrations": 15
    },
    // ... other fields
  }
]
```

#### GET /competitions/:id
Get competition details.

**Response:** Same as POST /competitions response

#### POST /competitions/:id/register
Register for a competition (participant only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
idempotency-key: unique-key-12345  // Optional but recommended
```

**Request Body:** `{}`

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "competitionId": "uuid",
  "registeredAt": "2025-10-16T00:00:00.000Z",
  "user": { /* user object */ },
  "competition": { /* competition object */ }
}
```

**Error Responses:**
- `409 Conflict`: Already registered or competition full
- `400 Bad Request`: Registration deadline passed
- `404 Not Found`: Competition not found

#### GET /competitions/my-registrations
Get current user's registrations.

**Response:**
```json
[
  {
    "id": "uuid",
    "registeredAt": "2025-10-16T00:00:00.000Z",
    "competition": {
      "id": "uuid",
      "title": "Hackathon 2025",
      "description": "...",
      "capacity": 100,
      "regDeadline": "2025-11-01T23:59:59.000Z"
    }
  }
]
```

---

## 🧪 Testing

### Test Credentials
```
Organizer:
  Email: alice@organizer.com
  Password: password123

Participant:
  Email: charlie@participant.com
  Password: password123
```

### Manual Testing Flow

**1. Test Authentication**
```bash
# Signup
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"password123","role":"PARTICIPANT"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@organizer.com","password":"password123"}'
```

**2. Test Competition Creation**
```bash
TOKEN="<your-token>"

curl -X POST http://localhost:3001/competitions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Competition",
    "description":"Testing",
    "tags":["test"],
    "capacity":50,
    "regDeadline":"2025-12-31T23:59:59Z",
    "startDate":"2026-01-01T09:00:00Z"
  }'
```

**3. Test Registration with Idempotency**
```bash
PARTICIPANT_TOKEN="<participant-token>"
COMPETITION_ID="<competition-id>"

# First registration
curl -X POST http://localhost:3001/competitions/$COMPETITION_ID/register \
  -H "Authorization: Bearer $PARTICIPANT_TOKEN" \
  -H "idempotency-key: test-key-123" \
  -H "Content-Type: application/json" \
  -d '{}'

# Retry with same key (should return same result)
curl -X POST http://localhost:3001/competitions/$COMPETITION_ID/register \
  -H "Authorization: Bearer $PARTICIPANT_TOKEN" \
  -H "idempotency-key: test-key-123" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**4. Verify Background Jobs**
```bash
# Check MailBox table
cd apps/backend
npx prisma studio
# Navigate to MailBox table - should see confirmation email

# Check Redis queue
# Open http://localhost:8081 to see job processing
```

**5. Test Concurrency (Advanced)**
```bash
# Use Apache Bench or similar tool to simulate concurrent requests
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -p registration.json \
  http://localhost:3001/competitions/$COMPETITION_ID/register
```

---

## 📁 Project Structure

```
mini-compete/
├── apps/
│   ├── backend/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── auth/              # Authentication module
│   │   │   │   ├── decorators/    # Custom decorators (Roles)
│   │   │   │   ├── guards/        # Auth guards (JWT, Roles)
│   │   │   │   ├── strategies/    # Passport strategies
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.module.ts
│   │   │   ├── competitions/      # Competition module
│   │   │   │   ├── dto/           # Data Transfer Objects
│   │   │   │   ├── competitions.controller.ts
│   │   │   │   ├── competitions.service.ts
│   │   │   │   └── competitions.module.ts
│   │   │   ├── queue/             # Background job processing
│   │   │   │   ├── queue.processor.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   └── queue.module.ts
│   │   │   ├── cron/              # Scheduled tasks
│   │   │   │   ├── cron.service.ts
│   │   │   │   └── cron.module.ts
│   │   │   ├── prisma/            # Prisma service
│   │   │   │   ├── prisma.service.ts
│   │   │   │   └── prisma.module.ts
│   │   │   ├── app.module.ts      # Root module
│   │   │   └── main.ts            # Entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Database schema
│   │   │   ├── seed.ts            # Seed script
│   │   │   └── migrations/        # Migration history
│   │   ├── .env                   # Environment variables
│   │   └── package.json
│   │
│   └── frontend/                   # Next.js Frontend
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   └── signup/
│       │   ├── competitions/
│       │   │   ├── [id]/
│       │   │   ├── create/
│       │   │   └── page.tsx
│       │   ├── my-registrations/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/            # Reusable components
│       ├── lib/                   # Utilities
│       ├── public/
│       └── package.json
│
├── docker-compose.yml             # Docker services configuration
├── turbo.json                     # Turborepo configuration
├── package.json                   # Root package.json
├── .gitignore
└── README.md
```

---

**Configuration:**
```typescript
await registrationQueue.add('confirmation', data, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // 2s, 4s, 8s
  }
});
```

**Error Handling:**
- Transient errors (network) → Retry with backoff
- Permanent errors (invalid data) → Store in FailedJob table
- All failures logged for debugging

---

### 4. Scheduled Reminders (Cron)

**Implementation:**
```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async sendReminders() {
  // Find competitions starting in 24 hours
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const competitions = await prisma.competition.findMany({
    where: {
      startDate: { gte: tomorrow, lt: dayAfter },
    },
    include: { registrations: { include: { user: true } } }
  });
  
  // Enqueue reminder jobs
  for (const comp of competitions) {
    for (const reg of comp.registrations) {
      await queueService.addReminderJob({...});
    }
  }
}
```

**Why enqueue instead of sending directly:**
- Non-blocking (cron completes quickly)
- Retry support for failed emails
- Rate limiting possible
- Scalable (can process millions of reminders)

---

## 📊 Database Schema

### Key Models

**User**
```prisma
model User {
  id            String          @id @default(uuid())
  email         String          @unique
  password      String          // bcrypt hashed
  name          String
  role          Role            // ORGANIZER | PARTICIPANT
  competitions  Competition[]   // Created competitions
  registrations Registration[]  // Registered competitions
  mailbox       MailBox[]       // Received emails
}
```

**Competition**
```prisma
model Competition {
  id            String          @id @default(uuid())
  title         String
  description   String
  tags          String[]
  capacity      Int
  regDeadline   DateTime
  startDate     DateTime?
  createdById   String
  organizer     User            @relation(...)
  registrations Registration[]
  deletedAt     DateTime?       // Soft delete
}
```

**Registration**
```prisma
model Registration {
  id              String      @id @default(uuid())
  userId          String
  competitionId   String
  idempotencyKey  String?     @unique
  registeredAt    DateTime    @default(now())
  
  @@unique([userId, competitionId])  // One registration per user per competition
}
```

**MailBox** (Email Simulation)
```prisma
model MailBox {
  id        String   @id @default(uuid())
  userId    String
  to        String   // Email address
  subject   String
  body      String
  sentAt    DateTime @default(now())
  jobId     String?  // BullMQ job ID
}
```

**FailedJob** (Dead Letter Queue)
```prisma
model FailedJob {
  id        String   @id @default(uuid())
  jobName   String
  jobData   Json
  error     String
  attempts  Int
  failedAt  DateTime @default(now())
}
```


---


### Scaling Considerations
- **Database**: Connection pooling, read replicas
- **Workers**: Multiple worker instances processing same queue
- **API**: Horizontal scaling behind load balancer
- **Redis**: Redis Cluster for high availability
- **Monitoring**: Track queue length, job processing time

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request


