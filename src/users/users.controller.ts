import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { InviteUserDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';

/**
 * 同工與權限. Managers manage everyone; a team lead manages the members of
 * the teams they lead (checked in the service).
 */
@ApiTags('Users')
@ApiBearerAuth()
@ApiParam({ name: 'uid', example: 'bible-on-air' })
@UseGuards(JwtAuthGuard)
@Controller('magazines/:uid/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'All accounts with their teams and status (managers and team leads)' })
  findAll(@CurrentUser() me: JwtPayload) {
    return this.users.findAll(me.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Invite someone; returns the invitation token to share as a link' })
  invite(@Param('uid') uid: string, @Body() dto: InviteUserDto, @CurrentUser() me: JwtPayload) {
    return this.users.invite(uid, me.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change teams, the admin switch, the name, or disable / re-enable' })
  update(
    @Param('uid') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() me: JwtPayload,
  ) {
    return this.users.update(uid, me.sub, id, dto);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Issue a fresh invitation link for an account that has not joined yet' })
  reinvite(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() me: JwtPayload) {
    return this.users.reinvite(me.sub, id);
  }
}
