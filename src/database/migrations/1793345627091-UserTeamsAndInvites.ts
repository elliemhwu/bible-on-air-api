import { MigrationInterface, QueryRunner } from "typeorm";

export class UserTeamsAndInvites1793345627091 implements MigrationInterface {
    name = 'UserTeamsAndInvites1793345627091'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "teams" jsonb NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "status" character varying(20) NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "inviteToken" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "inviteExpiresAt" TIMESTAMP WITH TIME ZONE`);
        // Existing accounts join the team their role belongs to
        await queryRunner.query(`
            UPDATE "users" SET "teams" = jsonb_strip_nulls(jsonb_build_object(
                'writer',   CASE WHEN 'editor'       = ANY(string_to_array("roles", ',')) THEN 'member' END,
                'reviewer', CASE WHEN 'reviewer'     = ANY(string_to_array("roles", ',')) THEN 'member' END,
                'image',    CASE WHEN 'image_editor' = ANY(string_to_array("roles", ',')) THEN 'member' END))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "inviteExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "inviteToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "teams"`);
    }

}
