import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendRequest } from './send-request';

describe('SendRequest', () => {
  let component: SendRequest;
  let fixture: ComponentFixture<SendRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
