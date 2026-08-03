import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JsonXmlFormatted } from './json-xml-formatted';

describe('JsonXmlFormatted', () => {
  let component: JsonXmlFormatted;
  let fixture: ComponentFixture<JsonXmlFormatted>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonXmlFormatted]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JsonXmlFormatted);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
