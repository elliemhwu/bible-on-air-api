import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ArticleTemplate } from "../article-templates/article-template.entity";
import { Article } from "../articles/article.entity";
import { AuthModule } from "../auth/auth.module";
import { Block } from "../blocks/block.entity";
import { LegacySyncController } from "./legacy-sync.controller";
import { LegacySyncService } from "./legacy-sync.service";

@Module({
  imports: [TypeOrmModule.forFeature([Article, Block, ArticleTemplate]), AuthModule],
  controllers: [LegacySyncController],
  providers: [LegacySyncService],
})
export class LegacySyncModule {}
