import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSagaComponent } from './add-saga.component';

describe('AddSagaComponent', () => {
  let component: AddSagaComponent;
  let fixture: ComponentFixture<AddSagaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSagaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddSagaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
