import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { BatchCoverImageDto } from './dto/batch-cover-image.dto';
import { BatchCreateArticleDto } from './dto/batch-create-article.dto';
import { BatchStatusDto } from './dto/batch-status.dto';
import { CreateMagazineArticleDto } from './dto/create-magazine-article.dto';
import { MagazineArticleQueryDto } from './dto/magazine-article-query.dto';
import { UpdateBlockContentDto } from './dto/update-block-content.dto';
import { UpdateMagazineArticleDto } from './dto/update-magazine-article.dto';
import { MagazineArticlesService } from './magazine-articles.service';

const EDITOR_AND_ABOVE = [UserRole.EDITOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.SUPER_ADMIN];
const REVIEWER_AND_ABOVE = [UserRole.REVIEWER, UserRole.MANAGER, UserRole.SUPER_ADMIN];
const MANAGER_AND_ABOVE = [UserRole.MANAGER, UserRole.SUPER_ADMIN];
const IMAGE_ROLES = [UserRole.IMAGE_EDITOR, UserRole.MANAGER, UserRole.SUPER_ADMIN];

@ApiTags('Magazine Articles')
@ApiParam({ name: 'uid', description: 'Magazine publication UID (e.g. bible-on-air)', example: 'bible-on-air' })
@Controller('magazines/:uid/articles')
export class MagazineArticlesController {
  constructor(private readonly magazineArticlesService: MagazineArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'List articles for a magazine (paginated)' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'pending_review', 'approved', 'published'] })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'book', required: false, isArray: true, description: '書卷縮寫（abbrZh），可多選，e.g. book=約&book=創' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼（預設 1）' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每頁筆數（預設 20）' })
  @ApiResponse({ status: 200, description: 'Returns paginated articles ordered by date descending' })
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
  @Roles(...EDITOR_AND_ABOVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new magazine article' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  create(@Param('uid') uid: string, @Body() dto: CreateMagazineArticleDto) {
    return this.magazineArticlesService.create(uid, dto);
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EDITOR_AND_ABOVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch create magazine articles (for migration)' })
  @ApiResponse({ status: 201, description: 'Articles created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  batchCreate(@Param('uid') uid: string, @Body() dto: BatchCreateArticleDto) {
    return this.magazineArticlesService.batchCreate(uid, dto);
  }

  @Post('batch-submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EDITOR_AND_ABOVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch submit articles for review' })
  @ApiResponse({ status: 201, description: 'Articles submitted' })
  batchSubmit(@Param('uid') uid: string, @Body() dto: BatchStatusDto) {
    return this.magazineArticlesService.batchSubmit(uid, dto.ids);
  }

  @Post('batch-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...REVIEWER_AND_ABOVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch mark articles as reviewed' })
  @ApiResponse({ status: 201, description: 'Articles reviewed' })
  batchReview(@Param('uid') uid: string, @Body() dto: BatchStatusDto) {
    return this.magazineArticlesService.batchReview(uid, dto.ids);
  }

  @Post('batch-publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGER_AND_ABOVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch publish articles (set visible = true)' })
  @ApiResponse({ status: 201, description: 'Articles published' })
  batchPublish(@Param('uid') uid: string, @Body() dto: BatchStatusDto) {
    return this.magazineArticlesService.batchPublish(uid, dto.ids);
  }

  @Post('batch-unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGER_AND_ABOVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch unpublish articles (set visible = false)' })
  @ApiResponse({ status: 201, description: 'Articles unpublished' })
  batchUnpublish(@Param('uid') uid: string, @Body() dto: BatchStatusDto) {
    return this.magazineArticlesService.batchUnpublish(uid, dto.ids);
  }

  @Post(':id/blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EDITOR_AND_ABOVE)
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
  @Roles(...EDITOR_AND_ABOVE)
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
  @Roles(...EDITOR_AND_ABOVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a block's content" })
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
