import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, Matches } from "class-validator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../users/user.entity";
import { LegacySyncService } from "./legacy-sync.service";

export class LegacySyncDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(31)
  @Type(() => String)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  dates: string[];
}

@ApiTags("Legacy Sync")
@ApiBearerAuth()
@ApiParam({ name: "uid", example: "bible-on-air" })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EDITOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
@Controller("magazines/:uid/legacy-sync")
export class LegacySyncController {
  constructor(private readonly service: LegacySyncService) {}

  @Get("months")
  @ApiOperation({ summary: "List month pages found on the legacy Google Site" })
  getMonths() {
    return this.service.getMonths();
  }

  @Get("months/:month")
  @ApiOperation({ summary: "Compare one legacy month page with the database" })
  @ApiParam({ name: "month", example: "2026-10" })
  @ApiQuery({ name: "refresh", required: false, type: Boolean })
  getMonthStatus(
    @Param("uid") uid: string,
    @Param("month") month: string,
    @Query("refresh", new ParseBoolPipe({ optional: true })) refresh?: boolean,
  ) {
    return this.service.getMonthStatus(uid, month, refresh);
  }

  @Post()
  @ApiOperation({
    summary: "Create missing days and fill empty parts from the legacy site (max 31 days per call)",
  })
  sync(@Param("uid") uid: string, @Body() dto: LegacySyncDto) {
    return this.service.syncDates(uid, dto.dates);
  }
}
