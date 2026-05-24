import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-client-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Socket.IO adapter (required for WebSocket gateways)
  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 8000;
  const CORS_ORIGINS = configService.get<string>('CORS_ORIGINS') || 'http://localhost:3000';

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: CORS_ORIGINS.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: '*',
    maxAge: 3600,
  });

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('ResearchCitadel API')
    .setDescription('ResearchCitadel - Collaborative research management platform API')
    .setVersion('1.0')
    .addTag('ResearchCitadel API')
    .addBearerAuth({ name: 'JWT-auth', type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' })
    .addSecurityRequirements('JWT-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });
}
bootstrap();
