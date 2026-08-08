import "./load-env";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("Vaikuntham API")
    .setDescription("Hostel management REST API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  if (process.env.ENABLE_SWAGGER === "true") {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
