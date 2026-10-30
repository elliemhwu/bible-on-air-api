import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { User } from "../users/user.entity";
import {
  AssignmentItemDto,
  CreateNoteDto,
  UpdateNoteDto,
  UpsertWeekPlanDto,
} from "./schedule.dto";
import {
  ArticleComment,
  Assignment,
  Team,
  TeamRoster,
  WeekPlan,
  WritingNote,
} from "./schedule.entity";

export type Member = { id: string; name: string };

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(WeekPlan) private readonly planRepo: Repository<WeekPlan>,
    @InjectRepository(TeamRoster) private readonly rosterRepo: Repository<TeamRoster>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(WritingNote) private readonly noteRepo: Repository<WritingNote>,
    @InjectRepository(ArticleComment) private readonly commentRepo: Repository<ArticleComment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /** Everyone with a studio role, for picking roster members */
  async findStaff() {
    const users = await this.userRepo.find({ order: { name: "ASC" } });
    return users.map(({ id, name, roles }) => ({ id, name, roles }));
  }

  // ── Week plans ─────────────────────────────────────────────────────────

  findPlans(uid: string, from: string, to: string): Promise<WeekPlan[]> {
    return this.planRepo.find({
      where: { publicationUid: uid, weekStart: Between(from, to) },
      order: { weekStart: "ASC" },
    });
  }

  async upsertPlan(uid: string, weekStart: string, dto: UpsertWeekPlanDto): Promise<WeekPlan> {
    await this.planRepo.save(
      this.planRepo.create({
        publicationUid: uid,
        weekStart,
        sundayTheme: dto.sundayTheme ?? null,
        sundayPassage: dto.sundayPassage ?? null,
        days: dto.days.map((d) => ({ ref: d.ref.trim(), ...(d.overview && { overview: true }) })),
      }),
    );
    return this.planRepo.findOneByOrFail({ publicationUid: uid, weekStart });
  }

  // ── Rosters ────────────────────────────────────────────────────────────

  async findRosters(uid: string): Promise<{ team: Team; members: Member[] }[]> {
    const rosters = await this.rosterRepo.findBy({ publicationUid: uid });
    const ids = rosters.flatMap((r) => r.userIds);
    const users = ids.length ? await this.userRepo.findBy({ id: In(ids) }) : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return Object.values(Team).map((team) => {
      const roster = rosters.find((r) => r.team === team);
      const members = (roster?.userIds ?? [])
        .map((id) => byId.get(id))
        .filter((u): u is User => !!u)
        .map((u) => ({ id: u.id, name: u.name }));
      return { team, members };
    });
  }

  async updateRoster(uid: string, team: Team, userIds: string[]) {
    await this.rosterRepo.save(this.rosterRepo.create({ publicationUid: uid, team, userIds }));
    return (await this.findRosters(uid)).find((r) => r.team === team);
  }

  // ── Assignments ────────────────────────────────────────────────────────

  async findAssignments(uid: string, from: string, to: string, userId?: string) {
    const rows = await this.assignmentRepo.find({
      where: { publicationUid: uid, date: Between(from, to), ...(userId && { userId }) },
      relations: { user: true },
      order: { date: "ASC" },
    });
    return rows.map(({ date, team, userId, user }) => ({ date, team, userId, userName: user.name }));
  }

  async saveAssignments(uid: string, items: AssignmentItemDto[]) {
    await this.assignmentRepo.manager.transaction(async (em) => {
      const repo = em.getRepository(Assignment);
      const cleared = items.filter((i) => !i.userId);
      for (const { date, team } of cleared) {
        await repo.delete({ publicationUid: uid, date, team });
      }
      const set = items.filter((i) => i.userId);
      if (set.length) {
        await repo.upsert(
          set.map(({ date, team, userId }) => ({ publicationUid: uid, date, team, userId: userId! })),
          ["publicationUid", "date", "team"],
        );
      }
    });
    const dates = items.map((i) => i.date).sort();
    return dates.length ? this.findAssignments(uid, dates[0], dates[dates.length - 1]) : [];
  }

  // ── Writing notes (private to their writer) ────────────────────────────

  findNotes(uid: string, date: string, userId: string): Promise<WritingNote[]> {
    return this.noteRepo.find({
      where: { publicationUid: uid, date, userId },
      order: { order: "ASC", createdAt: "ASC" },
    });
  }

  async createNote(uid: string, date: string, userId: string, dto: CreateNoteDto) {
    const count = await this.noteRepo.countBy({ publicationUid: uid, date, userId });
    return this.noteRepo.save(
      this.noteRepo.create({
        publicationUid: uid,
        date,
        userId,
        tag: dto.tag ?? null,
        verses: dto.verses,
        text: dto.text.trim(),
        order: count,
      }),
    );
  }

  private async ownNote(id: string, userId: string): Promise<WritingNote> {
    const note = await this.noteRepo.findOneBy({ id });
    if (!note) throw new NotFoundException(`Note ${id} not found`);
    if (note.userId !== userId) throw new ForbiddenException();
    return note;
  }

  async updateNote(id: string, userId: string, dto: UpdateNoteDto) {
    const note = await this.ownNote(id, userId);
    return this.noteRepo.save(Object.assign(note, dto));
  }

  async deleteNote(id: string, userId: string): Promise<void> {
    await this.noteRepo.remove(await this.ownNote(id, userId));
  }

  // ── Article comments ───────────────────────────────────────────────────

  async findComments(articleId: string) {
    const rows = await this.commentRepo.find({
      where: { articleId },
      relations: { author: true },
      order: { createdAt: "ASC" },
    });
    return rows.map(({ id, text, createdAt, authorId, author }) => ({
      id,
      text,
      createdAt,
      authorId,
      authorName: author.name,
    }));
  }

  async createComment(articleId: string, authorId: string, text: string) {
    await this.commentRepo.save(this.commentRepo.create({ articleId, authorId, text: text.trim() }));
    return this.findComments(articleId);
  }
}
