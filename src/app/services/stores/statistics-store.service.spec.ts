import { TestBed } from '@angular/core/testing';

import { StatisticsStoreService } from './statistics-store.service';

describe('StatisticsStoreService', () => {
  let service: StatisticsStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatisticsStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
