import { Controller, Get, Param } from '@nestjs/common';
import { MagazinesService } from './magazines.service';

@Controller('magazines')
export class MagazinesController {
  constructor(private readonly magazinesService: MagazinesService) {}

  @Get(':date')
  findByDate(@Param('date') date: string) {
    return this.magazinesService.findByDate(date);
  }
}
