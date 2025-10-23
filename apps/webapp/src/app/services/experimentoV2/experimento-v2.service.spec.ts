import { TestBed } from '@angular/core/testing';

import { ExperimentoV2Service } from './experimento-v2.service';

describe('ExperimentoV2Service', () => {
  let service: ExperimentoV2Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExperimentoV2Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
