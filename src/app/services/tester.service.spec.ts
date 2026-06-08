import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TesterService } from './tester.service';

const ioMock = vi.hoisted(() => vi.fn());

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

class MockSocket {
  private anyHandlers: Array<(event: string, ...args: unknown[]) => void> = [];
  private eventHandlers = new Map<string, Array<(...args: unknown[]) => void>>();

  disconnect = vi.fn();
  offAny = vi.fn((handler: (event: string, ...args: unknown[]) => void) => {
    this.anyHandlers = this.anyHandlers.filter(item => item !== handler);
  });
  connect = vi.fn(() => {
    this.trigger('connect');
  });
  onAny = vi.fn((handler: (event: string, ...args: unknown[]) => void) => {
    this.anyHandlers.push(handler);
  });
  on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  });
  emit = vi.fn((event: string, payload: unknown, ack?: (...args: unknown[]) => void) => {
    queueMicrotask(() => {
      ack?.('ok');
    });
  });

  trigger(event: string, ...args: unknown[]) {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.forEach(handler => handler(...args));
  }

  triggerAny(event: string, ...args: unknown[]) {
    this.anyHandlers.forEach(handler => handler(event, ...args));
  }
}

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

describe('TesterService', () => {
  let service: TesterService;

  beforeEach(() => {
    installIndexedDbMock();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TesterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sends standard HTTP requests with fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 201,
      statusText: 'Created',
      text: async () => '{"ok":true}',
      headers: new Headers([['x-test', 'yes']]),
    } as Response);

    const response = await service.sendRequest({
      method: 'POST',
      url: 'https://example.com/api',
      headers: [{ key: 'x-demo', value: '1', enabled: true }],
      authType: 'none',
      bearerToken: '',
      bodyType: 'raw',
      bodyRaw: '{"name":"demo"}',
      formData: [],
      urlEncoded: [],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ok: true });

    fetchSpy.mockRestore();
  });

  it('sends socket.io requests and returns acknowledgement data', async () => {
    const mockSocket = new MockSocket();
    ioMock.mockReturnValue(mockSocket as never);

    const response = await service.sendRequest({
      method: 'WS',
      url: 'ws://localhost:3000',
      headers: [],
      authType: 'none',
      bearerToken: '',
      bodyType: 'raw',
      bodyRaw: '{"hello":"world"}',
      formData: [],
      urlEncoded: [],
      socketEventName: 'chat:message',
    });

    expect(ioMock).toHaveBeenCalledWith('http://localhost:3000', expect.objectContaining({
      autoConnect: false,
    }));
    expect(mockSocket.connect).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('chat:message', { hello: 'world' }, expect.any(Function));
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('Acknowledged');
    expect(response.body.emittedEvent).toBe('chat:message');
    expect(response.body.ack).toEqual(['ok']);
  });
});
