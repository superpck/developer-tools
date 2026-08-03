import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackendProbeResult, HttpProbeResult, IframeProbeResult, NetworkDiagnosticsResult, NetworkDiagnosticsService } from '../../services/network-diagnostics.service';

@Component({
  selector: 'app-network-diagnostics',
  imports: [CommonModule, FormsModule],
  templateUrl: './network-diagnostics.html',
  styleUrl: './network-diagnostics.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkDiagnostics {
  private readonly diagnosticsService = inject(NetworkDiagnosticsService);

  @ViewChild('iframeHost', { static: true })
  private readonly iframeHost!: ElementRef<HTMLElement>;

  readonly url = signal('https://example.com');
  readonly timeoutMs = signal(5000);
  readonly backendEndpoint = signal('');
  readonly showAdvanced = signal(false);
  readonly running = signal(false);
  readonly result = signal<NetworkDiagnosticsResult | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly hasResult = computed(() => this.result() !== null);
  readonly httpProbe = computed<HttpProbeResult | null>(() => this.result()?.http ?? null);
  readonly iframeProbe = computed<IframeProbeResult | null>(() => this.result()?.iframe ?? null);
  readonly backendProbe = computed<BackendProbeResult | null>(() => this.result()?.backend ?? null);

  readonly severityLabel = computed(() => {
    switch (this.result()?.severity) {
      case 'success':
        return 'Healthy';
      case 'warning':
        return 'Partial';
      case 'error':
        return 'Failed';
      default:
        return 'Idle';
    }
  });

  readonly severityClasses = computed(() => {
    switch (this.result()?.severity) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'error':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-600';
    }
  });

  readonly httpHeadersJson = computed(() => {
    const headers = this.httpProbe()?.headers ?? {};
    return Object.keys(headers).length ? JSON.stringify(headers, null, 2) : '';
  });

  readonly backendPayloadJson = computed(() => {
    const data = this.backendProbe()?.data;
    return data ? JSON.stringify(data, null, 2) : '';
  });

  toggleAdvanced() {
    this.showAdvanced.update(value => !value);
  }

  async runDiagnostics() {
    const targetUrl = this.url().trim();

    if (!targetUrl) {
      this.errorMessage.set('Enter a URL to inspect.');
      this.result.set(null);
      return;
    }

    this.running.set(true);
    this.errorMessage.set(null);

    try {
      const diagnostics = await this.diagnosticsService.diagnose(targetUrl, this.iframeHost.nativeElement, {
        timeoutMs: this.timeoutMs(),
        backendEndpoint: this.backendEndpoint().trim() || undefined,
      });

      this.result.set(diagnostics);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : String(error));
      this.result.set(null);
    } finally {
      this.running.set(false);
    }
  }
}