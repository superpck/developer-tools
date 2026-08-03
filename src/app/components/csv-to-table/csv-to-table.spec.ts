import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsvToTable } from './csv-to-table';

describe('CsvToTable', () => {
  let component: CsvToTable;
  let fixture: ComponentFixture<CsvToTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsvToTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CsvToTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
