import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // Permet les connexions depuis n'importe quelle origine
    credentials: true,
  });

  // Pour permettre l'accès depuis le réseau local, écoutez sur toutes les interfaces
  await app.listen(3000, '0.0.0.0');
  console.log(`L'application est disponible sur http://localhost:3000 et sur le réseau local`);
}
bootstrap();
