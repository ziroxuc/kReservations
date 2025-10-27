# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kafè Restaurant Reservation System - A production-ready NestJS backend implementing pessimistic locking for concurrent reservations with real-time WebSocket updates. Built with TypeScript, Prisma, PostgreSQL, and Domain-Driven Design principles.

## Key Commands

### Docker Operations (Recommended)
```bash
# Start all services (PostgreSQL + Backend)
docker compose up -d

# View backend logs
docker compose logs -f backend

# Restart backend after code changes
docker compose restart backend

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Rebuild containers
docker compose up -d --build
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- reservation.service.spec.ts
```

### Prisma Database Commands
```bash
# Generate Prisma client (after schema changes)
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Open Prisma Studio GUI
npm run prisma:studio

# Seed database
npm run prisma:seed
```

### Local Development (without Docker)
```bash
# Install dependencies
npm install

# Start dev server with hot-reload
npm run start:dev

# Build for production
npm run build

# Start production build
npm run start:prod
```

## Architecture

### Core Concepts

**Multi-Table Reservation System:**
- Each region has multiple tables (e.g., Main Hall has 2 tables of 12 people each)
- Availability tracked at table-level granularity, not just region-level
- Each reservation locks one table in a specific region for a time slot
- Formula: `availableTables = region.tables - occupiedTablesCount`

**Pessimistic Locking Flow:**
1. User calls `/api/reservations/lock` → Creates temporary lock (5 min TTL) with status='LOCKED', reserves 1 table
2. User completes form → Calls `/api/reservations` → Updates lock to status='CONFIRMED'
3. Cron job runs every minute → Deletes expired locks where `lockedUntil < now()`
4. When lock expires → Table becomes available again for new reservations

**Real-time Updates via WebSockets:**
- Namespace: `/reservations`
- Clients subscribe to date-specific rooms: `availability:${date}`
- Server emits `availability:changed` when slots are locked/confirmed/released
- Server emits `lock:expired` globally when locks expire

### Module Structure

```
src/
├── common/
│   ├── constants/business-rules.constants.ts   # All business rules, time slots, region configs
│   ├── filters/http-exception.filter.ts         # Global exception handling
│   └── pipes/validation.pipe.ts                 # Custom validation
│
├── domain/                                       # Domain-Driven Design layer
│   ├── value-objects/                           # Immutable value objects with validation
│   │   ├── email.vo.ts                          # Email validation & normalization
│   │   ├── phone-number.vo.ts                   # Phone format validation (international)
│   │   └── date-time-slot.vo.ts                 # Date range & time slot validation
│   └── services/
│       └── region-validator.service.ts          # Business rules for region constraints
│
├── modules/
│   ├── prisma/                                  # Database module (global)
│   │   ├── prisma.service.ts                    # Prisma client lifecycle management
│   │   └── prisma.module.ts
│   │
│   ├── region/                                  # Region management module
│   │   ├── region.controller.ts                 # REST endpoints for GET /regions
│   │   ├── region.service.ts                    # Region queries & business logic
│   │   └── region.module.ts
│   │
│   ├── availability/                            # Availability checking module
│   │   ├── availability.controller.ts           # REST endpoints for slots/check/alternatives
│   │   ├── availability.service.ts              # Table counting & availability queries
│   │   └── dto/                                 # Request/response DTOs
│   │
│   └── reservation/                             # Reservation management module
│       ├── reservation.controller.ts            # REST endpoints for lock/create/release
│       ├── reservation.service.ts               # Business logic with table-level locking
│       ├── reservation.gateway.ts               # WebSocket gateway (@nestjs/websockets)
│       ├── lock-cleanup.service.ts              # Cron job (@Cron) for expired locks
│       └── dto/
│
├── app.module.ts                                # Root module, imports all feature modules
└── main.ts                                      # Bootstrap, Swagger setup, CORS, global pipes
```

### Database Schema (Prisma)

**Region Table** (Database-driven configuration):
- Stores restaurant regions as database records, not enums
- Fields: `id` (UUID), `name`, `displayName`, `capacity` (per table), `tables` (count), `allowChildren`, `allowSmoking`, `isActive`
- Each region defines: capacity per table, number of tables, and business rules
- Example: Main Hall = 2 tables × 12 people/table = 24 total capacity
- Seeded with 4 default regions via `prisma/seed.ts`

**Reservation Table**:
- Handles both LOCKED (temporary) and CONFIRMED (final) reservations using `status` enum
- Key fields for locking: `status`, `lockedUntil`, `lockedBy` (sessionId)
- Foreign key: `regionId` → `Region.id` (references region table)
- Each reservation reserves 1 table in the specified region
- Indexes: `[date, timeSlot, regionId]`, `[status, lockedUntil]`, `[lockedBy]`

**Enums:**
- `ReservationStatus`: LOCKED, CONFIRMED, CANCELLED

**Key Change from Enum to Table:**
- Previously: Region was an enum (MAIN_HALL, BAR, etc.)
- Now: Region is a database table with UUIDs, allowing dynamic configuration
- Migration handles conversion from enum to foreign key relationship

## Business Rules (Critical)

### Restaurant Regions (Stored in Database)

| Region | Tables | Capacity/Table | Total Capacity | Children | Smoking |
|--------|--------|----------------|----------------|----------|---------|
| **Main Hall** | 2 | 12 people | 24 people | ✅ | ❌ |
| **Bar** | 4 | 4 people | 16 people | ❌ | ❌ |
| **Riverside** | 3 | 8 people | 24 people | ✅ | ❌ |
| **Riverside Smoking** | 5 | 6 people | 30 people | ❌ | ✅ |

**Key Points:**
- Region data is dynamically generated with UUIDs via `prisma/seed.ts` - UUIDs may differ across database resets
- Use UUIDs in API requests (DTOs accept `regionId` as UUID string)
- Query `/api/regions` endpoint to retrieve all regions dynamically and get current UUIDs
- Total capacity = tables × capacity (e.g., Main Hall: 2 × 12 = 24)
- **IMPORTANT**: Never hardcode region UUIDs - always query the `/api/regions` endpoint first

### Validation Rules
- **Time Slots**: 18:00 - 22:00 (30-minute intervals)
- **Date Range**: July 24-31, 2025
- **Party Size**: 1-12 people (must fit within region's per-table capacity)
- **Children**: If `childrenCount > 0`, region MUST allow children (not BAR or RIVERSIDE_SMOKING)
- **Smoking**: If `hasSmokingRequest = true`, region MUST be RIVERSIDE_SMOKING
- **Lock Duration**: 5 minutes (configurable via `LOCK_DURATION_MINUTES` env var)
- **Table Availability**: Each reservation locks exactly 1 table in the region

These rules are enforced in:
- `business-rules.constants.ts` (source of truth for date ranges, time slots, party size)
- `Region` database table (source of truth for region-specific rules like capacity, tables, allowChildren, allowSmoking)
- `RegionValidatorService` (domain service querying region table)
- `RegionService` (retrieves and filters regions based on party requirements)
- DTOs with class-validator decorators

## Development Patterns

### Adding New Business Rules
1. **For global rules** (date ranges, time slots): Update `business-rules.constants.ts`
2. **For region-specific rules**: Modify `Region` table in database or update seed data in `prisma/seed.ts`
3. **For validation logic**: Update `RegionValidatorService` or `RegionService`
4. Add validation in corresponding DTO with class-validator decorators
5. Write tests in `test/*.spec.ts` with proper mocks for `RegionService`

### Working with Regions
- **Retrieving regions**: Use `RegionService.getAllRegions()` or `RegionService.getRegionById(id)`
- **Filtering by party requirements**: Use `RegionService.getValidRegionsForParty(partySize, childrenCount, hasSmokingRequest)`
- **Adding new regions**: Insert via Prisma Studio or add to `prisma/seed.ts` and re-run `npm run prisma:seed`
- **Updating region config**: Directly update via Prisma Studio or write migration
- Always use UUIDs when referencing regions in DTOs and API calls

### Table Availability Logic
```typescript
// Count occupied tables for a specific slot
const occupiedTablesCount = await prisma.reservation.count({
  where: {
    date: targetDate,
    timeSlot: targetTimeSlot,
    regionId: targetRegionId,
    status: { in: [ReservationStatus.LOCKED, ReservationStatus.CONFIRMED] }
  }
});

// Calculate available tables
const region = await regionService.getRegionById(targetRegionId);
const availableTables = region.tables - occupiedTablesCount;

if (availableTables <= 0) {
  throw new ConflictException('No tables available');
}
```

### Working with WebSockets
- Use `ReservationGateway.notifyAvailabilityChange()` to broadcast changes
- Use `ReservationGateway.notifyLockExpired()` for lock expiration events
- Always emit events after DB changes (locks, confirmations, deletions)

### Testing Strategy
- Mock `PrismaService` with jest functions (see `test/reservation.service.spec.ts`)
- Mock `RegionService` to return region objects with all fields (id, name, capacity, tables, etc.)
- Mock `ReservationGateway` to verify WebSocket events are emitted
- Test both happy paths and edge cases (expired locks, business rule violations, no tables available)
- Use real region UUIDs in test data (from seed.ts)
- Coverage includes: ReservationService, AvailabilityService

**Example Mock Setup:**
```typescript
const mockRegion = {
  id: 'uuid-string-here',
  name: 'MAIN_HALL',
  displayName: 'Main Hall',
  capacity: 12,
  tables: 2,
  allowChildren: true,
  allowSmoking: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

mockRegionService.getRegionById.mockResolvedValue(mockRegion);
mockPrismaService.reservation.count.mockResolvedValue(1); // 1 of 2 tables occupied
```

### Making Schema Changes
1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:generate` to update client
3. Run `npm run prisma:migrate` to create migration
4. If adding required fields or changing relationships, may need to clean database first: `docker compose down -v`
5. Restart backend: `docker compose restart backend` (or `docker compose up -d` if using clean database)
6. Re-run seed if database was cleaned: `npm run prisma:seed`

## Environment Variables

Required in `.env`:
```bash
DATABASE_URL="postgresql://kafe_user:kafe_pass@postgres:5432/kafe_db?schema=public"
NODE_ENV=development
PORT=3000
LOCK_DURATION_MINUTES=5
CORS_ORIGIN=http://localhost:3001
```

**Note**: When using Docker Compose, the DB host is `postgres` (service name). For local dev, use `localhost`.

## Common Issues

### Docker Permission Errors
Use `docker compose` (with space) instead of `docker-compose`. If permission denied, use `sudo` or add user to docker group: `sudo usermod -aG docker $USER && newgrp docker`

### Port Already in Use
If port 5432 or 3000 is taken, either stop the conflicting service or change ports in `docker-compose.yml`

### Database Connection Issues
Ensure PostgreSQL is healthy before backend starts. Docker Compose handles this via `depends_on.condition: service_healthy`

### Prisma Client Out of Sync
Run `npm run prisma:generate` after pulling schema changes or switching branches

## API Documentation

Swagger docs available at: `http://localhost:3000/api/docs`

### Key Endpoints

**Regions:**
- `GET /api/regions` - Get all active regions with their configurations (tables, capacity, rules)

**Availability:**
- `GET /api/availability/slots?date=YYYY-MM-DD` - Get available slots showing tables available per region
- `POST /api/availability/check` - Check if specific slot has available tables (requires `regionId` UUID)
- `GET /api/availability/alternatives` - Get alternative slots with table availability

**Reservations:**
- `POST /api/reservations/lock` - Lock 1 table temporarily (requires `regionId` UUID and `sessionId`)
- `POST /api/reservations` - Confirm reservation from lock (requires same `sessionId` and `regionId`)
- `GET /api/reservations/:id` - Get reservation by ID
- `DELETE /api/reservations/lock/:sessionId` - Release lock manually (frees up table)

## Code Style Notes

- Use NestJS dependency injection for all services
- Follow Repository pattern: Controllers → Services → Prisma
- Value Objects for domain validation (Email, PhoneNumber, DateTimeSlot)
- Domain Services for complex business logic (RegionValidatorService, RegionService)
- Always emit WebSocket events after state changes
- Use class-validator decorators in DTOs, not manual validation
- Indexes are critical for performance: review `prisma/schema.prisma` before adding queries
- Use UUIDs for region references, not enums or string names
- Always query `RegionService` for region data, don't hardcode region configurations

## Migration Notes (Region Enum → Table)

**What Changed:**
- Region was previously an enum in `schema.prisma`: `enum Region { MAIN_HALL, BAR, RIVERSIDE, RIVERSIDE_SMOKING }`
- Now it's a database table with relationships
- All region-specific configurations (capacity, tables, rules) moved from constants to database

**Migration Impact:**
- Reservation table now uses `regionId String` (foreign key) instead of `region Region` (enum)
- All DTOs updated from enum to UUID strings with examples
- RegionValidatorService queries database instead of using hardcoded constants
- Swagger documentation updated with real UUIDs

**Breaking Changes:**
- API clients must use UUIDs (e.g., `73d5aa2b-026f-4f1b-b189-ad2ea8b8167d`) instead of enum strings (e.g., `MAIN_HALL`)
- Query `/api/regions` endpoint to get current region UUIDs
- Tests must mock RegionService with full region objects

**Benefits:**
- Dynamic region configuration without code changes
- Per-table capacity tracking (2 tables × 12 people vs 1 region × 24 people)
- Table-level granularity for reservations
- Can add/modify regions via database without deploying new code

## Quick API Testing

To quickly test the API endpoints:

```bash
# Get all regions (use this to retrieve current UUIDs)
curl http://localhost:3000/api/regions

# Check available slots for a date
curl "http://localhost:3000/api/availability/slots?date=2025-07-24"

# Lock a slot (replace {regionId} with actual UUID from /api/regions)
curl -X POST http://localhost:3000/api/reservations/lock \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-07-24",
    "timeSlot": "19:00",
    "regionId": "{regionId}",
    "sessionId": "test-session-123"
  }'

# Create reservation (within 5 minutes of locking)
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-07-24",
    "timeSlot": "19:00",
    "regionId": "{regionId}",
    "sessionId": "test-session-123",
    "customerName": "John Doe",
    "email": "john@example.com",
    "phone": "+11234567890",
    "partySize": 4,
    "childrenCount": 1,
    "hasSmokingRequest": false,
    "hasBirthday": false
  }'
```
