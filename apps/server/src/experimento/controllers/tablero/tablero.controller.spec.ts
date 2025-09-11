import { Test, TestingModule } from '@nestjs/testing';
import { TableroController } from './tablero.controller';

describe('TableroController', () => {
  let controller: TableroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TableroController],
    }).compile();

    controller = module.get<TableroController>(TableroController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
