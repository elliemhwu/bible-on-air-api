import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793260433134 implements MigrationInterface {
    name = 'InitialSchema1793260433134'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Databases created with `synchronize` before migrations existed already
        // have these tables; later migrations bring them up to date.
        if (await queryRunner.hasTable("articles")) return;

        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "name" character varying(100) NOT NULL, "passwordHash" character varying(255) NOT NULL, "roles" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "publications" ("uid" character varying(100) NOT NULL, "type" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "summary" character varying(500), "about" text, "publisherUid" character varying(100) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_32e8cb09aa249bbeae800600c74" PRIMARY KEY ("uid"))`);
        await queryRunner.query(`CREATE TABLE "publishers" ("uid" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_97ced395d89193ddf1cc5d89589" PRIMARY KEY ("uid"))`);
        await queryRunner.query(`CREATE TABLE "articles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "publicationUid" character varying(100) NOT NULL, "date" date NOT NULL, "title" character varying(200), "submitted" boolean NOT NULL DEFAULT false, "reviewed" boolean NOT NULL DEFAULT false, "visible" boolean NOT NULL DEFAULT false, "articleTemplateId" integer, "coverImageUrl" character varying(500), "publishedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "articleId" uuid NOT NULL, "order" integer NOT NULL, "type" character varying(50) NOT NULL, "subheading" character varying(255), "content" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8244fa1495c4e9222a01059244b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "article_templates" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "publicationUid" character varying(100) NOT NULL, "blockDefinitions" jsonb NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_ada41df405fea207cc3d39f0acd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "verse_cache" ("id" SERIAL NOT NULL, "abbrZh" character varying NOT NULL, "chapter" integer NOT NULL, "verse" integer NOT NULL, "text" text NOT NULL, "version" character varying(32) NOT NULL, "cachedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_643705c02118a6084bddf56b7af" UNIQUE ("abbrZh", "chapter", "verse", "version"), CONSTRAINT "PK_77d25c8c3e4420011f09a724fe5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "publications" ADD CONSTRAINT "FK_3386720af2460d93c6de0f60584" FOREIGN KEY ("publisherUid") REFERENCES "publishers"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_f29ea0007944095b19340efb65f" FOREIGN KEY ("publicationUid") REFERENCES "publications"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blocks" ADD CONSTRAINT "FK_236402bdaf4c8855de3026b4674" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "FK_236402bdaf4c8855de3026b4674"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_f29ea0007944095b19340efb65f"`);
        await queryRunner.query(`ALTER TABLE "publications" DROP CONSTRAINT "FK_3386720af2460d93c6de0f60584"`);
        await queryRunner.query(`DROP TABLE "verse_cache"`);
        await queryRunner.query(`DROP TABLE "article_templates"`);
        await queryRunner.query(`DROP TABLE "blocks"`);
        await queryRunner.query(`DROP TABLE "articles"`);
        await queryRunner.query(`DROP TABLE "publishers"`);
        await queryRunner.query(`DROP TABLE "publications"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
