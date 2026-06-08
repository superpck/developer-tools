import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';

export interface RequestParams {
  method: string;
  url: string;
  describe?: string;
  headers: { key: string; value: string; enabled: boolean }[];
  authType: 'none' | 'bearer';
  bearerToken: string;
  bodyType: 'none' | 'form-data' | 'urlencoded' | 'raw';
  bodyRaw: string;
  formData: { key: string; value: string; enabled: boolean }[];
  urlEncoded: { key: string; value: string; enabled: boolean }[];
  socketEventName?: string;
}

export interface HistoryRecord extends RequestParams {
  id?: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class TesterService {
  private readonly dbName = 'ApiTesterDB';
  private readonly storeName = 'history';
  private readonly dbVersion = 1;

  constructor() {
    this.initDb().catch(err => console.error('Failed to init IndexedDB', err));
  }

  private initDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event: Event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event: Event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  public async saveRequest(params: RequestParams): Promise<void> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const record: HistoryRecord = {
          ...params,
          timestamp: Date.now()
        };

        const request = store.add(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save history', error);
    }
  }

  public async getHistory(): Promise<HistoryRecord[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get history', error);
      return [];
    }
  }

  public async deleteRequest(id: number): Promise<void> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete history item', error);
    }
  }

  private isSocketIoMethod(method: string): boolean {
    return method === 'WS' || method === 'WSS';
  }

  private buildSocketPayload(params: RequestParams): unknown {
    const rawPayload = params.bodyRaw.trim();

    if (!rawPayload) {
      return undefined;
    }

    try {
      return JSON.parse(rawPayload);
    } catch {
      return rawPayload;
    }
  }

  private getSocketTargetUrl(url: string): string {
    return url.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:');
  }

  private createSocketErrorResponse(error: unknown, startTime: number) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: 0,
      statusText: 'Socket Error',
      time: Math.round(performance.now() - startTime),
      size: 0,
      body: message,
      headers: {}
    };
  }

  private async sendSocketIoRequest(params: RequestParams): Promise<any> {
    const targetUrl = params.url.trim();

    if (!targetUrl) {
      return {
        status: 0,
        statusText: 'Error',
        time: 0,
        size: 0,
        body: 'Socket.IO URL is required.',
        headers: {}
      };
    }

    const startTime = performance.now();
    const socketUrl = this.getSocketTargetUrl(targetUrl);
    const socketEventName = params.socketEventName?.trim() || 'message';
    const payload = this.buildSocketPayload(params);
    const timeoutMs = 5000;
    const incomingEvents: Array<{ event: string; args: unknown[] }> = [];

    return new Promise(resolve => {
      const socket = io(socketUrl, {
        autoConnect: false,
        auth: params.bearerToken ? { token: params.bearerToken } : undefined,
      });

      let settled = false;
      const finish = (result: any) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        socket.offAny(handleAny);
        socket.disconnect();
        resolve(result);
      };

      const handleAny = (event: string, ...args: unknown[]) => {
        incomingEvents.push({ event, args });

        if (!settled && event !== 'connect' && event !== 'connect_error') {
          finish({
            status: 200,
            statusText: 'Received',
            time: Math.round(performance.now() - startTime),
            size: JSON.stringify({ event, args, incomingEvents }).length,
            body: {
              connected: true,
              socketUrl,
              emittedEvent: socketEventName,
              emittedPayload: payload,
              receivedEvent: event,
              receivedPayload: args,
              incomingEvents
            },
            headers: {
              transport: 'socket.io',
              url: socketUrl
            }
          });
        }
      };

      const timeoutId = setTimeout(() => {
        finish({
          status: 200,
          statusText: 'Connected',
          time: Math.round(performance.now() - startTime),
          size: JSON.stringify({ incomingEvents, emittedEvent: socketEventName, emittedPayload: payload }).length,
          body: {
            connected: true,
            socketUrl,
            emittedEvent: socketEventName,
            emittedPayload: payload,
            incomingEvents,
            timedOut: true
          },
          headers: {
            transport: 'socket.io',
            url: socketUrl
          }
        });
      }, timeoutMs);

      socket.onAny(handleAny);
      socket.on('connect', () => {
        if (payload === undefined) {
          return;
        }

        socket.emit(socketEventName, payload, (...ackArgs: unknown[]) => {
          finish({
            status: 200,
            statusText: 'Acknowledged',
            time: Math.round(performance.now() - startTime),
            size: JSON.stringify({ ackArgs, incomingEvents, emittedEvent: socketEventName, emittedPayload: payload }).length,
            body: {
              connected: true,
              socketUrl,
              emittedEvent: socketEventName,
              emittedPayload: payload,
              ack: ackArgs,
              incomingEvents
            },
            headers: {
              transport: 'socket.io',
              url: socketUrl
            }
          });
        });
      });
      socket.on('connect_error', error => {
        finish(this.createSocketErrorResponse(error, startTime));
      });
      socket.connect();
    });
  }

  async sendRequest(params: RequestParams): Promise<any> {
    if (this.isSocketIoMethod(params.method)) {
      return this.sendSocketIoRequest(params);
    }

    console.log('TesterService sending request...', params);
    
    try {
      const url = params.url;
      const init: RequestInit = {
        method: params.method,
        headers: {}
      };

      // Add Headers
      const headers = new Headers();
      if (params.headers) {
        params.headers.forEach(h => {
          if (h.enabled && h.key) {
            headers.append(h.key, h.value);
          }
        })
      }

      // Add Auth
      if (params.authType === 'bearer' && params.bearerToken) {
        headers.append('Authorization', `Bearer ${params.bearerToken}`);
      }
      
      init.headers = headers;

      // Add Body
      if (params.method !== 'GET' && params.method !== 'HEAD') {
        if (params.bodyType === 'raw') {
          init.body = params.bodyRaw;
        } else if (params.bodyType === 'form-data') {
          const fd = new FormData();
          params.formData.forEach(f => {
            if (f.enabled && f.key) fd.append(f.key, f.value);
          });
          init.body = fd;
        } else if (params.bodyType === 'urlencoded') {
          const urlSearchParams = new URLSearchParams();
          params.urlEncoded.forEach(u => {
            if (u.enabled && u.key) urlSearchParams.append(u.key, u.value);
          });
          init.body = urlSearchParams.toString();
          headers.append('Content-Type', 'application/x-www-form-urlencoded');
        }
      }

      const startTime = performance.now();
      const response = await fetch(url, init);
      const endTime = performance.now();

      const responseText = await response.text();
      let parsedBody: any = responseText;
      try {
        parsedBody = JSON.parse(responseText);
      } catch (e) {
        // Not JSON
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        time: Math.round(endTime - startTime),
        size: responseText.length,
        body: parsedBody,
        headers: responseHeaders
      };

    } catch (error: any) {
      console.error('Request Error:', error);
      return {
        status: 0,
        statusText: 'Error',
        time: 0,
        size: 0,
        body: error.message || String(error),
        headers: {}
      };
    }
  }
}
