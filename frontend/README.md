# Kafè Restaurant Reservation System - Frontend

Modern Angular 18 single-page application for restaurant reservations with real-time availability updates, pessimistic locking, and comprehensive E2E testing.

[![Angular](https://img.shields.io/badge/Angular-18-red)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Cypress](https://img.shields.io/badge/Cypress-15-green)](https://www.cypress.io/)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen)](/)

---

## Features

### Core Functionality
- **Angular 18** with standalone components and new control flow syntax
- **Signals** for reactive state management (no NgRx/Akita needed)
- **WebSocket** integration for real-time availability updates
- **Pessimistic locking** (5-minute countdown) to prevent double bookings
- **Multi-step wizard** with comprehensive validation
- **Step navigation guard** prevents URL manipulation
- **Responsive design** - mobile-first approach
- **Dockerized** for easy deployment

### New Improvements (October 2025)
- **Step Navigation Guard** - Prevents users from skipping steps via URL
- **Live Countdown Timer** - Real-time 5-minute lock timer with visual warnings
- **63+ E2E Tests** - Comprehensive Cypress test suite
- **Custom Cypress Commands** - DRY and maintainable tests

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Angular** | 18.2+ | Frontend framework |
| **TypeScript** | 5.5+ | Type safety |
| **RxJS** | 7.8+ | Reactive programming |
| **Socket.io-client** | 4.7+ | WebSocket communication |
| **Signals** | Angular 18 | State management |
| **SCSS** | - | Styling |
| **Cypress** | 15.5+ | E2E testing |
| **Docker** | - | Containerization |
| **Nginx** | - | Production server |

---

## Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **npm** 10+
- **Docker** (optional, for containerized deployment)

---

## Quick Start

### 1. Installation

```bash
# Clone the repository (if not already done)
cd frontend

# Install dependencies
npm install
```

### 2. Start Development Server

```bash
npm start
```

The app will be available at **http://localhost:4200**

### 3. Verify Backend Connection

Make sure the backend is running on **http://localhost:3000**

```bash
# Test backend connection
curl http://localhost:3000/regions
```

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                    # Singleton services, guards, models
│   │   │   ├── guards/
│   │   │   │   ├── reservation-lock.guard.ts       # Protects review page
│   │   │   │   └── step-navigation.guard.ts        # Prevents URL jumping
│   │   │   ├── models/              # TypeScript interfaces
│   │   │   └── services/            # API, WebSocket, Region services
│   │   ├── shared/                  # Reusable components
│   │   │   └── components/
│   │   │       ├── lock-timer/      # Live countdown timer
│   │   │       ├── loader/
│   │   │       ├── error-message/
│   │   │       └── progress-indicator/
│   │   ├── features/
│   │   │   └── reservation/
│   │   │       ├── services/
│   │   │       │   └── reservation-state.service.ts  # Single source of truth
│   │   │       ├── pages/           # Smart components
│   │   │       │   ├── reservation-flow/
│   │   │       │   ├── review/
│   │   │       │   └── confirmation/
│   │   │       └── components/      # Presentational components
│   │   │           ├── step-date-time/
│   │   │           ├── step-guest-info/
│   │   │           ├── step-party-details/
│   │   │           ├── step-preferences/
│   │   │           └── region-selector/
│   │   └── app.routes.ts            # Routing with guards
│   ├── environments/                # Environment configs
│   └── styles/                      # Global styles
├── cypress/                         # E2E tests
│   ├── e2e/                        # Test files (63+ tests)
│   ├── support/                    # Custom commands
│   └── fixtures/                   # Test data
├── CLAUDE.md                       # Developer guide
```

---

## Available Scripts

### Development

```bash
# Start dev server (http://localhost:4200)
npm start

# Build for development
npm run build

# Build for production
npm run build:prod

# Run linter
npm run lint
```

### Testing

```bash
# Unit tests (Karma + Jasmine)
npm test

# Unit tests with coverage
npm test -- --code-coverage

# E2E tests (Cypress - Interactive)
npm run e2e:open

# E2E tests (Cypress - Headless)
npm run e2e

# E2E tests (Chrome)
npm run e2e:chrome

# E2E tests (Firefox)
npm run e2e:firefox
```

### Docker

```bash
# Build production image
docker build -t kafe-frontend .

# Run container
docker run -p 80:80 kafe-frontend
```

---

## Reservation Flow

### Step-by-Step Process

1. **Step 1: Date & Time Selection**
   - Select date (July 24-31, 2025)
   - Choose time slot (6:00 PM - 10:00 PM, 30-min intervals)
   - View available regions for selected slot

2. **Step 2: Guest Information**
   - Full name (required)
   - Email address (validated)
   - Phone number (validated)

3. **Step 3: Party Details**
   - Party size (1-12 guests)
   - Number of children
   - Birthday celebration (optional with name)

4. **Step 4: Region & Preferences**
   - Select region (filtered by constraints)
   - Smoking preference
   - **Lock acquired** (5-minute countdown starts)

5. **Review Page**
   - Live countdown timer
   - Review all information
   - Edit any step if needed
   - Confirm reservation

6. **Confirmation Page**
   - Reservation confirmed
   - Display confirmation details
   - Lock released

---

## Business Rules

### Region Constraints

| Region | Capacity | Tables | Children | Smoking |
|--------|----------|--------|----------|---------|
| **Main Hall** | 12 | 2 | Yes | No |
| **Bar** | 4 | 4 | No | No |
| **Riverside** | 8 | 3 | Yes | No |
| **Riverside (Smoking)** | 6 | 5 | No | Yes |

### Validation Rules

- **Date Range**: July 24-31, 2025 only
- **Time Slots**: 18:00-22:00 in 30-minute intervals
- **Party Size**: 1-12 guests maximum
- **Children**: Cannot exceed party size
- **Region Selection**: Automatically filtered based on:
  - Party size vs. capacity
  - Children in party vs. children allowed
  - Smoking preference

### Lock System

- **Duration**: 5 minutes from region selection
- **Purpose**: Prevents double bookings
- **Visual Indicator**: Live countdown timer
- **Warning**: Visual alert when < 1 minute remains
- **Expiration**: Redirects to step 1, lock released

---

## Testing

### Unit Tests (Jasmine + Karma)

```bash
# Run all unit tests
npm test

# Run with coverage report
npm test -- --code-coverage

# Coverage report location
coverage/frontend/index.html
```

### E2E Tests (Cypress)

**63+ comprehensive tests covering:**

- Complete reservation flow
- Step navigation guard
- Lock timer countdown
- Form validations

**Quick Start:**

```bash
# Prerequisites
# 1. Start backend: cd ../backend && npm run start:dev
# 2. Start frontend: npm start

# Run tests (interactive mode - recommended)
npm run e2e:open

# Run tests (headless mode - CI/CD)
npm run e2e
```

## Environment Configuration

### Development

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'http://localhost:3000'  // WebSocket (no /api)
};
```

### Production

Edit `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.your-domain.com/api',
  wsUrl: 'https://api.your-domain.com'
};
```

**Important**: `wsUrl` must NOT include `/api` - WebSocket connects directly to namespace.

---

## API Integration

### Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: Configure in environment files

### REST Endpoints

```
GET    /regions                           # Get all regions
GET    /regions/:id                       # Get region by ID
GET    /api/availability/slots            # Get available time slots
POST   /api/availability/check            # Check slot availability
GET    /api/availability/alternatives     # Get alternative slots
POST   /api/reservations/lock             # Lock a slot (5 min)
POST   /api/reservations                  # Create reservation
GET    /api/reservations/:id              # Get reservation
DELETE /api/reservations/:id              # Cancel reservation
DELETE /api/reservations/lock/:sessionId  # Release lock
```

### WebSocket Events

**Namespace**: `/reservations`

**Client Emits:**
```typescript
socket.emit('subscribe:availability', { date: '2025-07-24' });
```

**Server Emits:**
```typescript
// When availability changes
socket.on('availability:changed', (data) => {
  // { date, timeSlot, region, available }
});

// When user's lock expires
socket.on('lock:expired', (data) => {
  // { sessionId, lockId }
});
```

## Docker Deployment

### Multi-Stage Build

The Dockerfile uses a 2-stage build for optimization:

1. **Stage 1 (builder)**: Builds Angular app
2. **Stage 2 (nginx)**: Serves static files

### Commands

```bash
# Build image
docker build -t kafe-frontend .

# Run container
docker run -p 80:80 kafe-frontend

# Run with custom environment
docker run -p 80:80 -e API_URL=https://api.example.com kafe-frontend
```

### Docker Compose (with backend)

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - API_URL=http://backend:3000/api
```

---

## Documentation

### Core Documentation
- **[CLAUDE.md](./CLAUDE.md)** - Developer guide and architecture

---

## Contributing

### Development Workflow

1. Create a feature branch
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make changes following the architecture patterns in [CLAUDE.md](./CLAUDE.md)

3. Run tests
   ```bash
   npm test                 # Unit tests
   npm run e2e:open        # E2E tests
   ```

4. Build to verify
   ```bash
   npm run build
   ```

5. Submit PR

### Code Style

- Use **Signals** for state management
- Use **standalone components**
- Use **new control flow** (@if, @for, @switch)
- Use `inject()` instead of constructor DI
- Follow patterns in [CLAUDE.md](./CLAUDE.md)

---

## Troubleshooting

### Common Issues

**Issue**: Cannot connect to backend
```bash
# Solution: Verify backend is running
curl http://localhost:3000/regions
```

**Issue**: WebSocket not connecting
```bash
# Solution: Check wsUrl in environment.ts
# Must be http://localhost:3000 (no /api)
```

**Issue**: Tests fail with timeout
```bash
# Solution: Increase timeouts in cypress.config.ts
defaultCommandTimeout: 20000
```

**Issue**: Lock already exists
```bash
# Solution: Wait 5 minutes or restart backend
```