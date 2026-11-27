import { MigrationInterface, QueryRunner } from "typeorm";

export class PasswordReset1793346697956 implements MigrationInterface {
    name = 'PasswordReset1793346697956'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "resetToken" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "resetExpiresAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resetExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resetToken"`);
    }

}
