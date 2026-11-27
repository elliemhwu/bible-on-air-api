import { MigrationInterface, QueryRunner } from "typeorm";

export class WeekPlanNote1793348000000 implements MigrationInterface {
    name = 'WeekPlanNote1793348000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "week_plans" ADD "note" character varying(200)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "week_plans" DROP COLUMN "note"`);
    }

}
