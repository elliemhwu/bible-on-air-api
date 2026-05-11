import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "src/auth/decorators/roles.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { UserRole } from "src/users/user.entity";
import { ArticleTemplatesService } from "./article-templates.service";

@ApiTags("Article Templates")
@Controller("article-templates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArticleTemplatesController {
  constructor(private readonly service: ArticleTemplatesService) {}

  @Get()
  @Roles(UserRole.EDITOR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List all article templates" })
  @ApiQuery({
    name: "publicationUid",
    required: false,
    example: "bible-on-air",
  })
  findAll(@Query("publicationUid") publicationUid?: string) {
    return this.service.findAll(publicationUid);
  }
}
