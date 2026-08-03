import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkDiagnosticsService } from './network-diagnostics.service';

function createIframeStub() {
  const iframe = document.createElement('iframe') as HTMLIFrameElement & {
    dispatch: (event: string) => void;
  };
  const listeners = new Map<string, EventListener>();

  iframe.setAttribute = vi.fn(iframe.setAttribute.bind(iframe));
  iframe.addEventListener = vi.fn((event: string, handler: EventListener) => {
    listeners.set(event, handler);
  });
  iframe.removeEventListener = vi.fn((event: string) => {
    listeners.delete(event);
  });
  Object.defineProperty(iframe, 'contentDocument', {
    configurable: true,
    value: { title: 'Test page' },
  });
  iframe.dispatch = (event: string) => {
    listeners.get(event)?.(new Event(event));
  };

  return iframe;
}

describe('NetworkDiagnosticsService', () => {
  let service: NetworkDiagnosticsService;
  let documentStub: { createElement: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    documentStub = {
      createElement: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        NetworkDiagnosticsService,
        { provide: DOCUMENT, useValue: documentStub },
      ],
    });

    service = TestBed.inject(NetworkDiagnosticsService);
  });

  it('reports invalid urls before probing', async () => {
    const host = document.createElement('div');

    const result = await service.diagnose('not-a-url', host);

    expect(result.http.outcome).toBe('invalid-url');
    expect(result.iframe.outcome).toBe('invalid-url');
    expect(result.summary).toContain('valid absolute URL');
  });

  it('probes HTTP success and iframe load', async () => {
    const host = document.createElement('div');
    const iframeStub = createIframeStub();
    documentStub.createElement.mockReturnValue(iframeStub);

    const fetchSpy = vi.fn(async () => new Response('ok', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    }));
    globalThis.fetch = fetchSpy as typeof fetch;

    const promise = service.diagnose('https://example.com', host);
    iframeStub.dispatch('load');
    const result = await promise;

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result.http.outcome).toBe('success');
    expect(result.http.status).toBe(200);
    expect(result.iframe.outcome).toBe('loaded');
    expect(result.iframe.embeddable).toBe(true);
    expect(result.backend.outcome).toBe('skipped');
  });

  it('skips backend when no endpoint is provided', async () => {
    const host = document.createElement('div');
    const iframeStub = createIframeStub();
    documentStub.createElement.mockReturnValue(iframeStub);

    globalThis.fetch = vi.fn(async () => new Response('ok', { status: 200 })) as typeof fetch;

    const promise = service.diagnose('https://example.com', host);
    iframeStub.dispatch('load');
    const result = await promise;

    expect(result.backend.outcome).toBe('skipped');
    expect(result.backend.note).toContain('No backend diagnostics endpoint');
  });
});