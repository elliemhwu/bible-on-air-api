import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtPayload } from "../auth/jwt.strategy";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../users/user.entity";
import {
  CreateCommentDto,
  CreateNoteDto,
  DateRangeQueryDto,
  SaveAssignmentsDto,
  UpdateNoteDto,
  UpdateRosterDto,
  UpsertWeekPlanDto,
} from "./schedule.dto";
import { Team } from "./schedule.entity";
import { ScheduleService } from "./schedule.service";

const MANAGER_AND_ABOVE = [UserRole.MANAGER, UserRole.SUPER_ADMIN];

/** Planning and assignment data for the studio; every route needs a signed-in staff member. */
@ApiTags("Schedule")
@ApiBearerAuth()
@ApiParam({ name: "uid", example: "bible-on-air" })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("magazines/:uid")
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Get("staff")
  @ApiOperation({ summary: "Active and invited staff (id, name, roles, teams), for building rosters (managers and team leads)" })
  findStaff(@CurrentUser() user: JwtPayload) {
    return this.service.findStaff(user.sub);
  }

  @Get("plans")
  @ApiOperation({ summary: "Week plans whose Monday falls in [from, to]" })
  findPlans(@Param("uid") uid: string, @Query() q: DateRangeQueryDto) {
    return this.service.findPlans(uid, q.from, q.to);
  }

  @Put("plans/:weekStart")
  @Roles(...MANAGER_AND_ABOVE)
  @ApiOperation({ summary: "Create or replace the plan of the week starting on weekStart (a Monday)" })
  upsertPlan(
    @Param("uid") uid: string,
    @Param("weekStart") weekStart: string,
    @Body() dto: UpsertWeekPlanDto,
  ) {
    return this.service.upsertPlan(uid, weekStart, dto);
  }

  @Get("rosters")
  @ApiOperation({ summary: "Rotation order of every team" })
  findRosters(@Param("uid") uid: string) {
    return this.service.findRosters(uid);
  }

  @Put("rosters/:team")
  @ApiOperation({ summary: "Replace a team's rotation order (managers, or that team's lead)" })
  updateRoster(
    @Param("uid") uid: string,
    @Param("team", new ParseEnumPipe(Team)) team: Team,
    @Body() dto: UpdateRosterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateRoster(uid, user.sub, team, dto.userIds);
  }

  @Get("assignments")
  @ApiOperation({ summary: "Who serves which team on each day in [from, to]; optionally one user only" })
  findAssignments(@Param("uid") uid: string, @Query() q: DateRangeQueryDto) {
    return this.service.findAssignments(uid, q.from, q.to, q.userId);
  }

  @Put("assignments")
  @ApiOperation({ summary: "Set (or clear, with userId null) the assignment of each day and team (managers, or the teams' lead)" })
  saveAssignments(@Param("uid") uid: string, @Body() dto: SaveAssignmentsDto, @CurrentUser() user: JwtPayload) {
    return this.service.saveAssignments(uid, user.sub, dto.items);
  }

  @Get("notes/:date")
  @ApiOperation({ summary: "The current user's reading notes for a day" })
  findNotes(@Param("uid") uid: string, @Param("date") date: string, @CurrentUser() user: JwtPayload) {
    return this.service.findNotes(uid, date, user.sub);
  }

  @Post("notes/:date")
  @ApiOperation({ summary: "Add a reading note for a day" })
  createNote(
    @Param("uid") uid: string,
    @Param("date") date: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createNote(uid, date, user.sub, dto);
  }

  @Patch("notes/:date/:id")
  @ApiOperation({ summary: "Update one of the current user's notes" })
  updateNote(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateNote(id, user.sub, dto);
  }

  @Delete("notes/:date/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete one of the current user's notes" })
  deleteNote(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deleteNote(id, user.sub);
  }

  @Get("articles/:id/comments")
  @ApiOperation({ summary: "Messages left on an article" })
  findComments(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findComments(id);
  }

  @Post("articles/:id/comments")
  @ApiOperation({ summary: "Leave a message on an article (e.g. reviewer to writer)" })
  createComment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createComment(id, user.sub, dto.text);
  }
}
