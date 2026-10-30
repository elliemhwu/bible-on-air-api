import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  EDITOR = 'editor',
  REVIEWER = 'reviewer',
  IMAGE_EDITOR = 'image_editor',
}

/** The three teams that take turns: 寫作、校稿、圖片 */
export enum Team {
  WRITER = 'writer',
  REVIEWER = 'reviewer',
  IMAGE = 'image',
}

/** A lead (負責人) also schedules and manages their team */
export type TeamLevel = 'member' | 'lead';

export type TeamRoles = Partial<Record<Team, TeamLevel>>;

/** The studio role each team grants */
export const TEAM_ROLE: Record<Team, UserRole> = {
  [Team.WRITER]: UserRole.EDITOR,
  [Team.REVIEWER]: UserRole.REVIEWER,
  [Team.IMAGE]: UserRole.IMAGE_EDITOR,
};

export enum UserStatus {
  ACTIVE = 'active',
  /** Invited by email, has not set a password yet */
  INVITED = 'invited',
  /** Cannot sign in and is left out of rosters */
  DISABLED = 'disabled',
}

class UserColumns {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'simple-array' })
  roles: UserRole[];

  /** Team memberships; `roles` is kept in step with them */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  teams: TeamRoles;

  @Column({ type: 'varchar', length: 20, default: UserStatus.ACTIVE })
  status: UserStatus;

  /** Single-use token for setting a password from an invitation */
  @Column({ type: 'varchar', length: 64, nullable: true })
  inviteToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  inviteExpiresAt: Date | null;

  /** Single-use token from a "forgot password" email */
  @Column({ type: 'varchar', length: 64, nullable: true })
  resetToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetExpiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('users')
export class User extends UserColumns {}
