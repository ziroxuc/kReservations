import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from './common/filters/http-exception.filter';

/**
 * Bootstrap the NestJS application
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filters
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : '*';

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Kafè Reservation System API')
    .setDescription(
      `
      ## 🍽️ Restaurant Reservation System with Real-time Updates

      **Kafè** is a Manhattan restaurant that accepts online reservations. This API manages:

      - **Pessimistic Locking**: Temporarily locks tables (5 minutes) to prevent double bookings
      - **Real-time Updates**: WebSocket notifications when availability changes
      - **Multi-Table Support**: Each region has multiple tables that can be reserved independently
      - **Business Rules**: Different regions with specific constraints (children, smoking, capacity per table)

      ### 🏛️ Restaurant Regions

      **Note**: Use \`GET /regions\` to retrieve region IDs (UUIDs) for making reservations.

      ### ⏰ Available Time Slots
      18:00, 18:30, 19:00, 19:30, 20:00, 20:30, 21:00, 21:30, 22:00

      ### 📅 Date Range
      July 24-31, 2025

      ### 🔌 WebSocket Connection
      Connect to: \`ws://localhost:3000/reservations\`
      - Subscribe to availability updates for specific dates
      - Receive real-time notifications when tables are locked/released

      ### 📋 Reservation Flow
      1. **Get regions**: \`GET /regions\` to see all available regions and their IDs
      2. **Check availability**: \`GET /api/availability/slots?date=YYYY-MM-DD\` to see available tables
      3. **Lock a table**: \`POST /api/reservations/lock\` with regionId and sessionId
      4. **Confirm reservation**: \`POST /api/reservations\` with customer details
      5. **Release lock** (optional): \`DELETE /api/reservations/lock/:sessionId\` to cancel
      `,
    )
    .setVersion('1.0.0')
    .addTag('regions', 'Restaurant regions with capacity and rules')
    .addTag('availability', 'Check table availability across regions')
    .addTag('reservations', 'Manage table reservations and locks')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Kafè API Documentation',
    customfavIcon: '🍽️',
    customCss: `
      .topbar-wrapper img { content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">🍽️</text></svg>'); }
      .swagger-ui .topbar { background-color: #2c3e50; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`WebSocket server is running on: ws://localhost:${port}/reservations`);
  logger.log(`API Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
