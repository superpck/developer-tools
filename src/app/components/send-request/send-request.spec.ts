import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SendRequest } from './send-request';

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
  let fixture: ComponentFixture<SendRequest>;

  beforeEach(async () => {
    installIndexedDbMock();
    await TestBed.configureTestingModule({
      imports: [SendRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
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
});
