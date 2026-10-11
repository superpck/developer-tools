import { Injectable } from '@angular/core';

export type CheckSeverity = 'success' | 'warning' | 'error' | 'skipped';

// ---------------------------------------------------------------------------
// Security recommendations
// ---------------------------------------------------------------------------

export type RecommendationLevel = 'critical' | 'warning' | 'info';

export interface Recommendation {
  level: RecommendationLevel;
  message: string;
}

export type RecommendationSource = 'Rate limit & Load' | 'Injection' | 'CORS' | 'Security headers';

export interface SourcedRecommendation extends Recommendation {
  source: RecommendationSource;
}

const RECOMMENDATION_LEVEL_ORDER: Record<RecommendationLevel, number> = { critical: 0, warning: 1, info: 2 };

// ---------------------------------------------------------------------------
// Rate limit / load test
// ---------------------------------------------------------------------------

export interface LoadTestOptions {
  totalRequests: number;
  concurrency: number;
  method: string;
  timeoutMs: number;
}

export interface LoadTestRequestResult {
  index: number;
  status: number | null;
  ok: boolean;
  elapsedMs: number;
  error: string | null;
  retryAfter: string | null;
  rateLimitHeaders: Record<string, string>;
}

export interface ResponseTimeStats {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface LoadTestResult {
  inputUrl: string;
  totalRequests: number;
  concurrency: number;
  startedAt: string;
  finishedAt: string;
  totalElapsedMs: number;
  requests: LoadTestRequestResult[];
  successCount: number;
  rateLimitedCount: number;
  serverErrorCount: number;
  clientErrorCount: number;
  networkErrorCount: number;
  throughputRps: number;
  responseTime: ResponseTimeStats;
  rateLimitDetected: boolean;
  rateLimitEvidence: string[];
  severity: CheckSeverity;
  summary: string;
  recommendations: Recommendation[];
}

// ---------------------------------------------------------------------------
// Injection test
// ---------------------------------------------------------------------------

export type InjectionCategory = 'xss' | 'sqli' | 'pathTraversal' | 'commandInjection' | 'crlf' | 'openRedirect';

export interface InjectionPayloadDefinition {
  category: InjectionCategory;
  payload: string;
  description: string;
}

export interface InjectionFinding {
  category: InjectionCategory;
  description: string;
  payload: string;
  target: string;
  testedUrl: string;
  status: number | null;
  elapsedMs: number;
  baselineElapsedMs: number;
  suspicious: boolean;
  evidence: string;
  error: string | null;
}

export interface InjectionTestResult {
  baselineUrl: string;
  baselineStatus: number | null;
  baselineElapsedMs: number;
  targets: string[];
  placeholderUsed: boolean;
  findings: InjectionFinding[];
  suspiciousCount: number;
  severity: CheckSeverity;
  summary: string;
  recommendations: Recommendation[];
}

// ---------------------------------------------------------------------------
// CORS check
// ---------------------------------------------------------------------------

export interface CorsCheckResult {
  inputUrl: string;
  reachable: boolean;
  allowOrigin: string | null;
  allowCredentials: string | null;
  allowMethods: string | null;
  allowHeaders: string | null;
  wildcardWithCredentials: boolean;
  severity: CheckSeverity;
  summary: string;
  note: string;
  errorMessage: string | null;
  recommendations: Recommendation[];
}

// ---------------------------------------------------------------------------
// Security headers check
// ---------------------------------------------------------------------------

export interface SecurityHeaderCheck {
  name: string;
  present: boolean;
  value: string | null;
  recommendation: string;
  severity: 'ok' | 'warning' | 'missing';
}

export interface SecurityHeadersResult {
  inputUrl: string;
  status: number | null;
  headers: SecurityHeaderCheck[];
  missingCount: number;
  severity: CheckSeverity;
  summary: string;
  headersReadable: boolean;
  errorMessage: string | null;
  recommendations: Recommendation[];
}

// ---------------------------------------------------------------------------
// Safety caps - keep bursts small so the tool cannot be used to accidentally
// flood a production API.
// ---------------------------------------------------------------------------

export const MAX_LOAD_TEST_REQUESTS = 1000;
export const MAX_LOAD_TEST_CONCURRENCY = 100;

const REDIRECT_PARAM_NAMES = ['redirect', 'redirect_uri', 'redirecturl', 'url', 'next', 'return', 'returnurl', 'continue', 'redir', 'target', 'dest', 'destination'];

const SQL_ERROR_SIGNATURES = [
  'sql syntax',
  'mysql_fetch',
  'you have an error in your sql syntax',
  'warning: mysql',
  'unclosed quotation mark',
  'sqlite_error',
  'sqlstate',
  'pg_query',
  'ora-01756',
  'odbc driver',
  'microsoft ole db provider for sql server',
  'postgresql query failed',
];

const PATH_TRAVERSAL_SIGNATURES = ['root:x:0:0:', '[boot loader]', '[extensions]', 'daemon:x:'];

const COMMAND_OUTPUT_SIGNATURES = ['uid=0(root)', 'gid=0(root)', 'www-data', 'volume serial number'];

export const INJECTION_PAYLOADS: InjectionPayloadDefinition[] = [
  // XSS - reflected script detection
  { category: 'xss', payload: '<script>alert(1)</script>', description: 'Raw <script> tag reflection' },
  { category: 'xss', payload: '"><img src=x onerror=alert(1)>', description: 'Attribute breakout + onerror handler' },
  // SQL injection
  { category: 'sqli', payload: "' OR '1'='1", description: 'Classic boolean-based OR bypass' },
  { category: 'sqli', payload: "' OR 1=1 --", description: 'Comment-terminated boolean bypass' },
  { category: 'sqli', payload: "' UNION SELECT NULL--", description: 'UNION-based probe' },
  // Path traversal
  { category: 'pathTraversal', payload: '../../../../../../etc/passwd', description: 'Unix passwd traversal' },
  { category: 'pathTraversal', payload: '..%2f..%2f..%2f..%2fetc%2fpasswd', description: 'URL-encoded traversal' },
  // Command injection (mix of output-based and time-based)
  { category: 'commandInjection', payload: '; id', description: 'Unix command chaining (output-based)' },
  { category: 'commandInjection', payload: '| whoami', description: 'Pipe command chaining (output-based)' },
  { category: 'commandInjection', payload: '; sleep 5', description: 'Time-based blind detection (expects ~5s delay)' },
  // CRLF / header injection
  { category: 'crlf', payload: '%0d%0aX-Injected-Header: injected', description: 'CRLF header injection attempt' },
  // Open redirect
  { category: 'openRedirect', payload: 'https://evil-example-redirect-test.invalid', description: 'External absolute URL redirect' },
  { category: 'openRedirect', payload: '//evil-example-redirect-test.invalid', description: 'Protocol-relative redirect' },
];

const SECURITY_HEADER_DEFINITIONS: { name: string; recommendation: string }[] = [
  { name: 'content-security-policy', recommendation: 'Restricts sources of scripts/styles to mitigate XSS.' },
  { name: 'strict-transport-security', recommendation: 'Forces HTTPS and protects against protocol downgrade attacks.' },
  { name: 'x-content-type-options', recommendation: 'Set to "nosniff" to stop MIME-sniffing attacks.' },
  { name: 'x-frame-options', recommendation: 'Mitigates clickjacking by restricting framing.' },
  { name: 'referrer-policy', recommendation: 'Limits how much referrer data leaks to other origins.' },
  { name: 'permissions-policy', recommendation: 'Restricts access to powerful browser features.' },
];

interface FetchOutcome {
  response: Response | null;
  elapsedMs: number;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class UrlCheckingService {

  // -------------------------------------------------------------------------
  // Rate limit / load test
  // -------------------------------------------------------------------------

  async runLoadTest(inputUrl: string, options: Partial<LoadTestOptions> = {}): Promise<LoadTestResult> {
    const totalRequests = this.clamp(options.totalRequests ?? 20, 1, MAX_LOAD_TEST_REQUESTS);
    const concurrency = this.clamp(options.concurrency ?? 5, 1, MAX_LOAD_TEST_CONCURRENCY);
    const method = options.method?.trim() || 'GET';
    const timeoutMs = this.normalizeTimeout(options.timeoutMs);

    const startedAt = new Date().toISOString();
    const start = performance.now();

    const results: LoadTestRequestResult[] = [];
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < totalRequests) {
        const index = nextIndex++;
        results.push(await this.executeLoadTestRequest(inputUrl, method, index, timeoutMs));
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    results.sort((a, b) => a.index - b.index);

    const totalElapsedMs = Math.round(performance.now() - start);
    const finishedAt = new Date().toISOString();

    const successCount = results.filter(r => r.ok).length;
    const rateLimitedCount = results.filter(r => r.status === 429).length;
    const serverErrorCount = results.filter(r => r.status !== null && r.status >= 500).length;
    const clientErrorCount = results.filter(r => r.status !== null && r.status >= 400 && r.status < 500 && r.status !== 429).length;
    const networkErrorCount = results.filter(r => r.status === null).length;

    const responseTime = this.computeResponseTimeStats(results.map(r => r.elapsedMs));
    const throughputRps = totalElapsedMs > 0 ? Math.round((results.length / (totalElapsedMs / 1000)) * 100) / 100 : 0;

    const rateLimitEvidence: string[] = [];
    if (rateLimitedCount > 0) {
      const firstHit = results.find(r => r.status === 429);
      rateLimitEvidence.push(`Received HTTP 429 on ${rateLimitedCount} of ${results.length} request(s), first at request #${(firstHit?.index ?? 0) + 1}.`);
    }
    const retryAfterSample = results.find(r => r.retryAfter);
    if (retryAfterSample) {
      rateLimitEvidence.push(`Retry-After header observed: ${retryAfterSample.retryAfter}`);
    }
    const rateLimitHeaderSample = results.find(r => Object.keys(r.rateLimitHeaders).length > 0);
    if (rateLimitHeaderSample) {
      const parts = Object.entries(rateLimitHeaderSample.rateLimitHeaders).map(([k, v]) => `${k}: ${v}`);
      rateLimitEvidence.push(`Rate limit headers exposed: ${parts.join(', ')}`);
    }

    const rateLimitDetected = rateLimitEvidence.length > 0;

    let severity: CheckSeverity = 'success';
    let summary = `Sent ${results.length} request(s); ${successCount} succeeded.`;
    if (networkErrorCount === results.length) {
      severity = 'error';
      summary = 'All requests failed (network error or blocked by CORS). Unable to assess rate limiting.';
    } else if (serverErrorCount > 0) {
      severity = 'warning';
      summary = `${serverErrorCount} request(s) returned a server error (5xx) under load.`;
    } else if (rateLimitDetected) {
      severity = 'warning';
      summary = 'Rate limiting was detected while bursting requests.';
    } else {
      summary = 'No rate limiting was observed for this burst. Consider increasing the request count or verifying limits are enforced server-side.';
    }

    const recommendations = this.buildLoadTestRecommendations({
      networkErrorCount,
      totalRequests: results.length,
      serverErrorCount,
      rateLimitDetected,
      rateLimitEvidence,
      responseTime,
    });

    return {
      inputUrl,
      totalRequests,
      concurrency,
      startedAt,
      finishedAt,
      totalElapsedMs,
      requests: results,
      successCount,
      rateLimitedCount,
      serverErrorCount,
      clientErrorCount,
      networkErrorCount,
      throughputRps,
      responseTime,
      rateLimitDetected,
      rateLimitEvidence,
      severity,
      summary,
      recommendations,
    };
  }

  private buildLoadTestRecommendations(input: {
    networkErrorCount: number;
    totalRequests: number;
    serverErrorCount: number;
    rateLimitDetected: boolean;
    rateLimitEvidence: string[];
    responseTime: ResponseTimeStats;
  }): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (input.networkErrorCount === input.totalRequests) {
      recommendations.push({ level: 'info', message: 'All requests failed, so rate limiting could not be assessed. Re-run once the endpoint is reachable from the browser.' });
      return recommendations;
    }

    if (input.serverErrorCount > 0) {
      recommendations.push({ level: 'critical', message: `${input.serverErrorCount} request(s) returned a 5xx error under a small concurrent burst. Investigate capacity, connection pooling, and error handling before release.` });
    }

    if (!input.rateLimitDetected) {
      recommendations.push({ level: 'warning', message: 'No rate limiting was observed. Add per-IP/per-API-key rate limiting (e.g. return HTTP 429 with a Retry-After header) to protect this endpoint from abuse and denial-of-service.' });
    } else {
      if (!input.rateLimitEvidence.some(e => e.toLowerCase().includes('retry-after'))) {
        recommendations.push({ level: 'info', message: 'Rate limiting is enforced, but no Retry-After header was observed. Exposing it lets well-behaved clients back off automatically instead of retrying immediately.' });
      }
      if (!input.rateLimitEvidence.some(e => e.toLowerCase().includes('rate limit headers exposed'))) {
        recommendations.push({ level: 'info', message: 'Consider exposing X-RateLimit-Limit/Remaining/Reset (or RateLimit-*) headers so clients can proactively avoid hitting the limit.' });
      }
    }

    if (input.responseTime.p95 > 2000) {
      recommendations.push({ level: 'info', message: `p95 response time under load was ${input.responseTime.p95}ms. Consider caching, query optimization, or autoscaling before release if this is user-facing.` });
    }

    return recommendations;
  }

  private async executeLoadTestRequest(url: string, method: string, index: number, timeoutMs: number): Promise<LoadTestRequestResult> {
    const outcome = await this.fetchWithTimeout(url, { method, cache: 'no-store' }, timeoutMs);

    if (!outcome.response) {
      return {
        index,
        status: null,
        ok: false,
        elapsedMs: outcome.elapsedMs,
        error: outcome.error,
        retryAfter: null,
        rateLimitHeaders: {},
      };
    }

    const rateLimitHeaders: Record<string, string> = {};
    ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset'].forEach(name => {
      const value = outcome.response!.headers.get(name);
      if (value) {
        rateLimitHeaders[name] = value;
      }
    });

    return {
      index,
      status: outcome.response.status,
      ok: outcome.response.ok,
      elapsedMs: outcome.elapsedMs,
      error: null,
      retryAfter: outcome.response.headers.get('retry-after'),
      rateLimitHeaders,
    };
  }

  private computeResponseTimeStats(values: number[]): ResponseTimeStats {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sorted.reduce((sum, v) => sum + v, 0) / sorted.length),
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  // -------------------------------------------------------------------------
  // Injection test
  // -------------------------------------------------------------------------

  async runInjectionTest(inputUrl: string, categories: InjectionCategory[], options: { placeholderToken?: string; timeoutMs?: number } = {}): Promise<InjectionTestResult> {
    const placeholderToken = options.placeholderToken || '{{payload}}';
    const timeoutMs = this.normalizeTimeout(options.timeoutMs);
    const usesPlaceholder = inputUrl.includes(placeholderToken);

    const baselineUrl = usesPlaceholder ? inputUrl.split(placeholderToken).join('') : inputUrl;
    const baselineOutcome = await this.fetchWithTimeout(baselineUrl, { method: 'GET', cache: 'no-store' }, timeoutMs);

    const targets = usesPlaceholder ? [placeholderToken] : this.extractQueryParamNames(inputUrl);
    const payloads = INJECTION_PAYLOADS.filter(p => categories.includes(p.category));

    const findings: InjectionFinding[] = [];

    if (targets.length === 0) {
      return {
        baselineUrl,
        baselineStatus: baselineOutcome.response?.status ?? null,
        baselineElapsedMs: baselineOutcome.elapsedMs,
        targets: [],
        placeholderUsed: usesPlaceholder,
        findings: [],
        suspiciousCount: 0,
        severity: 'skipped',
        summary: 'No query parameters or {{payload}} placeholder found in the URL, so there is nowhere to inject a payload. Add a query string (e.g. ?q=test) or insert {{payload}} where it should be tested.',
        recommendations: [{ level: 'info', message: 'Add representative query parameters (or an explicit {{payload}} placeholder) to the URL so injection testing has a target to exercise.' }],
      };
    }

    for (const target of targets) {
      for (const payloadDef of payloads) {
        // Open redirect payloads are only meaningful on parameters that look redirect-related,
        // or when an explicit placeholder was provided by the user.
        if (payloadDef.category === 'openRedirect' && !usesPlaceholder && !REDIRECT_PARAM_NAMES.includes(target.toLowerCase())) {
          continue;
        }

        const testedUrl = usesPlaceholder
          ? inputUrl.split(placeholderToken).join(encodeURIComponent(payloadDef.payload))
          : this.replaceQueryParam(inputUrl, target, payloadDef.payload);

        const outcome = await this.fetchWithTimeout(testedUrl, { method: 'GET', cache: 'no-store', redirect: 'follow' }, timeoutMs);
        findings.push(await this.evaluateInjectionFinding(payloadDef, target, testedUrl, outcome, baselineOutcome));
      }
    }

    const suspiciousCount = findings.filter(f => f.suspicious).length;
    const errorCount = findings.filter(f => f.error).length;

    let severity: CheckSeverity = 'success';
    let summary = `Tested ${findings.length} payload(s) across ${targets.length} target(s); no suspicious responses found.`;
    if (errorCount === findings.length && findings.length > 0) {
      severity = 'error';
      summary = 'All injection requests failed (network error or blocked by CORS). Unable to assess injection risks from the browser.';
    } else if (suspiciousCount > 0) {
      severity = 'error';
      summary = `${suspiciousCount} of ${findings.length} payload(s) produced a suspicious response. Review the findings below before release.`;
    } else if (errorCount > 0) {
      severity = 'warning';
      summary = `${errorCount} of ${findings.length} payload(s) could not be verified (network error or CORS). The rest showed no suspicious behavior.`;
    }

    const recommendations = this.buildInjectionRecommendations(findings, suspiciousCount, errorCount);

    return {
      baselineUrl,
      baselineStatus: baselineOutcome.response?.status ?? null,
      baselineElapsedMs: baselineOutcome.elapsedMs,
      targets,
      placeholderUsed: usesPlaceholder,
      findings,
      suspiciousCount,
      severity,
      summary,
      recommendations,
    };
  }

  private buildInjectionRecommendations(findings: InjectionFinding[], suspiciousCount: number, errorCount: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const suspiciousCategories = new Set(findings.filter(f => f.suspicious).map(f => f.category));

    const CATEGORY_FIXES: Record<InjectionCategory, string> = {
      xss: 'Possible reflected XSS detected. HTML-encode all user-supplied input before writing it into HTML/JS/attribute contexts, and deploy a strict Content-Security-Policy as defense in depth.',
      sqli: 'Possible SQL injection indicators detected. Use parameterized queries/prepared statements (or an ORM) and never concatenate user input directly into SQL.',
      pathTraversal: 'Possible path traversal detected. Validate and canonicalize file paths against an allow-list, and avoid passing user input directly to filesystem APIs.',
      commandInjection: 'Possible command injection detected. Avoid invoking OS shell commands with user input; use safe library APIs or a strict allow-list of accepted values.',
      crlf: 'Possible CRLF/header injection detected. Reject or strip CR/LF characters from any user input written into HTTP headers or redirect targets.',
      openRedirect: 'Possible open redirect detected. Validate redirect destinations against an allow-list of internal paths/domains instead of trusting user-supplied URLs.',
    };

    for (const category of suspiciousCategories) {
      recommendations.push({ level: 'critical', message: CATEGORY_FIXES[category] });
    }

    if (suspiciousCount === 0 && findings.length > 0 && errorCount < findings.length) {
      recommendations.push({ level: 'info', message: 'No injection issues were flagged by these heuristics, but this is not a substitute for a full security review (SAST/DAST/manual penetration test) before release.' });
    }

    if (errorCount > 0) {
      recommendations.push({ level: 'info', message: `${errorCount} payload(s) could not be verified from the browser (network error or CORS). Validate those manually or with a server-side scanner.` });
    }

    return recommendations;
  }

  private async evaluateInjectionFinding(
    payloadDef: InjectionPayloadDefinition,
    target: string,
    testedUrl: string,
    outcome: FetchOutcome,
    baseline: FetchOutcome,
  ): Promise<InjectionFinding> {
    const base: Omit<InjectionFinding, 'suspicious' | 'evidence'> = {
      category: payloadDef.category,
      description: payloadDef.description,
      payload: payloadDef.payload,
      target,
      testedUrl,
      status: outcome.response?.status ?? null,
      elapsedMs: outcome.elapsedMs,
      baselineElapsedMs: baseline.elapsedMs,
      error: outcome.error,
    };

    if (!outcome.response) {
      return { ...base, suspicious: false, evidence: `Request failed: ${outcome.error ?? 'unknown error'} (possibly blocked by CORS).` };
    }

    let bodyText = '';
    try {
      bodyText = (await outcome.response.clone().text()).toLowerCase();
    } catch {
      bodyText = '';
    }

    switch (payloadDef.category) {
      case 'xss': {
        if (bodyText && bodyText.includes(payloadDef.payload.toLowerCase())) {
          return { ...base, suspicious: true, evidence: 'Payload was reflected unescaped in the response body - possible reflected XSS.' };
        }
        return { ...base, suspicious: false, evidence: bodyText ? 'Payload was not reflected unescaped.' : 'Response body not readable (opaque/cross-origin response); could not check for reflection.' };
      }
      case 'sqli': {
        const matched = SQL_ERROR_SIGNATURES.find(sig => bodyText.includes(sig));
        if (matched) {
          return { ...base, suspicious: true, evidence: `Response body contains a SQL error signature: "${matched}".` };
        }
        if (outcome.response.status >= 500 && baseline.response && baseline.response.status < 500) {
          return { ...base, suspicious: true, evidence: `Payload triggered HTTP ${outcome.response.status} while the baseline request succeeded.` };
        }
        return { ...base, suspicious: false, evidence: 'No SQL error signatures or status anomaly detected.' };
      }
      case 'pathTraversal': {
        const matched = PATH_TRAVERSAL_SIGNATURES.find(sig => bodyText.includes(sig));
        if (matched) {
          return { ...base, suspicious: true, evidence: `Response body contains traversal evidence: "${matched}".` };
        }
        return { ...base, suspicious: false, evidence: bodyText ? 'No traversal file contents detected in the response.' : 'Response body not readable; could not check for traversal evidence.' };
      }
      case 'commandInjection': {
        const matched = COMMAND_OUTPUT_SIGNATURES.find(sig => bodyText.includes(sig));
        if (matched) {
          return { ...base, suspicious: true, evidence: `Response body contains command output evidence: "${matched}".` };
        }
        if (payloadDef.payload.includes('sleep') && outcome.elapsedMs > baseline.elapsedMs + 3000) {
          return { ...base, suspicious: true, evidence: `Response took ${outcome.elapsedMs}ms vs. a ${baseline.elapsedMs}ms baseline - possible blind command injection delay.` };
        }
        return { ...base, suspicious: false, evidence: 'No command output or timing anomaly detected.' };
      }
      case 'crlf': {
        const injectedHeader = outcome.response.headers.get('x-injected-header');
        if (injectedHeader) {
          return { ...base, suspicious: true, evidence: 'Injected header was reflected in the response - CRLF/header injection confirmed.' };
        }
        return { ...base, suspicious: false, evidence: 'No injected header observed. Note: browsers block reading Set-Cookie and most non-exposed headers, so this check has limited visibility; verify manually via DevTools Network tab or a backend proxy if needed.' };
      }
      case 'openRedirect': {
        try {
          const finalHost = new URL(outcome.response.url).hostname;
          if (finalHost && finalHost.includes('evil-example-redirect-test.invalid')) {
            return { ...base, suspicious: true, evidence: `Request was redirected to an external test domain (${finalHost}) - possible open redirect.` };
          }
        } catch {
          // ignore URL parse issues
        }
        return { ...base, suspicious: false, evidence: 'Final response URL did not point to the injected external domain.' };
      }
      default:
        return { ...base, suspicious: false, evidence: 'No heuristic available for this category.' };
    }
  }

  private extractQueryParamNames(inputUrl: string): string[] {
    try {
      const url = new URL(inputUrl);
      return Array.from(url.searchParams.keys());
    } catch {
      return [];
    }
  }

  private replaceQueryParam(inputUrl: string, paramName: string, payload: string): string {
    try {
      const url = new URL(inputUrl);
      url.searchParams.set(paramName, payload);
      return url.toString();
    } catch {
      return inputUrl;
    }
  }

  // -------------------------------------------------------------------------
  // CORS check
  // -------------------------------------------------------------------------

  async runCorsCheck(inputUrl: string, timeoutMs?: number): Promise<CorsCheckResult> {
    const outcome = await this.fetchWithTimeout(inputUrl, { method: 'GET', mode: 'cors', cache: 'no-store' }, this.normalizeTimeout(timeoutMs));

    if (!outcome.response) {
      return {
        inputUrl,
        reachable: false,
        allowOrigin: null,
        allowCredentials: null,
        allowMethods: null,
        allowHeaders: null,
        wildcardWithCredentials: false,
        severity: 'error',
        summary: 'Request failed - the server may not allow cross-origin requests, or it is unreachable.',
        note: 'Browsers hide most CORS details when a request is blocked; check the browser console/network tab for the exact reason.',
        errorMessage: outcome.error,
        recommendations: [{ level: 'info', message: 'Unable to assess CORS configuration because the request failed. Re-run once the endpoint is reachable, or inspect the browser DevTools Network tab for the exact CORS error.' }],
      };
    }

    const allowOrigin = outcome.response.headers.get('access-control-allow-origin');
    const allowCredentials = outcome.response.headers.get('access-control-allow-credentials');
    const allowMethods = outcome.response.headers.get('access-control-allow-methods');
    const allowHeaders = outcome.response.headers.get('access-control-allow-headers');
    const wildcardWithCredentials = allowOrigin === '*' && allowCredentials?.toLowerCase() === 'true';

    let severity: CheckSeverity = 'success';
    let summary = allowOrigin
      ? `Cross-origin requests are allowed from: ${allowOrigin}.`
      : 'No Access-Control-Allow-Origin header was exposed; the browser likely only allowed this because it was a same-origin or CORS-safelisted request.';

    if (wildcardWithCredentials) {
      severity = 'error';
      summary = 'Server advertises Access-Control-Allow-Origin: * together with Allow-Credentials: true, which is an invalid and insecure CORS configuration.';
    } else if (!allowOrigin) {
      severity = 'warning';
    }

    const recommendations = this.buildCorsRecommendations(allowOrigin, wildcardWithCredentials);

    return {
      inputUrl,
      reachable: true,
      allowOrigin,
      allowCredentials,
      allowMethods,
      allowHeaders,
      wildcardWithCredentials,
      severity,
      summary,
      note: 'Only CORS response headers exposed to JavaScript can be inspected here; some servers only reveal them on a preflight OPTIONS request.',
      errorMessage: null,
      recommendations,
    };
  }

  private buildCorsRecommendations(allowOrigin: string | null, wildcardWithCredentials: boolean): Recommendation[] {
    if (wildcardWithCredentials) {
      return [{ level: 'critical', message: 'Do not combine Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true - this is an invalid and insecure configuration. Specify an explicit allow-list of trusted origins instead.' }];
    }

    if (allowOrigin === '*') {
      return [{ level: 'warning', message: "Access-Control-Allow-Origin is set to '*', allowing any website to read the response. If this API returns sensitive or user-specific data, restrict it to an explicit allow-list of trusted origins." }];
    }

    if (!allowOrigin) {
      return [{ level: 'info', message: 'No CORS headers were exposed for this request. If this API should be callable from browser apps on other domains, explicitly configure Access-Control-Allow-Origin with a trusted origin allow-list; otherwise no action is needed.' }];
    }

    return [{ level: 'info', message: 'CORS is restricted to a specific origin, which is good practice. Confirm the allow-list only contains origins you trust, and avoid reflecting the Origin request header unconditionally.' }];
  }

  // -------------------------------------------------------------------------
  // Security headers check
  // -------------------------------------------------------------------------

  async runSecurityHeadersCheck(inputUrl: string, timeoutMs?: number): Promise<SecurityHeadersResult> {
    const outcome = await this.fetchWithTimeout(inputUrl, { method: 'GET', cache: 'no-store' }, this.normalizeTimeout(timeoutMs));

    if (!outcome.response) {
      return {
        inputUrl,
        status: null,
        headers: [],
        missingCount: SECURITY_HEADER_DEFINITIONS.length,
        severity: 'error',
        summary: 'Request failed - unable to inspect response headers.',
        headersReadable: false,
        errorMessage: outcome.error,
        recommendations: [{ level: 'info', message: 'Unable to inspect security headers because the request failed. Re-run once the endpoint is reachable.' }],
      };
    }

    const headers: SecurityHeaderCheck[] = SECURITY_HEADER_DEFINITIONS.map(def => {
      const value = outcome.response!.headers.get(def.name);
      return {
        name: def.name,
        present: !!value,
        value,
        recommendation: def.recommendation,
        severity: value ? 'ok' : 'missing',
      };
    });

    const missingCount = headers.filter(h => !h.present).length;
    // Response.headers only ever exposes a small safelist for cross-origin requests unless the
    // server opts in via Access-Control-Expose-Headers, so an all-missing result is ambiguous.
    const headersReadable = headers.some(h => h.present) || new URL(inputUrl, location.href).origin === location.origin;

    let severity: CheckSeverity = 'success';
    let summary = `All ${headers.length} recommended security headers are present.`;
    if (!headersReadable) {
      severity = 'warning';
      summary = 'None of the checked headers were readable from the browser. This may be because the server did not expose them cross-origin (Access-Control-Expose-Headers) rather than them being absent; verify with the browser DevTools Network tab for a conclusive result.';
    } else if (missingCount > 0) {
      severity = 'warning';
      summary = `${missingCount} of ${headers.length} recommended security headers appear to be missing.`;
    }

    const recommendations = this.buildSecurityHeaderRecommendations(headers, headersReadable);

    return {
      inputUrl,
      status: outcome.response.status,
      headers,
      missingCount,
      severity,
      summary,
      headersReadable,
      errorMessage: null,
      recommendations,
    };
  }

  private buildSecurityHeaderRecommendations(headers: SecurityHeaderCheck[], headersReadable: boolean): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (!headersReadable) {
      recommendations.push({ level: 'info', message: 'Headers could not be read from the browser, likely because the server did not expose them cross-origin (Access-Control-Expose-Headers). Verify manually via the DevTools Network tab or `curl -I` before relying on this result.' });
      return recommendations;
    }

    for (const header of headers.filter(h => !h.present)) {
      recommendations.push({ level: 'warning', message: `Add the "${header.name}" response header. ${header.recommendation}` });
    }

    if (recommendations.length === 0) {
      recommendations.push({ level: 'info', message: 'All recommended security headers are present. Also review cookie flags (HttpOnly, Secure, SameSite) manually, since they cannot be read via JavaScript.' });
    }

    return recommendations;
  }

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<FetchOutcome> {
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      return { response, elapsedMs: Math.round(performance.now() - start), error: null };
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - start);
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      return {
        response: null,
        elapsedMs,
        error: isAbort ? `Request timed out after ${timeoutMs}ms.` : error instanceof Error ? error.message : String(error),
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private normalizeTimeout(timeoutMs?: number): number {
    if (!timeoutMs || Number.isNaN(timeoutMs)) {
      return 8000;
    }
    return this.clamp(timeoutMs, 1000, 30000);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
  }

  // -------------------------------------------------------------------------
  // Consolidated recommendation checklist
  // -------------------------------------------------------------------------

  /**
   * Combines the recommendations from whichever checks have been run into a single
   * checklist, sorted so the most important fixes (critical, then warning, then info)
   * appear first. Pass `null`/`undefined` for checks that haven't run yet.
   */
  buildRecommendationChecklist(results: {
    loadTest?: LoadTestResult | null;
    injection?: InjectionTestResult | null;
    cors?: CorsCheckResult | null;
    securityHeaders?: SecurityHeadersResult | null;
  }): SourcedRecommendation[] {
    const sourced: SourcedRecommendation[] = [
      ...(results.loadTest?.recommendations ?? []).map(r => ({ ...r, source: 'Rate limit & Load' as const })),
      ...(results.injection?.recommendations ?? []).map(r => ({ ...r, source: 'Injection' as const })),
      ...(results.cors?.recommendations ?? []).map(r => ({ ...r, source: 'CORS' as const })),
      ...(results.securityHeaders?.recommendations ?? []).map(r => ({ ...r, source: 'Security headers' as const })),
    ];

    return sourced.sort((a, b) => RECOMMENDATION_LEVEL_ORDER[a.level] - RECOMMENDATION_LEVEL_ORDER[b.level]);
  }

  // -------------------------------------------------------------------------
  // Markdown export
  // -------------------------------------------------------------------------

  /**
   * Renders every check that has been run (plus the consolidated recommendation
   * checklist) into a single Markdown report, suitable for attaching to a release
   * checklist or sharing with a reviewer.
   */
  buildMarkdownReport(input: {
    url: string;
    loadTest?: LoadTestResult | null;
    injection?: InjectionTestResult | null;
    cors?: CorsCheckResult | null;
    securityHeaders?: SecurityHeadersResult | null;
  }): string {
    const { url, loadTest, injection, cors, securityHeaders } = input;
    const recommendations = this.buildRecommendationChecklist({ loadTest, injection, cors, securityHeaders });

    const sections: string[] = [];
    sections.push(`# URL Checking Report`);
    sections.push(`- **Target URL:** \`${url}\`\n- **Generated:** ${new Date().toISOString()}`);
    sections.push(this.renderRecommendationsMarkdown(recommendations));
    sections.push(this.renderLoadTestMarkdown(loadTest ?? null));
    sections.push(this.renderInjectionMarkdown(injection ?? null));
    sections.push(this.renderCorsMarkdown(cors ?? null));
    sections.push(this.renderSecurityHeadersMarkdown(securityHeaders ?? null));

    return sections.join('\n\n') + '\n';
  }

  private renderRecommendationsMarkdown(recommendations: SourcedRecommendation[]): string {
    const lines = ['## Security Recommendations Checklist'];

    if (recommendations.length === 0) {
      lines.push('_No recommendations yet - run at least one check first._');
      return lines.join('\n');
    }

    const levelLabel: Record<RecommendationLevel, string> = {
      critical: '🔴 Fix before release',
      warning: '🟠 Should fix',
      info: '🔵 Good practice',
    };

    lines.push('| Priority | Source | Recommendation |', '|---|---|---|');
    for (const rec of recommendations) {
      lines.push(`| ${levelLabel[rec.level]} | ${rec.source} | ${this.escapeMarkdownCell(rec.message)} |`);
    }

    return lines.join('\n');
  }

  private renderLoadTestMarkdown(result: LoadTestResult | null): string {
    const lines = ['## Rate Limit & Load Test'];

    if (!result) {
      lines.push('_Not run._');
      return lines.join('\n');
    }

    lines.push(
      `**Summary:** ${result.summary}`,
      '',
      `- Total requests: ${result.totalRequests}, Concurrency: ${result.concurrency}`,
      `- Success (2xx): ${result.successCount}, Rate limited (429): ${result.rateLimitedCount}, Server errors (5xx): ${result.serverErrorCount}, Other 4xx: ${result.clientErrorCount}, Network errors: ${result.networkErrorCount}`,
      `- Throughput: ${result.throughputRps} req/sec`,
      `- Response time (ms): min ${result.responseTime.min} / avg ${result.responseTime.avg} / p50 ${result.responseTime.p50} / p95 ${result.responseTime.p95} / p99 ${result.responseTime.p99} / max ${result.responseTime.max}`,
    );

    if (result.rateLimitEvidence.length) {
      lines.push('', '**Rate limit evidence:**');
      result.rateLimitEvidence.forEach(e => lines.push(`- ${e}`));
    }

    lines.push(...this.renderRecommendationListMarkdown(result.recommendations));

    return lines.join('\n');
  }

  private renderInjectionMarkdown(result: InjectionTestResult | null): string {
    const lines = ['## Injection Test'];

    if (!result) {
      lines.push('_Not run._');
      return lines.join('\n');
    }

    lines.push(`**Summary:** ${result.summary}`);

    if (result.findings.length) {
      lines.push('', '| Category | Target | Payload | Status | Elapsed | Evidence |', '|---|---|---|---|---|---|');
      for (const finding of result.findings) {
        const marker = finding.suspicious ? '⚠️ ' : '';
        lines.push(
          `| ${finding.category} | ${this.escapeMarkdownCell(finding.target)} | ${this.escapeMarkdownCell(finding.payload)} | ${finding.status ?? '—'} | ${finding.elapsedMs}ms | ${marker}${this.escapeMarkdownCell(finding.evidence)} |`,
        );
      }
    }

    lines.push(...this.renderRecommendationListMarkdown(result.recommendations));

    return lines.join('\n');
  }

  private renderCorsMarkdown(result: CorsCheckResult | null): string {
    const lines = ['## CORS Check'];

    if (!result) {
      lines.push('_Not run._');
      return lines.join('\n');
    }

    lines.push(
      `**Summary:** ${result.summary}`,
      '',
      `- Access-Control-Allow-Origin: \`${result.allowOrigin ?? 'not exposed'}\``,
      `- Access-Control-Allow-Credentials: \`${result.allowCredentials ?? 'not exposed'}\``,
      `- Access-Control-Allow-Methods: \`${result.allowMethods ?? 'not exposed'}\``,
      `- Access-Control-Allow-Headers: \`${result.allowHeaders ?? 'not exposed'}\``,
    );

    lines.push(...this.renderRecommendationListMarkdown(result.recommendations));

    return lines.join('\n');
  }

  private renderSecurityHeadersMarkdown(result: SecurityHeadersResult | null): string {
    const lines = ['## Security Headers Check'];

    if (!result) {
      lines.push('_Not run._');
      return lines.join('\n');
    }

    lines.push(`**Summary:** ${result.summary}`);

    if (result.headers.length) {
      lines.push('', '| Header | Value | Recommendation |', '|---|---|---|');
      for (const header of result.headers) {
        lines.push(`| \`${header.name}\` | ${header.value ? `\`${this.escapeMarkdownCell(header.value)}\`` : 'missing'} | ${this.escapeMarkdownCell(header.recommendation)} |`);
      }
    }

    lines.push(...this.renderRecommendationListMarkdown(result.recommendations));

    return lines.join('\n');
  }

  private renderRecommendationListMarkdown(recommendations: Recommendation[]): string[] {
    if (recommendations.length === 0) {
      return [];
    }

    const levelLabel: Record<RecommendationLevel, string> = { critical: '🔴', warning: '🟠', info: '🔵' };
    const lines = ['', '**Recommendations:**'];
    recommendations.forEach(rec => lines.push(`- ${levelLabel[rec.level]} ${rec.message}`));
    return lines;
  }

  private escapeMarkdownCell(value: string): string {
    return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  }
}
