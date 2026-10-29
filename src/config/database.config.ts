import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { dataSourceOptions } from '../database/data-source';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => dataSourceOptions,
);
