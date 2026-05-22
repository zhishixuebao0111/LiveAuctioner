import * as dotenv from 'dotenv';
import * as path from 'path';
import * as express from 'express';

// 从根目录加载 .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadRoot = path.resolve(__dirname, '../../../uploads');

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  app.use('/uploads', express.static(uploadRoot));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger API 文档
  const config = new DocumentBuilder()
    .setTitle('LiveAuctioner API')
    .setDescription('直播竞拍系统 API 文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 4000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger docs: http://localhost:${process.env.PORT || 4000}/api/docs`);
}

bootstrap();
