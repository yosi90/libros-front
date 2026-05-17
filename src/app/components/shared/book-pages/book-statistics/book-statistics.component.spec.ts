import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookStatisticsComponent } from './book-statistics.component';

describe('BookStatisticsComponent', () => {
  let component: BookStatisticsComponent;
  let fixture: ComponentFixture<BookStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
