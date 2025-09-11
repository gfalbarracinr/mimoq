import { Test, TestingModule } from '@nestjs/testing';
import { SubatributoController } from './subatributo.controller';

describe('SubatributoController', () => {
  let controller: SubatributoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubatributoController],
    }).compile();

    controller = module.get<SubatributoController>(SubatributoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
