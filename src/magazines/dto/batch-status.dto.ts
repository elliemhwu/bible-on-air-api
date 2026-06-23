import { IsArray, IsString } from 'class-validator';

export class BatchStatusDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
