import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { Layout } from './layout';

@Component({ template: '' })
class BlankComponent {}

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideRouter([
          { path: '', component: BlankComponent },
          { path: 'subnet', component: BlankComponent },
          { path: 'network', component: BlankComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with the dropdown closed and a generic "Tools" label', () => {
    expect(component.menuOpen()).toBe(false);
    expect(component.activeLabel()).toBe('Tools');
  });

  it('toggles the dropdown open and closed', () => {
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);

    component.toggleMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('closes the dropdown via closeMenu', () => {
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);

    component.closeMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('closes the dropdown when clicking outside the host element', () => {
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);

    component.onDocumentClick(new MouseEvent('click', { bubbles: true }));
    expect(component.menuOpen()).toBe(false);
  });

  it('keeps the dropdown open when the click originates inside the host element', () => {
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: fixture.nativeElement });
    component.onDocumentClick(event);
    expect(component.menuOpen()).toBe(true);
  });

  it('updates the active label and closes the menu after navigation', async () => {
    const router = TestBed.inject(Router);
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);

    await router.navigateByUrl('/subnet');
    fixture.detectChanges();

    expect(component.activeLabel()).toBe('Subnet Calculator');
    expect(component.menuOpen()).toBe(false);
  });
});
