import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TesterService, HistoryRecord, RequestParams } from '../../services/tester.service';

interface Toast {
  id: number;
  message: string;
}

@Component({
  selector: 'app-send-request',
  imports: [CommonModule, FormsModule],
  templateUrl: './send-request.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './send-request.css',
})
export class SendRequest {
  private testerService = inject(TesterService);

  showHistory = signal(false);
  historyList = signal<HistoryRecord[]>([]);
  toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;

  // Save Modal state
  currentRecordId = signal<number | null>(null);
  showSaveModal = signal(false);
  matchedRecord = signal<HistoryRecord | null>(null);
  saveDescribeInput = signal('');

  methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'WS', 'WSS'];
  method = signal('GET');
  url = signal('');
  socketEventName = signal('message');

  activeTab = signal<'auth' | 'headers' | 'body' | 'curl'>('headers');
  responseTab = signal<'body' | 'headers'>('body');

  // Auth
  authType = signal<'none' | 'bearer'>('none');
  bearerToken = signal('');

  // Headers
  headers = signal([{ key: '', value: '', enabled: true }]);

  addHeader() {
    this.headers.update(h => [...h, { key: '', value: '', enabled: true }]);
  }
  removeHeader(index: number) {
    this.headers.update(h => h.filter((_, i) => i !== index));
  }

  // Body
  bodyType = signal<'none' | 'form-data' | 'urlencoded' | 'raw'>('none');
  bodyRaw = signal('');
  formData = signal([{ key: '', value: '', enabled: true }]);
  urlEncoded = signal([{ key: '', value: '', enabled: true }]);

  addFormData() {
    this.formData.update(f => [...f, { key: '', value: '', enabled: true }]);
  }
  removeFormData(index: number) {
    this.formData.update(f => f.filter((_, i) => i !== index));
  }

  addUrlEncoded() {
    this.urlEncoded.update(u => [...u, { key: '', value: '', enabled: true }]);
  }
  removeUrlEncoded(index: number) {
    this.urlEncoded.update(u => u.filter((_, i) => i !== index));
  }

  private getRequestParams() {
    return {
      method: this.method(),
      url: this.url(),
      headers: this.headers(),
      authType: this.authType(),
      bearerToken: this.bearerToken(),
      bodyType: this.bodyType(),
      bodyRaw: this.bodyRaw(),
      formData: this.formData(),
      urlEncoded: this.urlEncoded(),
      socketEventName: this.socketEventName()
    };
  }

  responseState = signal<any>(null);

  curlCommand = computed(() => {
    const url = this.url().trim() || 'http://localhost';
    const method = this.method();

    if (method === 'WS' || method === 'WSS') {
      const socketUrl = url.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:');
      const socketEventName = this.socketEventName().trim() || 'message';
      const rawBody = this.bodyRaw().trim();

      return [
        "import { io } from 'socket.io-client';",
        '',
        `const socket = io('${socketUrl}');`,
        `socket.on('connect', () => {`,
        rawBody ? `  socket.emit('${socketEventName}', JSON.parse(${JSON.stringify(rawBody)}));` : `  socket.emit('${socketEventName}');`,
        `});`,
        `socket.onAny((event, ...args) => console.log(event, args));`
      ].join('\n');
    }

    let cmd = `curl --request ${method} \\\n  --url '${url}'`;

    // Headers
    const activeHeaders = this.headers().filter(h => h.enabled && h.key);
    for (const h of activeHeaders) {
      cmd += ` \\\n  --header '${h.key}: ${h.value}'`;
    }

    // Auth
    if (this.authType() === 'bearer' && this.bearerToken()) {
      cmd += ` \\\n  --header 'Authorization: Bearer ${this.bearerToken()}'`;
    }

    // Body
    if (method !== 'GET' && method !== 'HEAD') {
      const bType = this.bodyType();
      if (bType === 'raw' && this.bodyRaw()) {
        const escapedContent = this.bodyRaw().replace(/'/g, "'\\''");
        cmd += ` \\\n  --data '${escapedContent}'`;
      } else if (bType === 'form-data') {
        const fd = this.formData().filter(f => f.enabled && f.key);
        for (const f of fd) {
          const escapedVal = f.value.replace(/'/g, "'\\''");
          cmd += ` \\\n  --form '${f.key}="${escapedVal}"'`;
        }
      } else if (bType === 'urlencoded') {
        const ue = this.urlEncoded().filter(u => u.enabled && u.key);
        if (ue.length > 0) {
          cmd += ` \\\n  --header 'Content-Type: application/x-www-form-urlencoded'`;
          for (const u of ue) {
            const escapedVal = u.value.replace(/'/g, "'\\''");
            cmd += ` \\\n  --data-urlencode '${u.key}=${escapedVal}'`;
          }
        }
      }
    }

    return cmd;
  });

  copyCurl() {
    navigator.clipboard.writeText(this.curlCommand()).then(() => {
      this.showToast('cURL command copied to clipboard!');
    });
  }

  async send() {
    this.responseState.set({ loading: true });
    const result = await this.testerService.sendRequest(this.getRequestParams());
    this.responseState.set(result);
  }

  showToast(message: string) {
    const id = ++this.toastIdCounter;
    this.toasts.update(t => [...t, { id, message }]);
    setTimeout(() => {
      this.toasts.update(t => t.filter(toast => toast.id !== id));
    }, 3000);
  }

  async save() {
    const currentMethod = this.method();
    const currentUrl = this.url().trim();

    // Check if a matching record exists in DB
    const history = await this.testerService.getHistory();
    const currentId = this.currentRecordId();

    let matched: HistoryRecord | null = null;
    if (currentId !== null) {
      matched = history.find(r => r.id === currentId) ?? null;
    }
    if (!matched && currentUrl) {
      matched = history.find(r => r.method === currentMethod && r.url.trim() === currentUrl) ?? null;
    }

    this.matchedRecord.set(matched);
    this.saveDescribeInput.set(matched?.describe ?? '');
    this.showSaveModal.set(true);
  }

  closeSaveModal() {
    this.showSaveModal.set(false);
    this.matchedRecord.set(null);
  }

  async confirmSave(overwrite: boolean) {
    const method = this.method();
    const url = this.url().trim();
    const socketEventName = this.socketEventName();
    const describe = this.saveDescribeInput().trim() || undefined;

    // 1. Headers (if any non-empty key)
    const validHeaders = this.headers().filter(h => h.key.trim() !== '');
    const headers = validHeaders.length > 0 ? validHeaders.map(h => ({ ...h })) : undefined;

    // 2. Auth (if configured)
    const hasAuth = this.authType() === 'bearer' && this.bearerToken().trim() !== '';
    const authType = hasAuth ? 'bearer' : undefined;
    const bearerToken = hasAuth ? this.bearerToken().trim() : undefined;

    // 3. Body (if any)
    let bodyType: 'none' | 'raw' | 'form-data' | 'urlencoded' | undefined = undefined;
    let bodyRaw: string | undefined = undefined;
    let formData: { key: string; value: string; enabled: boolean }[] | undefined = undefined;
    let urlEncoded: { key: string; value: string; enabled: boolean }[] | undefined = undefined;

    if (method === 'WS' || method === 'WSS') {
      if (this.bodyRaw().trim() !== '') {
        bodyType = 'raw';
        bodyRaw = this.bodyRaw();
      }
    } else if (method !== 'GET' && method !== 'HEAD') {
      const currentBodyType = this.bodyType();
      if (currentBodyType === 'raw' && this.bodyRaw().trim() !== '') {
        bodyType = 'raw';
        bodyRaw = this.bodyRaw();
      } else if (currentBodyType === 'form-data') {
        const validFd = this.formData().filter(f => f.key.trim() !== '');
        if (validFd.length > 0) {
          bodyType = 'form-data';
          formData = validFd.map(f => ({ ...f }));
        }
      } else if (currentBodyType === 'urlencoded') {
        const validUe = this.urlEncoded().filter(u => u.key.trim() !== '');
        if (validUe.length > 0) {
          bodyType = 'urlencoded';
          urlEncoded = validUe.map(u => ({ ...u }));
        }
      }
    }

    const recordToSave: RequestParams = {
      method,
      url,
      describe,
      socketEventName: (method === 'WS' || method === 'WSS') ? socketEventName : undefined,
      headers,
      authType,
      bearerToken,
      bodyType,
      bodyRaw,
      formData,
      urlEncoded,
    };

    const matched = this.matchedRecord();
    const savedDetails: string[] = [];
    if (headers && headers.length > 0) savedDetails.push(`Headers: ${headers.length}`);
    if (hasAuth) savedDetails.push('Auth: Bearer');
    if (bodyType) savedDetails.push(`Body: ${bodyType}`);

    const detailText = savedDetails.length > 0 ? ` (${savedDetails.join(', ')})` : '';

    if (overwrite && matched && matched.id !== undefined) {
      await this.testerService.updateRequest(matched.id, recordToSave);
      this.currentRecordId.set(matched.id);
      this.showToast(`Updated in indexedDB: ${method} ${url || 'Unnamed URL'}${detailText}`);
    } else {
      const newId = await this.testerService.saveRequest(recordToSave);
      if (typeof newId === 'number') {
        this.currentRecordId.set(newId);
      }
      this.showToast(`Saved as new in indexedDB: ${method} ${url || 'Unnamed URL'}${detailText}`);
    }

    this.closeSaveModal();
  }

  async recall() {
    const records = await this.testerService.getHistory();
    this.historyList.set(records.sort((a, b) => b.timestamp - a.timestamp));
    this.showHistory.set(true);
  }

  async removeHistoryRecord(record: HistoryRecord, event?: MouseEvent) {
    event?.stopPropagation();

    if (record.id === undefined) {
      return;
    }

    await this.testerService.deleteRequest(record.id);
    if (this.currentRecordId() === record.id) {
      this.currentRecordId.set(null);
    }
    this.historyList.update(records => records.filter(item => item.id !== record.id));
    this.showToast('Removed from indexedDB');
  }

  hasHeaders(item: HistoryRecord): boolean {
    return !!(item.headers && item.headers.some(h => h.key?.trim() !== ''));
  }

  headersCount(item: HistoryRecord): number {
    return item.headers ? item.headers.filter(h => h.key?.trim() !== '').length : 0;
  }

  hasAuth(item: HistoryRecord): boolean {
    return item.authType === 'bearer' && !!item.bearerToken?.trim();
  }

  hasBody(item: HistoryRecord): boolean {
    if (item.bodyType === 'raw') return !!item.bodyRaw?.trim();
    if (item.bodyType === 'form-data') return !!(item.formData && item.formData.some(f => f.key?.trim() !== ''));
    if (item.bodyType === 'urlencoded') return !!(item.urlEncoded && item.urlEncoded.some(u => u.key?.trim() !== ''));
    return false;
  }

  loadRecord(record: HistoryRecord) {
    this.currentRecordId.set(record.id ?? null);
    this.method.set(record.method);
    this.url.set(record.url);
    this.socketEventName.set(record.socketEventName || 'message');

    // Headers
    this.headers.set(
      record.headers && record.headers.length
        ? record.headers.map(h => ({ ...h }))
        : [{ key: '', value: '', enabled: true }]
    );

    // Auth
    this.authType.set(record.authType || 'none');
    this.bearerToken.set(record.bearerToken || '');

    // Body
    this.bodyType.set(record.bodyType || 'none');
    this.bodyRaw.set(record.bodyRaw || '');
    this.formData.set(
      record.formData && record.formData.length
        ? record.formData.map(f => ({ ...f }))
        : [{ key: '', value: '', enabled: true }]
    );
    this.urlEncoded.set(
      record.urlEncoded && record.urlEncoded.length
        ? record.urlEncoded.map(u => ({ ...u }))
        : [{ key: '', value: '', enabled: true }]
    );

    this.showHistory.set(false);
  }
}
