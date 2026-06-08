import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TesterService, HistoryRecord } from '../../services/tester.service';

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
    const params = this.getRequestParams();

    const describe = window.prompt('Describe this request (optional)')?.trim();
    await this.testerService.saveRequest({
      ...params,
      describe: describe || undefined,
    });

    this.showToast(`Saved in indexedDB: ${params.method} ${params.url || 'Unnamed URL'}`);
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
    this.historyList.update(records => records.filter(item => item.id !== record.id));
    this.showToast('Removed from indexedDB');
  }

  loadRecord(record: HistoryRecord) {
    this.method.set(record.method);
    this.url.set(record.url);
    this.socketEventName.set(record.socketEventName || 'message');
    this.headers.set(record.headers && record.headers.length ? record.headers : [{ key: '', value: '', enabled: true }]);
    this.authType.set(record.authType);
    this.bearerToken.set(record.bearerToken || '');
    this.bodyType.set(record.bodyType);
    this.bodyRaw.set(record.bodyRaw || '');
    this.formData.set(record.formData && record.formData.length ? record.formData : [{ key: '', value: '', enabled: true }]);
    this.urlEncoded.set(record.urlEncoded && record.urlEncoded.length ? record.urlEncoded : [{ key: '', value: '', enabled: true }]);
    this.showHistory.set(false);
  }
}
