import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

export type ProbeSeverity = 'success' | 'warning' | 'error' | 'skipped';
export type HttpProbeOutcome = 'success' | 'http-error' | 'network-error' | 'timeout' | 'invalid-url';
export type IframeProbeOutcome = 'loaded' | 'timeout' | 'error' | 'invalid-url';
export type BackendProbeOutcome = 'success' | 'error' | 'skipped';

export interface NetworkDiagnosticsOptions {
  timeoutMs?: number;
  backendEndpoint?: string;
}

export interface HttpProbeResult {
  kind: 'http';
  outcome: HttpProbeOutcome;
  severity: ProbeSeverity;
  inputUrl: string;
  finalUrl: string | null;
  status: number | null;
  statusText: string | null;
  redirected: boolean;
  elapsedMs: number;
  headers: Record<string, string>;
  note: string;
  errorMessage: string | null;
}

export interface IframeProbeResult {
  kind: 'iframe';
  outcome: IframeProbeOutcome;
  severity: ProbeSeverity;
  inputUrl: string;
  elapsedMs: number;
  embeddable: boolean | null;
  title: string | null;
  note: string;
  errorMessage: string | null;
}

export interface BackendProbeResult {
  kind: 'backend';
  outcome: BackendProbeOutcome;
  severity: ProbeSeverity;
  endpoint: string | null;
  elapsedMs: number;
  data: unknown;
  note: string;
  errorMessage: string | null;
}

export interface NetworkDiagnosticsResult {
  inputUrl: string;
  timeoutMs: number;
  startedAt: string;
  finishedAt: string;
  severity: ProbeSeverity;
  summary: string;
  http: HttpProbeResult;
  iframe: IframeProbeResult;
  backend: BackendProbeResult;
}

@Injectable({
  providedIn: 'root',
})
export class NetworkDiagnosticsService {
  private readonly document = inject(DOCUMENT);

  async diagnose(inputUrl: string, host: HTMLElement, options: NetworkDiagnosticsOptions = {}): Promise<NetworkDiagnosticsResult> {
    const normalizedUrl = inputUrl.trim();
    const timeoutMs = this.normalizeTimeout(options.timeoutMs);
    const startedAt = new Date().toISOString();
    const parsedUrl = this.parseAbsoluteUrl(normalizedUrl);

    if (!parsedUrl) {
      const http = this.invalidHttpResult(normalizedUrl, timeoutMs, 'Please enter a valid absolute URL.');
      const iframe = this.invalidIframeResult(normalizedUrl, timeoutMs, 'Please enter a valid absolute URL.');
      const backend = this.skippedBackendResult();

      return {
        inputUrl: normalizedUrl,
        timeoutMs,
        startedAt,
        finishedAt: new Date().toISOString(),
        severity: 'error',
        summary: 'Please enter a valid absolute URL.',
        http,
        iframe,
        backend,
      };
    }

    const [http, iframe, backend] = await Promise.all([
      this.probeHttp(parsedUrl, timeoutMs),
      this.probeIframe(parsedUrl, host, timeoutMs),
      this.probeBackend(normalizedUrl, timeoutMs, options.backendEndpoint),
    ]);

    const severity = this.pickSeverity([http.severity, iframe.severity, backend.severity]);

    return {
      inputUrl: normalizedUrl,
      timeoutMs,
      startedAt,
      finishedAt: new Date().toISOString(),
      severity,
      summary: this.buildSummary(http, iframe, backend),
      http,
      iframe,
      backend,
    };
  }

  private normalizeTimeout(timeoutMs?: number): number {
    if (!timeoutMs || Number.isNaN(timeoutMs)) {
      return 5000;
    }

    return Math.max(1000, Math.min(timeoutMs, 30000));
  }

  private parseAbsoluteUrl(value: string): URL | null {
    if (!value) {
      return null;
    }

    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  private invalidHttpResult(inputUrl: string, timeoutMs: number, note: string): HttpProbeResult {
    return {
      kind: 'http',
      outcome: 'invalid-url',
      severity: 'error',
      inputUrl,
      finalUrl: null,
      status: null,
      statusText: null,
      redirected: false,
      elapsedMs: 0,
      headers: {},
      note,
      errorMessage: 'URL must be absolute and include a scheme.',
    };
  }

  private invalidIframeResult(inputUrl: string, timeoutMs: number, note: string): IframeProbeResult {
    return {
      kind: 'iframe',
      outcome: 'invalid-url',
      severity: 'error',
      inputUrl,
      elapsedMs: 0,
      embeddable: null,
      title: null,
      note,
      errorMessage: 'URL must be absolute and include a scheme.',
    };
  }

  private skippedBackendResult(): BackendProbeResult {
    return {
      kind: 'backend',
      outcome: 'skipped',
      severity: 'skipped',
      endpoint: null,
      elapsedMs: 0,
      data: null,
      note: 'No backend diagnostics endpoint is configured.',
      errorMessage: null,
    };
  }

  private pickSeverity(values: ProbeSeverity[]): ProbeSeverity {
    if (values.includes('error')) {
      return 'error';
    }

    if (values.includes('warning')) {
      return 'warning';
    }

    return values.includes('success') ? 'success' : 'skipped';
  }

  private buildSummary(http: HttpProbeResult, iframe: IframeProbeResult, backend: BackendProbeResult): string {
    if (http.outcome === 'invalid-url' || iframe.outcome === 'invalid-url') {
      return 'Please enter a valid absolute URL.';
    }

    if (http.outcome === 'timeout' || iframe.outcome === 'timeout') {
      return 'At least one probe timed out before the destination responded.';
    }

    if (http.outcome === 'network-error') {
      return http.note;
    }

    if (backend.outcome === 'error') {
      return backend.note;
    }

    if (http.outcome === 'http-error') {
      return 'The destination replied, but it returned an HTTP error status.';
    }

    if (iframe.outcome === 'loaded') {
      return 'The URL loaded in an iframe and responded to browser HTTP probing.';
    }

    return 'The destination responded to browser diagnostics.';
  }

  private async probeHttp(parsedUrl: URL, timeoutMs: number): Promise<HttpProbeResult> {
    const startedAt = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(parsedUrl.toString(), {
          method: 'GET',
          cache: 'no-store',
          redirect: 'follow',
          signal: controller.signal,
        });

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const outcome: HttpProbeOutcome = response.ok ? 'success' : 'http-error';
        const severity: ProbeSeverity = response.ok ? 'success' : 'warning';

        return {
          kind: 'http',
          outcome,
          severity,
          inputUrl: parsedUrl.toString(),
          finalUrl: response.url || null,
          status: response.status,
          statusText: response.statusText || null,
          redirected: response.redirected,
          elapsedMs: Math.round(performance.now() - startedAt),
          headers,
          note: response.ok ? 'Browser HTTP probe succeeded.' : 'Browser HTTP probe reached the destination, but the server returned an error status.',
          errorMessage: null,
        };
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startedAt);

      if (this.isAbortError(error)) {
        return {
          kind: 'http',
          outcome: 'timeout',
          severity: 'warning',
          inputUrl: parsedUrl.toString(),
          finalUrl: null,
          status: null,
          statusText: null,
          redirected: false,
          elapsedMs,
          headers: {},
          note: 'The browser HTTP probe timed out.',
          errorMessage: 'Request aborted after the configured timeout.',
        };
      }

      if (error instanceof TypeError) {
        return {
          kind: 'http',
          outcome: 'network-error',
          severity: 'error',
          inputUrl: parsedUrl.toString(),
          finalUrl: null,
          status: null,
          statusText: null,
          redirected: false,
          elapsedMs,
          headers: {},
          note: 'The browser could not complete the request. This is usually a CORS, DNS, or network failure.',
          errorMessage: error.message,
        };
      }

      return {
        kind: 'http',
        outcome: 'network-error',
        severity: 'error',
        inputUrl: parsedUrl.toString(),
        finalUrl: null,
        status: null,
        statusText: null,
        redirected: false,
        elapsedMs,
        headers: {},
        note: 'The browser could not complete the request.',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async probeIframe(parsedUrl: URL, host: HTMLElement, timeoutMs: number): Promise<IframeProbeResult> {
    const startedAt = performance.now();

    try {
      const iframe = this.document.createElement('iframe') as HTMLIFrameElement;
      iframe.setAttribute('title', 'Network diagnostics iframe probe');
      iframe.setAttribute('loading', 'eager');
      iframe.referrerPolicy = 'no-referrer';
      iframe.style.position = 'absolute';
      iframe.style.left = '-99999px';
      iframe.style.top = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = '0';

      return await new Promise<IframeProbeResult>(resolve => {
        let settled = false;

        const cleanup = () => {
          iframe.removeEventListener('load', handleLoad);
          iframe.removeEventListener('error', handleError);
          if (iframe.parentElement) {
            iframe.parentElement.removeChild(iframe);
          }
        };

        const finish = (result: IframeProbeResult) => {
          if (settled) {
            return;
          }

          settled = true;
          window.clearTimeout(timeoutId);
          cleanup();
          resolve(result);
        };

        const handleLoad = () => {
          let title: string | null = null;

          try {
            title = iframe.contentDocument?.title || null;
          } catch {
            title = null;
          }

          finish({
            kind: 'iframe',
            outcome: 'loaded',
            severity: 'success',
            inputUrl: parsedUrl.toString(),
            elapsedMs: Math.round(performance.now() - startedAt),
            embeddable: true,
            title,
            note: 'The URL loaded inside an iframe. Cross-origin pages may still be intentionally opaque to browser inspection.',
            errorMessage: null,
          });
        };

        const handleError = () => {
          finish({
            kind: 'iframe',
            outcome: 'error',
            severity: 'error',
            inputUrl: parsedUrl.toString(),
            elapsedMs: Math.round(performance.now() - startedAt),
            embeddable: false,
            title: null,
            note: 'The iframe could not load the destination.',
            errorMessage: 'The browser fired an iframe error event.',
          });
        };

        const timeoutId = window.setTimeout(() => {
          finish({
            kind: 'iframe',
            outcome: 'timeout',
            severity: 'warning',
            inputUrl: parsedUrl.toString(),
            elapsedMs: Math.round(performance.now() - startedAt),
            embeddable: null,
            title: null,
            note: 'The iframe probe did not settle before the timeout.',
            errorMessage: 'Iframe load did not complete in time.',
          });
        }, timeoutMs);

        iframe.addEventListener('load', handleLoad);
        iframe.addEventListener('error', handleError);
        host.appendChild(iframe);
        iframe.src = parsedUrl.toString();
      });
    } catch (error) {
      return {
        kind: 'iframe',
        outcome: 'invalid-url',
        severity: 'error',
        inputUrl: parsedUrl.toString(),
        elapsedMs: Math.round(performance.now() - startedAt),
        embeddable: null,
        title: null,
        note: 'Please enter a valid absolute URL.',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async probeBackend(inputUrl: string, timeoutMs: number, backendEndpoint?: string): Promise<BackendProbeResult> {
    if (!backendEndpoint?.trim()) {
      return {
        kind: 'backend',
        outcome: 'skipped',
        severity: 'skipped',
        endpoint: null,
        elapsedMs: 0,
        data: null,
        note: 'No backend diagnostics endpoint is configured.',
        errorMessage: null,
      };
    }

    const startedAt = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(backendEndpoint.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: inputUrl, timeoutMs }),
          signal: controller.signal,
        });

        const payload = await response.json().catch(async () => ({ text: await response.text() }));

        if (!response.ok) {
          return {
            kind: 'backend',
            outcome: 'error',
            severity: 'error',
            endpoint: backendEndpoint.trim(),
            elapsedMs: Math.round(performance.now() - startedAt),
            data: payload,
            note: 'The backend diagnostics endpoint returned an error.',
            errorMessage: `${response.status} ${response.statusText}`.trim(),
          };
        }

        return {
          kind: 'backend',
          outcome: 'success',
          severity: 'success',
          endpoint: backendEndpoint.trim(),
          elapsedMs: Math.round(performance.now() - startedAt),
          data: payload,
          note: 'Backend diagnostics succeeded.',
          errorMessage: null,
        };
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch (error) {
      return {
        kind: 'backend',
        outcome: 'error',
        severity: 'error',
        endpoint: backendEndpoint.trim(),
        elapsedMs: Math.round(performance.now() - startedAt),
        data: null,
        note: 'The backend diagnostics request failed.',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
  }
}