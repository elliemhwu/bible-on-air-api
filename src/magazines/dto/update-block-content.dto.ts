import { IsObject } from 'class-validator';

export class UpdateBlockContentDto {
  @IsObject()
  content: Record<string, unknown>;
}
