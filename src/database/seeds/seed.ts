import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Publisher } from '../../publishers/publisher.entity';
import { Publication, PublicationType } from '../../publications/publication.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'boa_db',
  entities: [Publisher, Publication],
  synchronize: false,
});

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  const publisherRepo = dataSource.getRepository(Publisher);
  const publicationRepo = dataSource.getRepository(Publication);

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

  await dataSource.destroy();
  console.log('Done');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
