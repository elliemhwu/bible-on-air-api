import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Replace the old `articles.status` enum (draft / reviewed / published) with the
 * submitted / reviewed / visible flags. Only needed for databases created
 * before the flags existed; a no-op on fresh databases.
 */
export class ArticleStatusFlags1793260500000 implements MigrationInterface {
    name = 'ArticleStatusFlags1793260500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn("articles", "status"))) return;

        for (const column of ["submitted", "reviewed", "visible"]) {
            if (!(await queryRunner.hasColumn("articles", column))) {
                await queryRunner.query(`ALTER TABLE "articles" ADD "${column}" boolean NOT NULL DEFAULT false`);
            }
        }
        await queryRunner.query(`
            UPDATE "articles" SET
                "submitted" = "status" IN ('reviewed', 'published'),
                "reviewed"  = "status" IN ('reviewed', 'published'),
                "visible"   = "status" = 'published'`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "status"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "articles" ADD "status" character varying(50) NOT NULL DEFAULT 'draft'`);
        await queryRunner.query(`
            UPDATE "articles" SET "status" = CASE
                WHEN "visible" THEN 'published'
                WHEN "reviewed" THEN 'reviewed'
                ELSE 'draft' END`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "visible"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "reviewed"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "submitted"`);
    }

}
