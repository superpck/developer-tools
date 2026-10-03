import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { SubnetCalculator } from './subnet-calculator';

describe('SubnetCalculator', () => {
  let component: SubnetCalculator;
  let fixture: ComponentFixture<SubnetCalculator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubnetCalculator],
    }).compileComponents();

    fixture = TestBed.createComponent(SubnetCalculator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calculates subnet details for the default IP and prefix', () => {
    const result = component.result();
    expect(result).not.toBeNull();
    expect(result?.networkAddress).toBe('192.168.1.0');
    expect(result?.broadcastAddress).toBe('192.168.1.255');
    expect(result?.classification.type).toBe('private');
  });

  it('surfaces an error message for an invalid IP address', () => {
    component.ipAddress.set('999.999.999.999');
    fixture.detectChanges();

    expect(component.result()).toBeNull();
    expect(component.errorMessage()).toBeTruthy();
  });

  it('updates the subnet when a quick-pick prefix is selected', () => {
    component.setSubnetPrefix('30');
    fixture.detectChanges();

    expect(component.subnet()).toBe('30');
    expect(component.result()?.usableHosts).toBe(2);
  });

  it('toggles the CIDR cheat sheet visibility', () => {
    expect(component.showCheatSheet()).toBe(false);
    component.toggleCheatSheet();
    expect(component.showCheatSheet()).toBe(true);
  });
});
