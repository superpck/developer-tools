import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
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

  activeTab = signal<'auth' | 'headers' | 'body'>('headers');
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
      urlEncoded: this.urlEncoded()
    };
  }

  responseState = signal<any>(null);

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
    await this.testerService.saveRequest(params);
    this.showToast(`Saved in indexedDB: ${params.method} ${params.url || 'Unnamed URL'}`);
  }

  async recall() {
    const records = await this.testerService.getHistory();
    this.historyList.set(records.sort((a, b) => b.timestamp - a.timestamp));
    this.showHistory.set(true);
  }

  loadRecord(record: HistoryRecord) {
    this.method.set(record.method);
    this.url.set(record.url);
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
