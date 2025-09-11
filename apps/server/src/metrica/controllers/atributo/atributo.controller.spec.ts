import { Test, TestingModule } from '@nestjs/testing';
import { AtributoController } from './atributo.controller';

describe('AtributoController', () => {
  let controller: AtributoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AtributoController],
    }).compile();

    controller = module.get<AtributoController>(AtributoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
