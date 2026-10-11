import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrlChecking } from './url-checking';

describe('UrlChecking', () => {
  let component: UrlChecking;
  let fixture: ComponentFixture<UrlChecking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrlChecking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UrlChecking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
