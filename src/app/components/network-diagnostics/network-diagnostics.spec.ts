import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkDiagnostics } from './network-diagnostics';
import { NetworkDiagnosticsService } from '../../services/network-diagnostics.service';

describe('NetworkDiagnostics', () => {
  let component: NetworkDiagnostics;
  let fixture: ComponentFixture<NetworkDiagnostics>;
  let serviceSpy: { diagnose: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    serviceSpy = {
      diagnose: vi.fn(async () => ({
        inputUrl: 'https://example.com',
        timeoutMs: 5000,
        startedAt: '2026-06-09T00:00:00.000Z',
        finishedAt: '2026-06-09T00:00:01.000Z',
        severity: 'success',
        summary: 'OK',
        http: {
          kind: 'http',
          outcome: 'success',
          severity: 'success',
          inputUrl: 'https://example.com',
          finalUrl: 'https://example.com',
          status: 200,
          statusText: 'OK',
          redirected: false,
          elapsedMs: 120,
          headers: { 'content-type': 'text/html' },
          note: 'Browser HTTP probe succeeded.',
          errorMessage: null,
        },
        iframe: {
          kind: 'iframe',
          outcome: 'loaded',
          severity: 'success',
          inputUrl: 'https://example.com',
          elapsedMs: 90,
          embeddable: true,
          title: 'Example',
          note: 'Loaded.',
          errorMessage: null,
        },
        backend: {
          kind: 'backend',
          outcome: 'skipped',
          severity: 'skipped',
          endpoint: null,
          elapsedMs: 0,
          data: null,
          note: 'No backend diagnostics endpoint is configured.',
          errorMessage: null,
        },
      })),
    };

    await TestBed.configureTestingModule({
      imports: [NetworkDiagnostics],
      providers: [{ provide: NetworkDiagnosticsService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkDiagnostics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('runs diagnostics and renders the summary state', async () => {
    await component.runDiagnostics();
    fixture.detectChanges();

    expect(serviceSpy.diagnose).toHaveBeenCalledOnce();
    expect(component.result()?.summary).toBe('OK');
    expect(component.severityLabel()).toBe('Healthy');
  });
});