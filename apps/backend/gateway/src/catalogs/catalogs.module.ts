import { Module } from '@nestjs/common';
import { ApoderadosController } from './apoderados.controller';
import { AreasController } from './areas.controller';
import { SocietiesController } from './societies.controller';
import { TemplatesController } from './templates.controller';

@Module({
  controllers: [SocietiesController, AreasController, ApoderadosController, TemplatesController],
})
export class CatalogsModule {}
