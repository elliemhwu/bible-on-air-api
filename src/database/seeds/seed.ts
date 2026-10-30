import * as bcrypt from "bcryptjs";
import { In } from "typeorm";
import { ArticleTemplate } from "../../article-templates/article-template.entity";
import { BlockType } from "../../blocks/block.entity";
import {
  Publication,
  PublicationType,
} from "../../publications/publication.entity";
import { Publisher } from "../../publishers/publisher.entity";
import { TeamRoles, User, UserRole } from "../../users/user.entity";
import dataSource from "../data-source";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEV_PASSWORD = "test1234";

// Development only: one test account per role, all with DEV_PASSWORD
const DEV_USERS: { email: string; name: string; roles: UserRole[]; teams?: TeamRoles }[] = [
  {
    email: "super-admin@boa.test",
    name: "Super Admin",
    roles: [UserRole.SUPER_ADMIN],
  },
  { email: "manager@boa.test", name: "Manager", roles: [UserRole.MANAGER] },
  { email: "editor@boa.test", name: "Editor", roles: [UserRole.EDITOR], teams: { writer: "lead" } },
  { email: "editor2@boa.test", name: "Editor 2", roles: [UserRole.EDITOR], teams: { writer: "member" } },
  { email: "editor3@boa.test", name: "Editor 3", roles: [UserRole.EDITOR], teams: { writer: "member" } },
  { email: "reviewer@boa.test", name: "Reviewer", roles: [UserRole.REVIEWER], teams: { reviewer: "member" } },
  { email: "reviewer2@boa.test", name: "Reviewer 2", roles: [UserRole.REVIEWER], teams: { reviewer: "member" } },
  {
    email: "image-editor@boa.test",
    name: "Image Editor",
    roles: [UserRole.IMAGE_EDITOR],
    teams: { image: "lead" },
  },
];

async function seed() {
  await dataSource.initialize();
  console.log("Connected to database");

  const publisherRepo = dataSource.getRepository(Publisher);
  const publicationRepo = dataSource.getRepository(Publication);
  const userRepo = dataSource.getRepository(User);
  const templateRepo = dataSource.getRepository(ArticleTemplate);

  await publisherRepo.upsert(
    { uid: "nghcc", name: "北門聖教會" },
    { conflictPaths: ["uid"], skipUpdateIfNoValuesChanged: true },
  );
  console.log("✓ Publisher: nghcc");

  await publicationRepo.upsert(
    {
      uid: "bible-on-air",
      type: PublicationType.MAGAZINE,
      name: "Bible On Air",
      summary: "北門雲端靈修",
      publisherUid: "nghcc",
    },
    { conflictPaths: ["uid"], skipUpdateIfNoValuesChanged: true },
  );
  console.log("✓ Publication: bible-on-air");

  if (!IS_PRODUCTION) {
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
    for (const u of DEV_USERS) {
      await userRepo.upsert(
        { teams: {}, ...u, passwordHash },
        { conflictPaths: ["email"], skipUpdateIfNoValuesChanged: false },
      );
      console.log(`✓ User: ${u.email}`);
    }
  }

  // First administrator; created once and never overwritten afterwards
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (await userRepo.existsBy({ email: adminEmail })) {
      console.log(`- Admin: ${adminEmail} (already exists, skipped)`);
    } else {
      await userRepo.save(
        userRepo.create({
          email: adminEmail,
          name: process.env.ADMIN_NAME || "Administrator",
          passwordHash: await bcrypt.hash(adminPassword, 10),
          roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER],
        }),
      );
      console.log(`✓ Admin: ${adminEmail}`);
    }
  } else if (IS_PRODUCTION) {
    console.log("- Admin: set ADMIN_EMAIL and ADMIN_PASSWORD to create the first account");
  }

  const templates = templateRepo.create([
    {
      name: "Bible On Air 每日靈修",
      publicationUid: "bible-on-air",
      isDefault: true,
      blockDefinitions: [
        {
          order: 1,
          type: BlockType.VERSE,
          subheading: null,
          label: "經文範圍",
          defaultContent: { displayMode: "ordered" },
          required: true,
        },
        {
          order: 2,
          type: BlockType.QUESTIONS,
          subheading: "觀察與思想",
          label: "觀察與思想",
          defaultContent: null,
          required: true,
        },
        {
          order: 3,
          type: BlockType.RICHTEXT,
          subheading: "今日靈修",
          label: "今日靈修",
          defaultContent: null,
          required: true,
        },
        {
          order: 4,
          type: BlockType.VERSE,
          subheading: "背誦經文",
          label: "背誦金句",
          defaultContent: { displayMode: "inline" },
          required: true,
        },
        {
          order: 5,
          type: BlockType.RICHTEXT,
          subheading: "回應與禱告",
          label: "回應與禱告",
          defaultContent: null,
          required: true,
        },
      ],
    },
    {
      name: "Bible On Air 書卷鳥瞰",
      publicationUid: "bible-on-air",
      isDefault: false,
      blockDefinitions: [
        {
          order: 1,
          type: BlockType.RICHTEXT,
          subheading: null,
          label: "書卷介紹",
          defaultContent: null,
          required: true,
        },
        {
          order: 2,
          type: BlockType.OUTLINE,
          subheading: "本書大綱",
          label: "書卷大綱",
          defaultContent: null,
          required: false,
        },
        {
          order: 3,
          type: BlockType.VERSE,
          subheading: "背誦經文",
          label: "背誦金句",
          defaultContent: { displayMode: "inline" },
          required: true,
        },
        {
          order: 4,
          type: BlockType.RICHTEXT,
          subheading: "回應與禱告",
          label: "回應與禱告",
          defaultContent: null,
          required: true,
        },
      ],
    },
  ]);

  const groupedNames = templates.reduce(
    (acc, t) => {
      if (!acc[t.publicationUid]) {
        acc[t.publicationUid] = [];
      }
      acc[t.publicationUid].push(t.name);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const existingTemplates = await templateRepo.findBy(
    Object.entries(groupedNames).flatMap(([publicationUid, names]) => ({
      publicationUid,
      name: In(names),
    })),
  );

  const insertingTemplates = templates.filter(
    (t) =>
      !existingTemplates.some(
        (et) => et.publicationUid === t.publicationUid && et.name === t.name,
      ),
  );

  if (insertingTemplates.length > 0) {
    await templateRepo.save(insertingTemplates);
    insertingTemplates.forEach((t) =>
      console.log(`✓ ArticleTemplate: ${t.name}`),
    );
  } else {
    console.log(
      "- ArticleTemplates: Bible On Air templates (already exist, skipped)",
    );
  }

  await dataSource.destroy();
  console.log("Done");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
