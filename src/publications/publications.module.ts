import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PublishersModule } from '../publishers/publishers.module';
import { Publication } from './publication.entity';
import { PublicationsController } from './publications.controller';
import { PublicationsService } from './publications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Publication]), PublishersModule, AuthModule],
  controllers: [PublicationsController],
  providers: [PublicationsService],
  exports: [TypeOrmModule],
})
export class PublicationsModule {}
