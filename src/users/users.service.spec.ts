import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { TeamRoster } from '../schedule/schedule.entity';
import { Team, User, UserRole, UserStatus } from './user.entity';
import { UsersService } from './users.service';

const UID = 'bible-on-air';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-member',
    email: 'member@boa.test',
    name: 'Member',
    passwordHash: 'hash',
    roles: [UserRole.EDITOR],
    teams: { writer: 'member' },
    status: UserStatus.ACTIVE,
    inviteToken: null,
    inviteExpiresAt: null,
    resetToken: null,
    resetExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

const manager = makeUser({ id: 'u-manager', email: 'manager@boa.test', name: 'Manager', roles: [UserRole.MANAGER], teams: {} });
const writerLead = makeUser({ id: 'u-lead', email: 'lead@boa.test', name: 'Lead', teams: { writer: 'lead' } });

describe('UsersService', () => {
  let users: User[];
  let rosters: TeamRoster[];
  const repo = {
    find: jest.fn(async () => users),
    findOneBy: jest.fn(async (where: Partial<User>) => {
      const [key, value] = Object.entries(where)[0] as [keyof User, unknown];
      return users.find((u) => u[key] === value) ?? null;
    }),
    create: jest.fn((u: Partial<User>) => ({ id: 'u-new', ...u })),
    save: jest.fn(async (u: User) => {
      users = [...users.filter((x) => x.id !== u.id), u];
      return u;
    }),
  };
  const rosterRepo = {
    findOneBy: jest.fn(async ({ team }: { team: Team }) => rosters.find((r) => r.team === team) ?? null),
    create: jest.fn((r: Partial<TeamRoster>) => r),
    save: jest.fn(async (r: TeamRoster) => {
      rosters = [...rosters.filter((x) => x.team !== r.team), r];
      return r;
    }),
  };
  const mail = { webBaseUrl: 'https://boa.example', send: jest.fn(async () => true) };
  const service = new UsersService(repo as any, rosterRepo as any, mail as unknown as MailService);

  const rosterOf = (team: Team) => rosters.find((r) => r.team === team)?.userIds ?? [];

  beforeEach(() => {
    jest.clearAllMocks();
    users = [manager, writerLead, makeUser()];
    rosters = [{ publicationUid: UID, team: Team.WRITER, userIds: ['u-lead', 'u-member'] } as TeamRoster];
    mail.send.mockResolvedValue(true);
  });

  describe('findAll', () => {
    it('is open to managers and team leads', async () => {
      await expect(service.findAll('u-manager')).resolves.toHaveLength(3);
      await expect(service.findAll('u-lead')).resolves.toHaveLength(3);
    });

    it('is closed to plain members', async () => {
      await expect(service.findAll('u-member')).rejects.toThrow(ForbiddenException);
    });

    it('never exposes passwords or tokens', async () => {
      const [first] = await service.findAll('u-manager');
      expect(first).not.toHaveProperty('passwordHash');
      expect(first).not.toHaveProperty('inviteToken');
      expect(first).not.toHaveProperty('resetToken');
    });
  });

  describe('invite', () => {
    const dto = { name: ' 新雅 ', email: 'XinYa@BOA.test', teams: { writer: 'member' as const } };

    it('creates an invited account, emails the link and adds them to the rota', async () => {
      const res = await service.invite(UID, 'u-lead', dto);

      expect(res.user).toMatchObject({ name: '新雅', email: 'xinya@boa.test', status: 'invited', roles: ['editor'] });
      expect(res).toMatchObject({ emailed: true, inviteToken: null });
      const mailArg = (mail.send.mock.calls[0] as unknown[])[0] as { to: string; text: string };
      expect(mailArg.to).toBe('xinya@boa.test');
      expect(mailArg.text).toMatch(/https:\/\/boa\.example\/invite\/[0-9a-f]{48}/);
      expect(rosterOf(Team.WRITER)).toEqual(['u-lead', 'u-member', 'u-new']);
    });

    it('returns the token to share by hand when the email could not be sent', async () => {
      mail.send.mockResolvedValueOnce(false);
      const res = await service.invite(UID, 'u-manager', dto);
      expect(res.emailed).toBe(false);
      expect(res.inviteToken).toMatch(/^[0-9a-f]{48}$/);
    });

    it('rejects an address that already has an account', async () => {
      await expect(service.invite(UID, 'u-manager', { ...dto, email: 'member@boa.test' })).rejects.toThrow(
        ConflictException,
      );
    });

    it.each([
      ['another team', { teams: { reviewer: 'member' as const } }],
      ['a lead', { teams: { writer: 'lead' as const } }],
      ['a manager', { teams: {}, admin: true }],
    ])('does not let a team lead invite %s', async (_, extra) => {
      await expect(service.invite(UID, 'u-lead', { ...dto, ...extra })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('keeps roles and rosters in step with teams', async () => {
      const res = await service.update(UID, 'u-manager', 'u-member', {
        teams: { writer: null, image: 'member' },
      });

      expect(res.teams).toEqual({ image: 'member' });
      expect(res.roles).toEqual([UserRole.IMAGE_EDITOR]);
      expect(rosterOf(Team.WRITER)).toEqual(['u-lead']);
      expect(rosterOf(Team.IMAGE)).toEqual(['u-member']);
    });

    it('turns the admin switch into the manager role and keeps super_admin', async () => {
      users.push(makeUser({ id: 'u-root', email: 'root@boa.test', roles: [UserRole.SUPER_ADMIN], teams: {} }));
      const res = await service.update(UID, 'u-manager', 'u-root', { admin: true });
      expect(res.roles.sort()).toEqual([UserRole.MANAGER, UserRole.SUPER_ADMIN].sort());
    });

    it('lets a lead add and remove members of their own team', async () => {
      const res = await service.update(UID, 'u-lead', 'u-member', { teams: { writer: null } });
      expect(res.teams).toEqual({});
    });

    it.each([
      ['another team', { teams: { writer: 'member' as const, image: 'member' as const } }],
      ['the lead level', { teams: { writer: 'lead' as const } }],
      ['the admin switch', { admin: true }],
      ['the account status', { status: UserStatus.DISABLED as const }],
    ])('does not let a lead change %s', async (_, dto) => {
      await expect(service.update(UID, 'u-lead', 'u-member', dto)).rejects.toThrow(ForbiddenException);
    });

    it('does not let a lead touch a manager', async () => {
      await expect(service.update(UID, 'u-lead', 'u-manager', { teams: { writer: 'member' } })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('does not let anyone remove their own admin or disable themselves', async () => {
      await expect(service.update(UID, 'u-manager', 'u-manager', { admin: false })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(UID, 'u-manager', 'u-manager', { status: UserStatus.DISABLED })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('re-enabling an account that never accepted its invitation keeps it invited', async () => {
      users.push(makeUser({ id: 'u-inv', status: UserStatus.DISABLED, inviteToken: 'abc' }));
      const res = await service.update(UID, 'u-manager', 'u-inv', { status: UserStatus.ACTIVE });
      expect(res.status).toBe(UserStatus.INVITED);
    });

    it('does not activate an invited account by switching it on', async () => {
      users.push(makeUser({ id: 'u-inv', status: UserStatus.INVITED, inviteToken: 'abc' }));
      const res = await service.update(UID, 'u-manager', 'u-inv', { status: UserStatus.ACTIVE });
      expect(res.status).toBe(UserStatus.INVITED);
    });
  });

  describe('reinvite', () => {
    it('emails a fresh link to an invited account', async () => {
      users.push(makeUser({ id: 'u-inv', status: UserStatus.INVITED, inviteToken: 'old' }));
      await service.reinvite('u-lead', 'u-inv');
      expect(users.find((u) => u.id === 'u-inv')!.inviteToken).not.toBe('old');
      expect(mail.send).toHaveBeenCalledTimes(1);
    });

    it('refuses accounts that already joined', async () => {
      await expect(service.reinvite('u-manager', 'u-member')).rejects.toThrow(BadRequestException);
    });
  });

  describe('invitations and password reset', () => {
    const future = () => new Date(Date.now() + 60_000);

    it('accepting an invitation sets the password, activates and clears the token', async () => {
      users.push(makeUser({ id: 'u-inv', status: UserStatus.INVITED, inviteToken: 'tok', inviteExpiresAt: future() }));
      const user = await service.acceptInvite('tok', 'new-password');

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.inviteToken).toBeNull();
      await expect(bcrypt.compare('new-password', user.passwordHash)).resolves.toBe(true);
    });

    it('rejects expired invitations', async () => {
      users.push(
        makeUser({ id: 'u-inv', status: UserStatus.INVITED, inviteToken: 'tok', inviteExpiresAt: new Date(0) }),
      );
      await expect(service.findByInvite('tok')).rejects.toThrow(NotFoundException);
    });

    it('emails a reset link to an active account', async () => {
      await service.requestPasswordReset(' Member@boa.test ');
      const user = users.find((u) => u.id === 'u-member')!;
      expect(user.resetToken).toMatch(/^[0-9a-f]{48}$/);
      const mailArg = (mail.send.mock.calls[0] as unknown[])[0] as { text: string };
      expect(mailArg.text).toContain(`https://boa.example/reset/${user.resetToken}`);
    });

    it.each([
      ['an unknown address', 'nobody@boa.test', undefined],
      ['a disabled account', 'member@boa.test', UserStatus.DISABLED],
    ])('sends nothing for %s', async (_, email, status) => {
      if (status) users = users.map((u) => (u.id === 'u-member' ? { ...u, status } : u));
      await service.requestPasswordReset(email);
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('a reset link works once', async () => {
      users = users.map((u) => (u.id === 'u-member' ? { ...u, resetToken: 'r', resetExpiresAt: future() } : u));
      const user = await service.resetPassword('r', 'another-password');
      expect(user.resetToken).toBeNull();
      await expect(bcrypt.compare('another-password', user.passwordHash)).resolves.toBe(true);
      await expect(service.findByReset('r')).rejects.toThrow(NotFoundException);
    });
  });
});
