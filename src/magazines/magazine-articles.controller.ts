import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MagazineArticlesService } from './magazine-articles.service';
import { CreateMagazineArticleDto } from './dto/create-magazine-article.dto';
import { MagazineArticleQueryDto } from './dto/magazine-article-query.dto';
import { UpdateMagazineArticleDto } from './dto/update-magazine-article.dto';

@ApiTags('Magazine Articles')
@ApiParam({ name: 'uid', description: 'Magazine publication UID (e.g. bible-on-air)', example: 'bible-on-air' })
@Controller('magazines/:uid/articles')
export class MagazineArticlesController {
  constructor(private readonly magazineArticlesService: MagazineArticlesService) {}

  // Get Methods

  @Get()
  @ApiOperation({ summary: 'List all articles for a magazine' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'reviewed', 'published'] })
  @ApiResponse({ status: 200, description: 'Returns articles ordered by date descending' })
  findAll(@Param('uid') uid: string, @Query() query: MagazineArticleQueryDto) {
    return this.magazineArticlesService.findAll(uid, query);
  }

  @Get(':date')
  @ApiOperation({ summary: 'Get a single magazine article by date' })
  @ApiParam({ name: 'date', description: 'Article date in YYYY-MM-DD format', example: '2026-04-20' })
  @ApiResponse({ status: 200, description: 'Returns the article with its blocks ordered by block order' })
  @ApiResponse({ status: 404, description: 'No article found for the given date' })
  findByDate(@Param('uid') uid: string, @Param('date') date: string) {
    return this.magazineArticlesService.findByDate(uid, date);
  }

  // Post Methods

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new magazine article' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  create(@Param('uid') uid: string, @Body() dto: CreateMagazineArticleDto) {
    return this.magazineArticlesService.create(uid, dto);
  }

  // Patch Methods

  @Patch(':date')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a magazine article' })
  @ApiParam({ name: 'date', description: 'Article date in YYYY-MM-DD format', example: '2026-04-20' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ApiResponse({ status: 404, description: 'No article found for the given date' })
  update(
    @Param('uid') uid: string,
    @Param('date') date: string,
    @Body() dto: UpdateMagazineArticleDto,
  ) {
    return this.magazineArticlesService.update(uid, date, dto);
  }
}
