import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { parseVerseRange } from './utils/verse-range-parser';
import { BibleService } from './bible.service';
import { VerseResult } from './bible.types';

@ApiTags('Bible')
@Controller('bible')
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Get('verses')
  @ApiOperation({ summary: 'Get verses by reference string' })
  @ApiQuery({ name: 'ref', description: 'Verse reference, e.g. 出13:19-21 or Exodus 13:19-21', example: '出13:19-21' })
  @ApiResponse({ status: 200, description: 'Returns parsed range and verse text' })
  @ApiResponse({ status: 400, description: 'Missing or invalid ref parameter' })
  async getVerses(@Query('ref') ref: string): Promise<VerseResult> {
    if (!ref) throw new BadRequestException('ref query param is required');

    let range;
    try {
      range = parseVerseRange(ref);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid verse reference');
    }

    return this.bibleService.getVerses([range]);
  }
}
