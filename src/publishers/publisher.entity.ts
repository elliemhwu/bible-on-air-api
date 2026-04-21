import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Publication } from '../publications/publication.entity';

class PublisherColumns {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  uid: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('publishers')
export class Publisher extends PublisherColumns {
  @OneToMany(() => Publication, (publication) => publication.publisher)
  publications: Publication[];
}
