import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { NoteTag, Team } from "./schedule.entity";

export class DateRangeQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class PlanDayDto {
  @IsString()
  @MaxLength(100)
  ref: string;

  @IsOptional()
  @IsBoolean()
  overview?: boolean;
}

export class UpsertWeekPlanDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  sundayTheme?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  sundayPassage?: string | null;

  @IsArray()
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => PlanDayDto)
  days: PlanDayDto[];
}

export class UpdateRosterDto {
  @IsArray()
  @IsUUID("all", { each: true })
  userIds: string[];
}

export class AssignmentItemDto {
  @IsDateString()
  date: string;

  @IsEnum(Team)
  team: Team;

  /** null clears the day */
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  userId: string | null;
}

export class SaveAssignmentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentItemDto)
  items: AssignmentItemDto[];
}

export class CreateNoteDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(NoteTag)
  tag?: NoteTag | null;

  @IsArray()
  @IsInt({ each: true })
  verses: number[];

  @IsString()
  @MaxLength(5000)
  text: string;
}

export class UpdateNoteDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(NoteTag)
  tag?: NoteTag | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  verses?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  usedIn?: string | null;
}

export class CreateCommentDto {
  @IsString()
  @MaxLength(5000)
  text: string;
}
