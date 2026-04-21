import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MagazineArticlesService } from './magazine-articles.service';
import { CreateMagazineArticleDto } from './dto/create-magazine-article.dto';
import { MagazineArticleQueryDto } from './dto/magazine-article-query.dto';
import { UpdateMagazineArticleDto } from './dto/update-magazine-article.dto';

@Controller('magazines/:uid/articles')
export class MagazineArticlesController {
  constructor(private readonly magazineArticlesService: MagazineArticlesService) {}

  // Get Methods

  @Get()
  findAll(@Param('uid') uid: string, @Query() query: MagazineArticleQueryDto) {
    return this.magazineArticlesService.findAll(uid, query);
  }

  @Get(':date')
  findByDate(@Param('uid') uid: string, @Param('date') date: string) {
    return this.magazineArticlesService.findByDate(uid, date);
  }

  // Post Methods

  @Post()
  create(@Param('uid') uid: string, @Body() dto: CreateMagazineArticleDto) {
    return this.magazineArticlesService.create(uid, dto);
  }

  // Patch Methods

  @Patch(':date')
  update(
    @Param('uid') uid: string,
    @Param('date') date: string,
    @Body() dto: UpdateMagazineArticleDto,
  ) {
    return this.magazineArticlesService.update(uid, date, dto);
  }
}
