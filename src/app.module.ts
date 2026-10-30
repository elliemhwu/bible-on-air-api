import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ArticleTemplatesModule } from "./article-templates/article-templates.module";
import { ArticlesModule } from "./articles/articles.module";
import { AuthModule } from "./auth/auth.module";
import { BibleModule } from "./bible/bible.module";
import databaseConfig from "./config/database.config";
import { LegacySyncModule } from "./legacy-sync/legacy-sync.module";
import { MagazinesModule } from "./magazines/magazines.module";
import { PublicationsModule } from "./publications/publications.module";
import { PublishersModule } from "./publishers/publishers.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { UploadsModule } from "./uploads/uploads.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get("database"),
    }),
    AuthModule,
    UsersModule,
    ArticlesModule,
    ArticleTemplatesModule,
    BibleModule,
    PublishersModule,
    PublicationsModule,
    MagazinesModule,
    UploadsModule,
    LegacySyncModule,
    ScheduleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
