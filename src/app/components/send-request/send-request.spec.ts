import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SendRequest } from './send-request';
import { TesterService } from '../../services/tester.service';

function installIndexedDbMock() {
  const database = {
    objectStoreNames: {
      contains: () => false,
    },
    createObjectStore: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        add: vi.fn(() => ({ onsuccess: null, onerror: null })),
        getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
        delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
      })),
    })),
  };

  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: {
      open: vi.fn(() => {
        const request = {
          result: database,
          onupgradeneeded: null as null | ((event: IDBVersionChangeEvent) => void),
          onsuccess: null as null | ((event: Event) => void),
          onerror: null as null | ((event: Event) => void),
        };

        queueMicrotask(() => {
          request.onupgradeneeded?.({ target: { result: database } } as unknown as IDBVersionChangeEvent);
          request.onsuccess?.({ target: { result: database } } as unknown as Event);
        });

        return request;
      }),
    },
  });
}

describe('SendRequest', () => {
  let component: SendRequest;
  let testerService: TesterService;

  beforeEach(() => {
    installIndexedDbMock();
    (globalThis as any).window = globalThis;
    (globalThis as any).window.prompt = vi.fn();
    testerService = new TesterService();
    const injector = Injector.create({
      providers: [{ provide: TesterService, useValue: testerService }],
    });
    component = runInInjectionContext(injector, () => new SendRequest());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a socket.io snippet when WS mode is selected', () => {
    component.method.set('WS');
    component.url.set('ws://localhost:3000');
    component.socketEventName.set('chat:message');
    component.bodyRaw.set('{"hello":"world"}');

    expect(component.curlCommand()).toContain("import { io } from 'socket.io-client';");
    expect(component.curlCommand()).toContain("const socket = io('http://localhost:3000');");
    expect(component.curlCommand()).toContain("socket.emit('chat:message', JSON.parse(");
  });

  it('saves headers, auth, and body when saving request', async () => {
    const saveSpy = vi.spyOn(testerService, 'saveRequest').mockResolvedValue();
    vi.spyOn(window, 'prompt').mockReturnValue('My Saved API');

    component.method.set('POST');
    component.url.set('https://api.example.com/data');
    component.headers.set([
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: '', value: '', enabled: true }, // Empty dummy row should be filtered out
    ]);
    component.authType.set('bearer');
    component.bearerToken.set('test-token-123');
    component.bodyType.set('raw');
    component.bodyRaw.set('{"message":"hello"}');

    await component.save();

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.example.com/data',
        describe: 'My Saved API',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        authType: 'bearer',
        bearerToken: 'test-token-123',
        bodyType: 'raw',
        bodyRaw: '{"message":"hello"}',
      })
    );
  });

  it('omits headers, auth, and body when not provided', async () => {
    const saveSpy = vi.spyOn(testerService, 'saveRequest').mockResolvedValue();
    vi.spyOn(window, 'prompt').mockReturnValue(null);

    component.method.set('GET');
    component.url.set('https://api.example.com/ping');
    component.headers.set([{ key: '', value: '', enabled: true }]);
    component.authType.set('none');
    component.bearerToken.set('');
    component.bodyType.set('none');
    component.bodyRaw.set('');

    await component.save();

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com/ping',
        headers: undefined,
        authType: undefined,
        bearerToken: undefined,
        bodyType: undefined,
      })
    );
  });

  it('restores headers, auth, and body when loadRecord is called', () => {
    component.loadRecord({
      timestamp: Date.now(),
      method: 'POST',
      url: 'https://api.example.com/v2',
      headers: [{ key: 'X-Custom', value: 'abc', enabled: true }],
      authType: 'bearer',
      bearerToken: 'secret-xyz',
      bodyType: 'raw',
      bodyRaw: '{"test":123}',
      formData: [],
      urlEncoded: [],
    });

    expect(component.method()).toBe('POST');
    expect(component.url()).toBe('https://api.example.com/v2');
    expect(component.headers()).toEqual([{ key: 'X-Custom', value: 'abc', enabled: true }]);
    expect(component.authType()).toBe('bearer');
    expect(component.bearerToken()).toBe('secret-xyz');
    expect(component.bodyType()).toBe('raw');
    expect(component.bodyRaw()).toBe('{"test":123}');
  });
});
