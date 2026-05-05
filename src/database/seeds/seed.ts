import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Publisher } from '../../publishers/publisher.entity';
import { Publication, PublicationType } from '../../publications/publication.entity';
import { User, UserRole } from '../../users/user.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'boa_db',
  entities: [Publisher, Publication, User],
  synchronize: false,
});

const DEV_PASSWORD = 'test1234';

const SEED_USERS: { email: string; name: string; roles: UserRole[] }[] = [
  { email: 'super-admin@boa.test', name: 'Super Admin', roles: [UserRole.SUPER_ADMIN] },
  { email: 'manager@boa.test',     name: 'Manager',     roles: [UserRole.MANAGER] },
  { email: 'editor@boa.test',      name: 'Editor',      roles: [UserRole.EDITOR] },
  { email: 'reviewer@boa.test',    name: 'Reviewer',    roles: [UserRole.REVIEWER] },
  { email: 'image-editor@boa.test', name: 'Image Editor', roles: [UserRole.IMAGE_EDITOR] },
];

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  const publisherRepo = dataSource.getRepository(Publisher);
  const publicationRepo = dataSource.getRepository(Publication);
  const userRepo = dataSource.getRepository(User);

  await publisherRepo.upsert(
    { uid: 'nghcc', name: '北門聖教會' },
    { conflictPaths: ['uid'], skipUpdateIfNoValuesChanged: true },
  );
  console.log('✓ Publisher: nghcc');

  await publicationRepo.upsert(
    {
      uid: 'bible-on-air',
      type: PublicationType.MAGAZINE,
      name: 'Bible On Air',
      summary: '北門雲端靈修',
      publisherUid: 'nghcc',
    },
    { conflictPaths: ['uid'], skipUpdateIfNoValuesChanged: true },
  );
  console.log('✓ Publication: bible-on-air');

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  for (const u of SEED_USERS) {
    await userRepo.upsert(
      { ...u, passwordHash },
      { conflictPaths: ['email'], skipUpdateIfNoValuesChanged: false },
    );
    console.log(`✓ User: ${u.email}`);
  }

  await dataSource.destroy();
  console.log('Done');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
