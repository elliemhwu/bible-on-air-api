import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.session(user);
  }

  /** Who an invitation is for, so the page can greet them */
  async inviteInfo(token: string) {
    const user = await this.usersService.findByInvite(token);
    return { name: user.name, email: user.email };
  }

  /** Sets the password from an invitation and signs the person in */
  async acceptInvite(token: string, password: string) {
    return this.session(await this.usersService.acceptInvite(token, password));
  }

  forgotPassword(email: string): Promise<void> {
    return this.usersService.requestPasswordReset(email);
  }

  async resetInfo(token: string) {
    const user = await this.usersService.findByReset(token);
    return { email: user.email };
  }

  /** Sets the new password and signs the person in */
  async resetPassword(token: string, password: string) {
    return this.session(await this.usersService.resetPassword(token, password));
  }

  private session(user: User) {

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        teams: user.teams ?? {},
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      teams: user.teams ?? {},
    };
  }
}
