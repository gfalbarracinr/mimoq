import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {cors: true, snapshot: true});
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(json({ limit: '50mb' }));
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
  const config = new DocumentBuilder()
    .setTitle('Api MiMoQ')
    .setDescription('API REST para la aplicación de experimentación MiMoQ')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  await app.listen(process.env.PORT || 3000);
  // console.log(`Ambiente de ejecución ${process.env.NODE_ENV}`);
  // console.log(`Servidor corriendo en puerto: ${process.env.PORT}`);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
