import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { TeamRoster } from '../schedule/schedule.entity';
import {
  Team,
  TEAM_ROLE,
  TeamRoles,
  User,
  UserRole,
  UserStatus,
} from './user.entity';
import { InviteUserDto, TeamRolesDto, UpdateUserDto } from './users.dto';

const INVITE_DAYS = 14;
const ADMIN_ROLES = [UserRole.MANAGER, UserRole.SUPER_ADMIN];

export const isAdmin = (user: Pick<User, 'roles'>) =>
  user.roles.some((r) => ADMIN_ROLES.includes(r));

/** Teams the user leads (負責人) */
export const leadTeams = (user: Pick<User, 'teams'>): Team[] =>
  Object.values(Team).filter((t) => user.teams?.[t] === 'lead');

/** What the studio shows about an account (never the password or invite token) */
export function publicUser(user: User) {
  const { id, email, name, roles, teams, status, createdAt } = user;
  return { id, email, name, roles, teams: teams ?? {}, status, admin: isAdmin(user), createdAt };
}

function cleanTeams(dto: TeamRolesDto): TeamRoles {
  const teams: TeamRoles = {};
  for (const t of Object.values(Team)) if (dto[t]) teams[t] = dto[t]!;
  return teams;
}

/** Roles follow the teams and the admin switch; super_admin is never touched here */
function rolesFor(teams: TeamRoles, admin: boolean, current: UserRole[] = []): UserRole[] {
  const roles = new Set<UserRole>(current.filter((r) => r === UserRole.SUPER_ADMIN));
  if (admin) roles.add(UserRole.MANAGER);
  for (const t of Object.values(Team)) if (teams[t]) roles.add(TEAM_ROLE[t]);
  return [...roles];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(TeamRoster)
    private readonly rosterRepo: Repository<TeamRoster>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  private async actor(actorId: string): Promise<User> {
    const actor = await this.findById(actorId);
    if (!actor) throw new ForbiddenException();
    return actor;
  }

  /** Managers and team leads may open the staff page */
  async findAll(actorId: string) {
    const actor = await this.actor(actorId);
    if (!isAdmin(actor) && leadTeams(actor).length === 0) throw new ForbiddenException();
    const users = await this.repo.find({ order: { name: 'ASC' } });
    return users.map(publicUser);
  }

  /**
   * A team lead may only change membership of the teams they lead, and never
   * the admin switch; managers may change anything but their own admin/status.
   */
  private checkChange(actor: User, target: User | null, next: { teams: TeamRoles; admin: boolean; status?: UserStatus }) {
    const before = target?.teams ?? {};
    const self = target?.id === actor.id;
    if (target && isAdmin(target) !== next.admin && self) {
      throw new BadRequestException('不能移除自己的管理者權限');
    }
    if (self && next.status === UserStatus.DISABLED) {
      throw new BadRequestException('不能停用自己的帳號');
    }
    if (isAdmin(actor)) return;

    const led = leadTeams(actor);
    if (target && isAdmin(target)) throw new ForbiddenException('只有牧者可以修改牧者的帳號');
    if (next.admin !== (target ? isAdmin(target) : false)) throw new ForbiddenException('只有牧者可以指派牧者');
    if (target && next.status !== undefined && next.status !== target.status) {
      throw new ForbiddenException('只有牧者可以停用帳號');
    }
    for (const t of Object.values(Team)) {
      if ((before[t] ?? null) === (next.teams[t] ?? null)) continue;
      if (!led.includes(t)) throw new ForbiddenException('只能調整你負責的小組');
      if (next.teams[t] === 'lead') throw new ForbiddenException('只有牧者可以指派負責人');
    }
  }

  /** New team members join the end of the rota; leavers are taken off it */
  private async syncRosters(uid: string, userId: string, before: TeamRoles, after: TeamRoles) {
    for (const team of Object.values(Team)) {
      const was = !!before[team];
      const is = !!after[team];
      if (was === is) continue;
      const roster =
        (await this.rosterRepo.findOneBy({ publicationUid: uid, team })) ??
        this.rosterRepo.create({ publicationUid: uid, team, userIds: [] });
      roster.userIds = is
        ? [...roster.userIds.filter((id) => id !== userId), userId]
        : roster.userIds.filter((id) => id !== userId);
      await this.rosterRepo.save(roster);
    }
  }

  private newInvite() {
    return {
      inviteToken: randomBytes(24).toString('hex'),
      inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
    };
  }

  /** Creates an invited account; the caller shares the returned token as a link */
  async invite(uid: string, actorId: string, dto: InviteUserDto) {
    const actor = await this.actor(actorId);
    const email = dto.email.trim().toLowerCase();
    if (await this.findByEmail(email)) throw new ConflictException('這個 Email 已經有帳號了');
    const teams = cleanTeams(dto.teams);
    const admin = !!dto.admin;
    this.checkChange(actor, null, { teams, admin });

    const user = await this.repo.save(
      this.repo.create({
        email,
        name: dto.name.trim(),
        // Unusable until the invitation sets a real password
        passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
        roles: rolesFor(teams, admin),
        teams,
        status: UserStatus.INVITED,
        ...this.newInvite(),
      }),
    );
    await this.syncRosters(uid, user.id, {}, teams);
    return { user: publicUser(user), inviteToken: user.inviteToken };
  }

  async update(uid: string, actorId: string, id: string, dto: UpdateUserDto) {
    const actor = await this.actor(actorId);
    const target = await this.findById(id);
    if (!target) throw new NotFoundException(`User ${id} not found`);

    const teams = dto.teams ? cleanTeams(dto.teams) : (target.teams ?? {});
    const admin = dto.admin ?? isAdmin(target);
    // Invited accounts become active by accepting, not by being switched on
    const status = dto.status === UserStatus.ACTIVE && target.status === UserStatus.INVITED ? undefined : dto.status;
    this.checkChange(actor, target, { teams, admin, status });

    const before = target.teams ?? {};
    if (dto.name !== undefined) target.name = dto.name.trim();
    target.teams = teams;
    target.roles = rolesFor(teams, admin, target.roles);
    if (status) {
      // Re-enabling an account that never accepted its invitation keeps it invited
      target.status = status === UserStatus.ACTIVE && target.inviteToken ? UserStatus.INVITED : status;
    }
    await this.repo.save(target);
    await this.syncRosters(uid, target.id, before, teams);
    return publicUser(target);
  }

  /** A fresh invitation link for an account that has not joined yet */
  async reinvite(actorId: string, id: string) {
    const actor = await this.actor(actorId);
    const target = await this.findById(id);
    if (!target) throw new NotFoundException(`User ${id} not found`);
    if (target.status !== UserStatus.INVITED) throw new BadRequestException('這個帳號已經加入了');
    const shared = leadTeams(actor).some((t) => target.teams?.[t]);
    if (!isAdmin(actor) && !shared) throw new ForbiddenException();
    Object.assign(target, this.newInvite());
    await this.repo.save(target);
    return { user: publicUser(target), inviteToken: target.inviteToken };
  }

  async findByInvite(token: string): Promise<User> {
    const user = await this.repo.findOneBy({ inviteToken: token });
    if (!user || user.status !== UserStatus.INVITED || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw new NotFoundException('邀請連結無效或已過期');
    }
    return user;
  }

  async acceptInvite(token: string, password: string): Promise<User> {
    const user = await this.findByInvite(token);
    user.passwordHash = await bcrypt.hash(password, 10);
    user.status = UserStatus.ACTIVE;
    user.inviteToken = null;
    user.inviteExpiresAt = null;
    return this.repo.save(user);
  }
}
