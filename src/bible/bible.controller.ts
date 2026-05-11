import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BIBLE_BOOKS } from './bible-books.constant';
import { BibleService } from './bible.service';
import { BibleBook, VerseRange, VerseResultResponse } from './bible.types';
import { parseVerseRange } from './utils/verse-range-parser';

@ApiTags('Bible')
@Controller('bible')
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Get('books')
  @ApiOperation({ summary: 'List all Bible books with chapter and verse counts' })
  @ApiResponse({ status: 200, description: 'Returns all 66 books; chapters[i] = verse count of chapter i+1' })
  getBooks(): BibleBook[] {
    return BIBLE_BOOKS;
  }

  @Get('verses')
  @ApiOperation({ summary: 'Get verses by reference string' })
  @ApiQuery({ name: 'ref', description: 'Verse reference, e.g. 出13:19-21 or Exodus 13:19-21', example: '出13:19-21' })
  @ApiResponse({ status: 200, description: 'Returns parsed range and verse text' })
  @ApiResponse({ status: 400, description: 'Missing or invalid ref parameter' })
  async getVerses(@Query('ref') ref: string): Promise<VerseResultResponse> {
    if (!ref) throw new BadRequestException('ref query param is required');

    let range: VerseRange;
    try {
      range = parseVerseRange(ref);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid verse reference');
    }

    return this.bibleService.getVerses([range]);
  }
}
