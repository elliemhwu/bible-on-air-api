import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { PublicationsService } from './publications.service';
import { UpdatePublicationDto } from './update-publication.dto';

@ApiTags('Publications')
@ApiParam({ name: 'uid', example: 'bible-on-air' })
@Controller('publications/:uid')
export class PublicationsController {
  constructor(private readonly service: PublicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get a publication, including its About page (HTML)' })
  findOne(@Param('uid') uid: string) {
    return this.service.findOne(uid);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the publication summary and About page' })
  update(@Param('uid') uid: string, @Body() dto: UpdatePublicationDto) {
    return this.service.update(uid, dto);
  }
}
