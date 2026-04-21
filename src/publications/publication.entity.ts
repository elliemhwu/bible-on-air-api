import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Publisher } from '../publishers/publisher.entity';

export enum PublicationType {
  MAGAZINE = 'magazine',
  BOOK = 'book',
}

class PublicationColumns {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  uid: string;

  @Column({ type: 'varchar', length: 50 })
  type: PublicationType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  about: string | null;

  @Column({ type: 'varchar', length: 100 })
  publisherUid: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('publications')
export class Publication extends PublicationColumns {
  @ManyToOne(() => Publisher, (publisher) => publisher.publications)
  @JoinColumn({ name: 'publisherUid', referencedColumnName: 'uid' })
  publisher: Publisher;
}
