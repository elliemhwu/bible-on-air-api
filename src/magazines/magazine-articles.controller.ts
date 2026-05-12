import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { BatchCoverImageDto } from './dto/batch-cover-image.dto';
import { CreateMagazineArticleDto } from './dto/create-magazine-article.dto';
import { MagazineArticleQueryDto } from './dto/magazine-article-query.dto';
import { UpdateBlockContentDto } from './dto/update-block-content.dto';
import { UpdateMagazineArticleDto } from './dto/update-magazine-article.dto';
import { MagazineArticlesService } from './magazine-articles.service';

const EDITOR_ROLES = [UserRole.EDITOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.SUPER_ADMIN];
const IMAGE_ROLES = [UserRole.IMAGE_EDITOR, UserRole.MANAGER, UserRole.SUPER_ADMIN];

@ApiTags('Magazine Articles')
@ApiParam({ name: 'uid', description: 'Magazine publication UID (e.g. bible-on-air)', example: 'bible-on-air' })
@Controller('magazines/:uid/articles')
export class MagazineArticlesController {
  constructor(private readonly magazineArticlesService: MagazineArticlesService) {}

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

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EDITOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new magazine article' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  create(@Param('uid') uid: string, @Body() dto: CreateMagazineArticleDto) {
    return this.magazineArticlesService.create(uid, dto);
  }

  @Post(':id/blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EDITOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create default blocks for an article from its article template' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 201, description: 'Blocks created, returns article with blocks' })
  @ApiResponse({ status: 404, description: 'Article or template not found' })
  @ApiResponse({ status: 409, description: 'Article already has blocks' })
  createBlocks(@Param('uid') uid: string, @Param('id') id: string) {
    return this.magazineArticlesService.createBlocksFromTemplate(uid, id);
  }

  @Patch('cover-images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...IMAGE_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch update cover images for multiple articles' })
  @ApiResponse({ status: 200, description: 'Returns updated articles' })
  batchUpdateCoverImages(@Param('uid') uid: string, @Body() dto: BatchCoverImageDto) {
    return this.magazineArticlesService.batchUpdateCoverImages(uid, dto.items);
  }

  @Patch(':date')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EDITOR_ROLES)
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

  @Patch(':date/blocks/:blockId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EDITOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a block\'s content' })
  @ApiParam({ name: 'date', description: 'Article date in YYYY-MM-DD format', example: '2026-04-20' })
  @ApiParam({ name: 'blockId', description: 'Block UUID' })
  @ApiResponse({ status: 200, description: 'Block updated successfully' })
  @ApiResponse({ status: 404, description: 'Article or block not found' })
  updateBlockContent(
    @Param('uid') uid: string,
    @Param('date') date: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateBlockContentDto,
  ) {
    return this.magazineArticlesService.updateBlockContent(uid, date, blockId, dto);
  }
}
