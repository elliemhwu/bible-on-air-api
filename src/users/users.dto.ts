import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TeamLevel, UserStatus } from './user.entity';

const LEVELS: TeamLevel[] = ['member', 'lead'];

/** A level per team; null (or absent) = not in that team */
export class TeamRolesDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(LEVELS)
  writer?: TeamLevel | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(LEVELS)
  reviewer?: TeamLevel | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(LEVELS)
  image?: TeamLevel | null;
}

export class InviteUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsBoolean()
  admin?: boolean;

  @ValidateNested()
  @Type(() => TeamRolesDto)
  teams: TeamRolesDto;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  admin?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => TeamRolesDto)
  teams?: TeamRolesDto;

  /** Disable or re-enable; invited accounts become active by accepting */
  @IsOptional()
  @IsIn([UserStatus.ACTIVE, UserStatus.DISABLED])
  status?: UserStatus.ACTIVE | UserStatus.DISABLED;
}

/** A new password, from an invitation or a reset link */
export class SetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
