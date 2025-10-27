# Kafè Restaurant Reservation System

## Overview

Kafè is a Manhattan restaurant that accepts online reservations. This backend system handles:

- **Concurrent reservations** with pessimistic locking
- **Real-time availability updates** via WebSockets
- **Business rule validation** for restaurant regions
- **Automatic lock expiration** via scheduled jobs

## Tech Stack

- **Framework**: NestJS 10+
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: Prisma 5
- **WebSockets**: Socket.io
- **Validation**: class-validator, class-transformer
- **Scheduling**: @nestjs/schedule
- **Containerization**: Docker & Docker Compose

## Business Rules

### Time Slots
- Available slots every 30 minutes: **18:00 - 22:00**
- Reservation duration: **2 hours**
- Date range: **July 24-31, 2025**

### Restaurant Regions

Each region has multiple tables with specific capacities:

| Region | Tables | Capacity/Table | Total Capacity | Children Allowed | Smoking Allowed |
|--------|--------|----------------|----------------|------------------|-----------------|
| **MAIN_HALL** | 2 | 12 people | 24 people | Yes | No |
| **BAR** | 4 | 4 people | 16 people | No | No |
| **RIVERSIDE** | 3 | 8 people | 24 people | Yes | No |
| **RIVERSIDE_SMOKING** | 5 | 6 people | 30 people | No | Yes |

**Important Notes:**
- Each reservation locks exactly **1 table** in the selected region
- Availability is tracked at table-level granularity
- Regions are stored in the database with UUID identifiers (not enums)
- Use `GET /api/regions` endpoint to retrieve current region IDs and configurations

### Validation Rules
- Party size: 1-12 people
- Children count ≤ party size
- Regions with children must allow them (not BAR or RIVERSIDE_SMOKING)
- Smoking requests only in RIVERSIDE_SMOKING
- Email must be valid format
- Phone number must be international format (e.g., +1234567890)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Installation & Running

1. **Clone and navigate to backend directory**
```bash
cd backend
```

2. **Create environment file**
```bash
cp .env.example .env
```

3. **Start with Docker Compose**
```bash
docker compose up -d
```

This will:
- Start PostgreSQL database
- Run Prisma migrations
- Seed the database with default regions
- Start the NestJS application
- Start WebSocket server

4. **Verify services are running**
```bash
docker compose ps
```

The application will be available at:
- **REST API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/reservations

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

## 📡 API Endpoints

Full API documentation available at: **http://localhost:3000/api/docs** (Swagger UI)

### Region Endpoints

#### Get All Regions
```http
GET /api/regions
```

**Response:**
```json
[
  {
    "id": "uuid-here",
    "name": "MAIN_HALL",
    "displayName": "Main Hall",
    "capacity": 12,
    "tables": 2,
    "allowChildren": true,
    "allowSmoking": false,
    "isActive": true
  }
]
```

### Availability Endpoints

#### Get Available Slots
```http
GET /api/availability/slots?date=2025-07-24
```

**Response:**
```json
[
  {
    "timeSlot": "18:00",
    "availableRegions": [
      {
        "region": {
          "id": "uuid-here",
          "name": "MAIN_HALL",
          "displayName": "Main Hall",
          "capacity": 12,
          "tables": 2
        },
        "availableTables": 2
      }
    ]
  }
]
```

#### Check Availability
```http
POST /api/availability/check
Content-Type: application/json

{
  "date": "2025-07-24",
  "timeSlot": "19:00",
  "regionId": "uuid-from-regions-endpoint",
  "partySize": 4,
  "childrenCount": 1,
  "hasSmokingRequest": false
}
```

**Response:**
```json
{
  "available": true
}
```

Or if unavailable:
```json
{
  "available": false,
  "reason": "This slot is already reserved"
}
```

#### Get Alternatives
```http
GET /api/availability/alternatives?date=2025-07-24&timeSlot=19:00&partySize=4&childrenCount=1&hasSmokingRequest=false
```

**Response:**
```json
[
  {
    "date": "2025-07-24",
    "timeSlot": "19:30",
    "region": {
      "id": "uuid-here",
      "name": "MAIN_HALL",
      "displayName": "Main Hall"
    },
    "available": true,
    "availableTables": 2
  }
]
```

### Reservation Endpoints

#### Lock a Slot
```http
POST /api/reservations/lock
Content-Type: application/json

{
  "date": "2025-07-24",
  "timeSlot": "19:00",
  "regionId": "uuid-from-regions-endpoint",
  "sessionId": "unique-session-id-123"
}
```

**Response:**
```json
{
  "lockId": "uuid-of-lock",
  "expiresAt": "2025-07-24T19:05:00.000Z"
}
```

#### Create Reservation
```http
POST /api/reservations
Content-Type: application/json

{
  "date": "2025-07-24",
  "timeSlot": "19:00",
  "customerName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "partySize": 4,
  "regionId": "uuid-from-regions-endpoint",
  "childrenCount": 1,
  "hasSmokingRequest": false,
  "hasBirthday": true,
  "birthdayName": "Jane Doe",
  "sessionId": "unique-session-id-123"
}
```

**Response:**
```json
{
  "id": "reservation-uuid",
  "date": "2025-07-24",
  "timeSlot": "19:00",
  "customerName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "partySize": 4,
  "region": {
    "id": "uuid-here",
    "name": "MAIN_HALL",
    "displayName": "Main Hall"
  },
  "regionId": "uuid-here",
  "childrenCount": 1,
  "hasSmokingRequest": false,
  "hasBirthday": true,
  "birthdayName": "Jane Doe",
  "status": "CONFIRMED",
  "createdAt": "2025-07-24T18:30:00.000Z",
  "updatedAt": "2025-07-24T18:30:00.000Z"
}
```

#### Get Reservation
```http
GET /api/reservations/:id
```

#### Release Lock
```http
DELETE /api/reservations/lock/:sessionId
```

**Response:**
```json
{
  "message": "Lock released successfully"
}
```

## 🔌 WebSocket Events

### Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/reservations');
```

### Subscribe to Availability Updates
```javascript
// Subscribe to a specific date
socket.emit('subscribe:availability', { date: '2025-07-24' });

// Listen for availability changes
socket.on('availability:changed', (data) => {
  console.log('Availability changed:', data);
  // {
  //   date: '2025-07-24',
  //   timeSlot: '19:00',
  //   regionId: 'uuid-here',
  //   timestamp: '2025-07-24T18:30:00.000Z'
  // }
});

// Listen for lock expiration
socket.on('lock:expired', (data) => {
  console.log('Your lock expired:', data);
  // {
  //   sessionId: 'your-session-id',
  //   timestamp: '2025-07-24T18:35:00.000Z'
  // }
});
```

### Unsubscribe
```javascript
socket.emit('unsubscribe:availability', { date: '2025-07-24' });
```

## Pessimistic Locking

The system implements pessimistic locking to handle concurrent reservations:

1. **Lock Phase**: User calls `/api/reservations/lock` to reserve **one table** temporarily
   - Lock duration: 5 minutes (configurable via `LOCK_DURATION_MINUTES`)
   - Returns `lockId` and `expiresAt`
   - Each lock reserves exactly 1 table in the specified region

2. **Confirmation Phase**: User completes reservation form and calls `/api/reservations`
   - Must provide the same `sessionId` used to create the lock
   - Lock is converted to confirmed reservation
   - Table remains reserved for the confirmed reservation

3. **Automatic Cleanup**: Cron job runs every minute to remove expired locks
   - Deletes locks where `lockedUntil < now()`
   - Frees up the table for new reservations
   - Notifies clients via WebSocket (`lock:expired` event)

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── src/
│   ├── common/
│   │   ├── constants/         # Business rules constants
│   │   ├── filters/           # Exception filters
│   │   └── pipes/             # Validation pipes
│   ├── domain/
│   │   ├── value-objects/     # Email, Phone, DateTimeSlot
│   │   └── services/          # RegionValidator
│   ├── modules/
│   │   ├── prisma/            # Database module
│   │   ├── availability/      # Availability checking
│   │   └── reservation/       # Reservation management
│   ├── app.module.ts          # Root module
│   └── main.ts                # Bootstrap
├── test/                      # Unit tests
├── docker-compose.yml         # Docker orchestration
├── Dockerfile                 # Container definition
└── README.md                  # This file
```

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

The test suite includes:
- Lock slot successfully
- Fail to lock already locked slot
- Create reservation from valid lock
- Fail to create reservation without lock
- Fail if business rules violated (children in BAR, etc)
- Return available slots for date
- Check availability correctly
- Suggest alternatives when unavailable

## 🔧 Configuration

Environment variables (`.env`):

```bash
# Database
DATABASE_URL="postgresql://kafe_user:kafe_pass@localhost:5432/kafe_db?schema=public"

# Application
NODE_ENV=development
PORT=3000

# Lock duration in minutes
LOCK_DURATION_MINUTES=5

# CORS
CORS_ORIGIN=http://localhost:3001
```

## 📦 Database Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Open Prisma Studio (GUI)
npm run prisma:studio

# Seed database
npm run prisma:seed
```

## Workflow Example

1. **Frontend retrieves available regions**
   ```
   GET /api/regions
   ```
   → Returns all regions with their UUIDs and configurations

2. **Frontend checks availability**
   ```
   GET /api/availability/slots?date=2025-07-24
   ```
   → Shows available tables per region for each time slot

3. **User selects a slot, frontend locks it (reserves 1 table)**
   ```
   POST /api/reservations/lock
   ```
   → Uses regionId from step 1

4. **User fills out reservation form (5 minutes max)**
   → Lock automatically expires after 5 minutes if not confirmed

5. **Frontend creates reservation**
   ```
   POST /api/reservations
   ```
   → Converts lock to confirmed reservation

6. **All subscribed clients receive WebSocket update**
   ```
   availability:changed event
   ```
   → Other users see updated availability in real-time

## Error Handling

The API returns consistent error responses:

```json
{
  "statusCode": 400,
  "timestamp": "2025-07-24T18:30:00.000Z",
  "path": "/api/reservations",
  "method": "POST",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "errors": ["email must be a valid email"]
    }
  ]
}
```

## Logging

The application logs important events:
- Database connections
- Lock creation/expiration
- Reservation confirmations
- WebSocket connections
- Errors and exceptions

## Security Features

- Input validation with class-validator
- SQL injection protection via Prisma
- CORS configuration
- Environment variable validation
- Request sanitization

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use strong database credentials
3. Configure CORS with specific origins
4. Enable SSL/TLS for WebSocket
5. Set up monitoring and logging
6. Configure backup strategy for database

## Quick Testing Guide

### Using cURL

```bash
# 1. Get all regions (retrieve UUIDs)
curl http://localhost:3000/api/regions

# 2. Check available slots for a date
curl "http://localhost:3000/api/availability/slots?date=2025-07-24"

# 3. Lock a slot (replace {regionId} with actual UUID)
curl -X POST http://localhost:3000/api/reservations/lock \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-07-24",
    "timeSlot": "19:00",
    "regionId": "{regionId}",
    "sessionId": "test-session-123"
  }'

# 4. Create reservation (within 5 minutes of locking)
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

# 5. Release lock (if you want to cancel before confirming)
curl -X DELETE http://localhost:3000/api/reservations/lock/test-session-123
```

### Using Docker Commands

```bash
# View backend logs in real-time
docker compose logs -f backend

# Check database directly
docker compose exec postgres psql -U kafe_user -d kafe_db -c "SELECT * FROM regions;"

# Restart backend after code changes
docker compose restart backend

# Full restart (clean database)
docker compose down -v && docker compose up -d
```
