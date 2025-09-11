import { Test, TestingModule } from '@nestjs/testing';
import { DespliegueController } from './despliegue.controller';

describe('DespliegueController', () => {
  let controller: DespliegueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DespliegueController],
    }).compile();

    controller = module.get<DespliegueController>(DespliegueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
