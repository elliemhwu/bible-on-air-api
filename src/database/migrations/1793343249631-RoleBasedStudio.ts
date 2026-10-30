import { MigrationInterface, QueryRunner } from "typeorm";

export class RoleBasedStudio1793343249631 implements MigrationInterface {
    name = 'RoleBasedStudio1793343249631'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "week_plans" ("publicationUid" character varying(100) NOT NULL, "weekStart" date NOT NULL, "sundayTheme" character varying(200), "sundayPassage" character varying(100), "days" jsonb NOT NULL DEFAULT '[]', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b448e05c58ea04af47ce2cbc364" PRIMARY KEY ("publicationUid", "weekStart"))`);
        await queryRunner.query(`CREATE TABLE "team_rosters" ("publicationUid" character varying(100) NOT NULL, "team" character varying(20) NOT NULL, "userIds" jsonb NOT NULL DEFAULT '[]', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a872d06562231b55eca8b708556" PRIMARY KEY ("publicationUid", "team"))`);
        await queryRunner.query(`CREATE TABLE "assignments" ("publicationUid" character varying(100) NOT NULL, "date" date NOT NULL, "team" character varying(20) NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_ed0878e13f90ce7ba9466b669f3" PRIMARY KEY ("publicationUid", "date", "team"))`);
        await queryRunner.query(`CREATE TABLE "writing_notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "publicationUid" character varying(100) NOT NULL, "date" date NOT NULL, "userId" uuid NOT NULL, "tag" character varying(20), "verses" jsonb NOT NULL DEFAULT '[]', "text" text NOT NULL, "order" integer NOT NULL DEFAULT '0', "usedIn" character varying(100), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5d0394cc7a86080ada55fa2958b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "article_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "articleId" uuid NOT NULL, "authorId" uuid NOT NULL, "text" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76305985dc2ec48641fdbd44c76" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_a6f942932652357658b130088ad" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "article_comments" ADD CONSTRAINT "FK_7042a18a394319c32bb2d39f854" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "article_comments" ADD CONSTRAINT "FK_a4126427ed0d9660c2a6ccdea83" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "article_comments" DROP CONSTRAINT "FK_a4126427ed0d9660c2a6ccdea83"`);
        await queryRunner.query(`ALTER TABLE "article_comments" DROP CONSTRAINT "FK_7042a18a394319c32bb2d39f854"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_a6f942932652357658b130088ad"`);
        await queryRunner.query(`DROP TABLE "article_comments"`);
        await queryRunner.query(`DROP TABLE "writing_notes"`);
        await queryRunner.query(`DROP TABLE "assignments"`);
        await queryRunner.query(`DROP TABLE "team_rosters"`);
        await queryRunner.query(`DROP TABLE "week_plans"`);
    }

}
