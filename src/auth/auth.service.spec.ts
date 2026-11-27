import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('AuthService', () => {
  let user: User;
  const usersService = { findByEmail: jest.fn(async () => user), findById: jest.fn(async () => user) };
  const jwt = { sign: jest.fn(() => 'signed') };
  const service = new AuthService(usersService as any, jwt as any);

  beforeEach(async () => {
    user = {
      id: 'u1',
      email: 'a@boa.test',
      name: 'A',
      passwordHash: await bcrypt.hash('right-password', 4),
      roles: [UserRole.EDITOR],
      teams: { writer: 'member' },
      status: UserStatus.ACTIVE,
    } as User;
  });

  it('signs in an active account and returns its teams', async () => {
    const res = await service.login('a@boa.test', 'right-password');
    expect(res).toMatchObject({ accessToken: 'signed', user: { id: 'u1', teams: { writer: 'member' } } });
  });

  it('rejects a wrong password', async () => {
    await expect(service.login('a@boa.test', 'wrong')).rejects.toThrow(UnauthorizedException);
  });

  it.each([UserStatus.INVITED, UserStatus.DISABLED])('rejects a %s account', async (status) => {
    user.status = status;
    await expect(service.login('a@boa.test', 'right-password')).rejects.toThrow(UnauthorizedException);
  });

  describe('JwtStrategy', () => {
    const strategy = new JwtStrategy({ get: () => 'secret' } as any, usersService as any);
    const payload = { sub: 'u1', email: 'a@boa.test', roles: [UserRole.MANAGER] };

    it('uses the roles the account has now, not the ones in the token', async () => {
      await expect(strategy.validate(payload)).resolves.toMatchObject({ roles: [UserRole.EDITOR] });
    });

    it('rejects tokens of disabled accounts', async () => {
      user.status = UserStatus.DISABLED;
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
