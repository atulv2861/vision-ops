# Traffic Violation Backend

NestJS backend API with all core modules from events-server.

## Core Modules Available

All `libs/common` modules have been created matching the events-server structure:

✅ **Core Infrastructure:**
- `config` - Configuration management (app, database, jwt, redis)
- `prisma` - Database ORM service
- `logger` - Pino logger integration
- `utils` - Utility functions and services

✅ **Authentication & Authorization:**
- `jwt` - JWT configuration and services
- `guards` - Auth guards (JWT, Local, Role-based, Combined, API Key)
- `decorators` - Custom decorators (CurrentUser, Roles)

✅ **Data Management:**
- `dtos` - Data Transfer Objects
- `interfaces` - TypeScript interfaces
- `exceptions` - Exception filters (Prisma errors)
- `interceptors` - Response and logout interceptors

✅ **Cloud Services:**
- `aws` - AWS S3 service (minimal stub)
- `gcp` - Google Cloud Platform service (stub)
- `storage` - Generic storage interface

✅ **Communication:**
- `mail` - Email service (stub)
- `whatsapp` - WhatsApp messaging service (stub)
- `kafka` - Kafka producer/consumer (stub)

✅ **Data Processing:**
- `elastic` - Elasticsearch service (stub)
- `redis` - Redis caching service (full implementation)
- `mongodb` - MongoDB module (stub)
- `labelling` - Data labelling service (stub)
- `zip` - Zip compression service (stub)
- `triming` - Video trimming service (stub)

✅ **Utilities:**
- `datetime-zone` - Timezone formatting utilities
- `enums` - Common enumerations

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Create a `.env` file:

```env
# App
NODE_ENV=development
APP_PORT=3000
APP_URL=http://localhost:3000
APP_NAME=traffic-violation-api

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/traffic_violation

# JWT (optional)
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=3600

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=tv:
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Migrations

```bash
npm run prisma:migrate
```

### 5. Start Development Server

```bash
npm run start:dev
```

## Project Structure

```
backend/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   └── app.service.ts       # Root service
├── libs/
│   └── common/              # Shared library
│       └── src/             # All core modules
├── prisma/
│   └── schema.prisma        # Database schema
├── package.json
├── nest-cli.json
└── tsconfig.json
```

## Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in watch mode
- `npm run build` - Build the application
- `npm run test` - Run tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Notes

- Core modules marked as "stub" are minimal implementations ready for expansion
- All modules follow the same pattern as `events-server`
- Redis service has full implementation
- Other cloud services (AWS, GCP, Kafka, etc.) can be expanded as needed
