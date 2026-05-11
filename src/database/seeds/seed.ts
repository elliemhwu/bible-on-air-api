import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import "reflect-metadata";
import { DataSource, In } from "typeorm";
import { ArticleTemplate } from "../../article-templates/article-template.entity";
import { BlockType } from "../../blocks/block.entity";
import {
  Publication,
  PublicationType,
} from "../../publications/publication.entity";
import { Publisher } from "../../publishers/publisher.entity";
import { User, UserRole } from "../../users/user.entity";

dotenv.config();

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_DATABASE || "boa_db",
  entities: [Publisher, Publication, User, ArticleTemplate],
  synchronize: false,
});

const DEV_PASSWORD = "test1234";

const SEED_USERS: { email: string; name: string; roles: UserRole[] }[] = [
  {
    email: "super-admin@boa.test",
    name: "Super Admin",
    roles: [UserRole.SUPER_ADMIN],
  },
  { email: "manager@boa.test", name: "Manager", roles: [UserRole.MANAGER] },
  { email: "editor@boa.test", name: "Editor", roles: [UserRole.EDITOR] },
  { email: "reviewer@boa.test", name: "Reviewer", roles: [UserRole.REVIEWER] },
  {
    email: "image-editor@boa.test",
    name: "Image Editor",
    roles: [UserRole.IMAGE_EDITOR],
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

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  for (const u of SEED_USERS) {
    await userRepo.upsert(
      { ...u, passwordHash },
      { conflictPaths: ["email"], skipUpdateIfNoValuesChanged: false },
    );
    console.log(`✓ User: ${u.email}`);
  }

  const templates = templateRepo.create([
    {
      name: "Bible On Air 每日靈修",
      publicationUid: "bible-on-air",
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
          type: BlockType.RICHTEXT,
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
