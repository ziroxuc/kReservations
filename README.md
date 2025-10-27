# Kafè Restaurant Reservation System

Complete restaurant reservation system with NestJS backend, PostgreSQL database and Angular 18 frontend.

## Prerequisites

- Docker and Docker Compose installed
- Available ports: 3000 (backend), 4200 (frontend), 5432 (PostgreSQL)

## Quick Start

### Start the entire application

```bash
# Start all services (PostgreSQL + Backend + Frontend)
docker compose up -d

# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Access the application

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3000/api
- **Swagger API Docs**: http://localhost:3000/api/docs
- **PostgreSQL**: localhost:5432

### Database credentials

- **Database**: kafe_db
- **User**: kafe_user
- **Password**: kafe_pass

## Useful Commands

### Service management

```bash
# Stop all services
docker compose down

# Stop and remove volumes (complete cleanup)
docker compose down -v

# Restart a specific service
docker compose restart backend
docker compose restart frontend

# Rebuild containers
docker compose up -d --build

# View service status
docker compose ps
```

### Execute commands in containers

```bash
# Backend - Prisma migrations
docker compose exec backend npx prisma migrate deploy

# Backend - Generate Prisma client
docker compose exec backend npx prisma generate

# Backend - Seed the database
docker compose exec backend npm run prisma:seed

# Backend - Open Prisma Studio
docker compose exec backend npx prisma studio

# Frontend - Install dependencies
docker compose exec frontend npm install

# Frontend - Run tests
docker compose exec frontend npm test
```

## Project Structure

```
.
├── backend/              # NestJS backend
│   ├── src/             # Source code
│   ├── prisma/          # Schema and migrations
│   │   ├── schema.prisma          # Data model
│   │   ├── seed.ts                # Initial data
│   │   └── check-and-seed.ts      # Smart seed
│   ├── test/            # Unit tests
│   └── Dockerfile       # Backend Dockerfile (development)
│
├── frontend/            # Angular 18 frontend
│   ├── src/            # Source code
│   ├── cypress/        # E2E tests
│   ├── Dockerfile      # Dockerfile for production (nginx)
│   └── Dockerfile.dev  # Dockerfile for development (ng serve)
│
└── docker-compose.yml  # Orchestration of all services
```

## Services

### PostgreSQL
- **Port**: 5432
- **Image**: postgres:16-alpine
- **Volume**: postgres_data (data persistence)

### Backend (NestJS)
- **Port**: 3000
- **Hot-reload**: Enabled with volumes
- **Dependencies**: PostgreSQL (healthcheck)
- **Automatic initialization**:
  - Runs Prisma migrations
  - Runs data seed (restaurant regions)
  - Starts the server in development mode

### Frontend (Angular)
- **Port**: 4200
- **Hot-reload**: Enabled with ng serve and polling (every 2 seconds)
- **Dependencies**: Backend
- **Build**: Uses Dockerfile.dev in development, Dockerfile in production
- **Angular CLI**: Pre-installed in the container

## Initial Data (Seed)

When starting the backend for the first time, the 4 restaurant regions are automatically created:

| Region | Capacity/Table | Number of Tables | Children Allowed | Smoking |
|--------|----------------|------------------|------------------|---------|
| **Main Hall** | 12 people | 2 tables | Yes | No |
| **Bar** | 4 people | 4 tables | No | No |
| **Riverside** | 8 people | 3 tables | Yes | No |
| **Riverside Smoking** | 6 people | 5 tables | No | Yes |

**Note**: The seed is smart - it only runs if the regions table is empty. This means that:
- On first start, regions are created automatically
- On subsequent restarts, existing data is maintained
- If you need to reset the data, use: `docker compose down -v && docker compose up -d`

## Development

### Development mode with hot-reload

The docker-compose is configured for development with hot-reload:

- **Backend**: Changes in `./backend/src` are reflected automatically
- **Frontend**: Changes in `./frontend/src` are reflected automatically with polling every 2 seconds

### Available Dockerfiles

The project has different Dockerfiles depending on the environment:

**Backend:**
- `Dockerfile` - Configured for development with multi-stage (target: development)
- Includes hot-reload with `npm run start:dev`

**Frontend:**
- `Dockerfile.dev` - For development (used in docker-compose.yml)
  - Uses `ng serve` with hot-reload
  - Angular CLI pre-installed
  - Port 4200 exposed

- `Dockerfile` - For production
  - Multi-stage build
  - Compiles the Angular application
  - Serves with nginx on port 80
  - Optimized for production

### Environment variables

The backend uses the following environment variables (already configured in docker-compose.yml):

- `DATABASE_URL`: PostgreSQL connection
- `NODE_ENV`: development
- `PORT`: 3000
- `LOCK_DURATION_MINUTES`: 5
- `CORS_ORIGIN`: Allowed origins for CORS

## Troubleshooting

### Ports are in use

If any port is occupied, you can change them in docker-compose.yml:

```yaml
services:
  backend:
    ports:
      - "3001:3000"  # Change 3001 to your preferred port
```

### Frontend doesn't connect to backend

Verify that:
1. The backend is running: `docker compose logs backend`
2. The frontend is configured to connect to http://localhost:3000 in `frontend/src/environments/environment.ts`

### Database errors

If there are problems with the database:

```bash
# Remove volumes and start from scratch
docker compose down -v
docker compose up -d

# Run seed again
docker compose exec backend npm run prisma:seed
```

### Frontend doesn't compile

```bash
# Reinstall frontend dependencies
docker compose exec frontend rm -rf node_modules package-lock.json
docker compose exec frontend npm install
docker compose restart frontend
```

## Additional Documentation

- [Backend README](./backend/CLAUDE.md)
- [Frontend README](./frontend/CLAUDE.md)
- [API Documentation](http://localhost:3000/api/docs) (available when backend is running)
