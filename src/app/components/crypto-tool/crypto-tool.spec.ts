import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CryptoTool } from './crypto-tool';

describe('CryptoTool', () => {
  let component: CryptoTool;
  let fixture: ComponentFixture<CryptoTool>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CryptoTool]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CryptoTool);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
