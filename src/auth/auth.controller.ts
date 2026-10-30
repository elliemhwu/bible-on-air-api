import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto, SetPasswordDto } from '../users/users.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('invite/:token')
  inviteInfo(@Param('token') token: string) {
    return this.authService.inviteInfo(token);
  }

  @Post('invite/:token')
  acceptInvite(@Param('token') token: string, @Body() dto: SetPasswordDto) {
    return this.authService.acceptInvite(token, dto.password);
  }

  /** Always 204, whether or not the address has an account */
  @Post('forgot-password')
  @HttpCode(204)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto.email);
  }

  @Get('reset/:token')
  resetInfo(@Param('token') token: string) {
    return this.authService.resetInfo(token);
  }

  @Post('reset/:token')
  resetPassword(@Param('token') token: string, @Body() dto: SetPasswordDto) {
    return this.authService.resetPassword(token, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }
}
