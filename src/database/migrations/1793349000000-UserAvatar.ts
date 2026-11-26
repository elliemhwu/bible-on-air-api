import { MigrationInterface, QueryRunner } from "typeorm";

export class UserAvatar1793349000000 implements MigrationInterface {
    name = 'UserAvatar1793349000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatarUrl" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarUrl"`);
    }

}
