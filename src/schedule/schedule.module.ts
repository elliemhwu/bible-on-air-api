import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { User } from "../users/user.entity";
import { ScheduleController } from "./schedule.controller";
import {
  ArticleComment,
  Assignment,
  TeamRoster,
  WeekPlan,
  WritingNote,
} from "./schedule.entity";
import { ScheduleService } from "./schedule.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([WeekPlan, TeamRoster, Assignment, WritingNote, ArticleComment, User]),
    AuthModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
