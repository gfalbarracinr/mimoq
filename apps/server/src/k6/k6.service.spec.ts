import { Test, TestingModule } from '@nestjs/testing';
import { K6Service } from './k6.service';

describe('K6Service', () => {
  let service: K6Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [K6Service],
    }).compile();

    service = module.get<K6Service>(K6Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
