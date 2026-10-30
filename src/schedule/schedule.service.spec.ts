import { ForbiddenException } from "@nestjs/common";
import { User, UserRole, UserStatus } from "../users/user.entity";
import { Team } from "./schedule.entity";
import { ScheduleService } from "./schedule.service";

const UID = "bible-on-air";

function makeUser(overrides: Partial<User>): User {
  return { roles: [], teams: {}, status: UserStatus.ACTIVE, name: "?", ...overrides } as User;
}

const people: User[] = [
  makeUser({ id: "manager", name: "Manager", roles: [UserRole.MANAGER] }),
  makeUser({ id: "lead", name: "Lead", roles: [UserRole.EDITOR], teams: { writer: "lead" } }),
  makeUser({ id: "member", name: "Member", roles: [UserRole.EDITOR], teams: { writer: "member" } }),
  makeUser({ id: "gone", name: "Gone", roles: [UserRole.EDITOR], teams: { writer: "member" }, status: UserStatus.DISABLED }),
];

describe("ScheduleService", () => {
  const userRepo = {
    findOneBy: jest.fn(async ({ id }: { id: string }) => people.find((u) => u.id === id) ?? null),
    findBy: jest.fn(async () => people),
    find: jest.fn(async () => people.filter((u) => u.status !== UserStatus.DISABLED)),
  };
  const rosterRepo = {
    findBy: jest.fn(async () => [{ team: Team.WRITER, userIds: ["lead", "gone", "member", "deleted"] }]),
    create: jest.fn((r) => r),
    save: jest.fn(async (r) => r),
  };
  const tx = { delete: jest.fn(), upsert: jest.fn() };
  const assignmentRepo = {
    find: jest.fn(async () => []),
    manager: { transaction: jest.fn(async (cb) => cb({ getRepository: () => tx })) },
  };
  const service = new ScheduleService(
    {} as any,
    rosterRepo as any,
    assignmentRepo as any,
    {} as any,
    {} as any,
    userRepo as any,
  );

  beforeEach(() => jest.clearAllMocks());

  describe("rosters", () => {
    it("lists members in rota order, leaving out disabled and deleted accounts", async () => {
      const rosters = await service.findRosters(UID);
      expect(rosters.find((r) => r.team === Team.WRITER)?.members).toEqual([
        { id: "lead", name: "Lead" },
        { id: "member", name: "Member" },
      ]);
      expect(rosters.map((r) => r.team)).toEqual([Team.WRITER, Team.REVIEWER, Team.IMAGE]);
    });

    it("lets a lead reorder their own team", async () => {
      await service.updateRoster(UID, "lead", Team.WRITER, ["member", "lead"]);
      expect(rosterRepo.save).toHaveBeenCalledWith(expect.objectContaining({ team: Team.WRITER, userIds: ["member", "lead"] }));
    });

    it.each([
      ["a lead, for another team", "lead", Team.IMAGE],
      ["a plain member", "member", Team.WRITER],
    ])("refuses %s", async (_, actor, team) => {
      await expect(service.updateRoster(UID, actor, team, [])).rejects.toThrow(ForbiddenException);
      expect(rosterRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("saveAssignments", () => {
    const items = [
      { date: "2026-11-02", team: Team.WRITER, userId: "member" },
      { date: "2026-11-03", team: Team.WRITER, userId: null },
    ];

    it("upserts set days and deletes cleared ones", async () => {
      await service.saveAssignments(UID, "manager", items);
      expect(tx.delete).toHaveBeenCalledWith({ publicationUid: UID, date: "2026-11-03", team: Team.WRITER });
      expect(tx.upsert).toHaveBeenCalledWith(
        [{ publicationUid: UID, date: "2026-11-02", team: Team.WRITER, userId: "member" }],
        ["publicationUid", "date", "team"],
      );
    });

    it("lets a lead save their own team", async () => {
      await expect(service.saveAssignments(UID, "lead", items)).resolves.toBeDefined();
    });

    it("refuses a lead when any item belongs to another team", async () => {
      await expect(
        service.saveAssignments(UID, "lead", [...items, { date: "2026-11-02", team: Team.IMAGE, userId: null }]),
      ).rejects.toThrow(ForbiddenException);
      expect(assignmentRepo.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe("findStaff", () => {
    it("is open to leads and leaves out disabled accounts", async () => {
      const staff = await service.findStaff("lead");
      expect(staff.map((s) => s.id)).toEqual(["manager", "lead", "member"]);
    });

    it("is closed to plain members", async () => {
      await expect(service.findStaff("member")).rejects.toThrow(ForbiddenException);
    });
  });
});
