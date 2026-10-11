import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CorsCheckResult,
  InjectionCategory,
  InjectionTestResult,
  LoadTestResult,
  MAX_LOAD_TEST_CONCURRENCY,
  MAX_LOAD_TEST_REQUESTS,
  RecommendationLevel,
  SecurityHeadersResult,
  UrlCheckingService,
} from '../../services/url-checking.service';

type CheckTab = 'loadTest' | 'injection' | 'cors' | 'securityHeaders';

interface InjectionCategoryOption {
  value: InjectionCategory;
  label: string;
}

@Component({
  selector: 'app-url-checking',
  imports: [CommonModule, FormsModule],
  templateUrl: './url-checking.html',
  styleUrl: './url-checking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrlChecking {
  private readonly urlCheckingService = inject(UrlCheckingService);

  readonly maxRequests = MAX_LOAD_TEST_REQUESTS;
  readonly maxConcurrency = MAX_LOAD_TEST_CONCURRENCY;

  readonly injectionCategoryOptions: InjectionCategoryOption[] = [
    { value: 'xss', label: 'XSS (reflected script)' },
    { value: 'sqli', label: 'SQL Injection' },
    { value: 'pathTraversal', label: 'Path Traversal' },
    { value: 'commandInjection', label: 'Command Injection' },
    { value: 'crlf', label: 'CRLF / Header Injection' },
    { value: 'openRedirect', label: 'Open Redirect' },
  ];

  readonly url = signal('');
  readonly activeTab = signal<CheckTab>('loadTest');
  readonly errorMessage = signal<string | null>(null);

  // Load test / rate limit options
  readonly totalRequests = signal(20);
  readonly concurrency = signal(5);

  // Injection options
  readonly selectedCategories = signal<InjectionCategory[]>(this.injectionCategoryOptions.map(o => o.value));
  readonly placeholderToken = '{{payload}}';

  readonly runningLoadTest = signal(false);
  readonly runningInjection = signal(false);
  readonly runningCors = signal(false);
  readonly runningSecurityHeaders = signal(false);
  readonly runningAll = computed(() => this.runningLoadTest() || this.runningInjection() || this.runningCors() || this.runningSecurityHeaders());

  readonly loadTestResult = signal<LoadTestResult | null>(null);
  readonly injectionResult = signal<InjectionTestResult | null>(null);
  readonly corsResult = signal<CorsCheckResult | null>(null);
  readonly securityHeadersResult = signal<SecurityHeadersResult | null>(null);

  readonly usesPlaceholder = computed(() => this.url().includes(this.placeholderToken));

  readonly recommendationChecklist = computed(() =>
    this.urlCheckingService.buildRecommendationChecklist({
      loadTest: this.loadTestResult(),
      injection: this.injectionResult(),
      cors: this.corsResult(),
      securityHeaders: this.securityHeadersResult(),
    }),
  );

  readonly recommendationCounts = computed(() => {
    const list = this.recommendationChecklist();
    return {
      critical: list.filter(r => r.level === 'critical').length,
      warning: list.filter(r => r.level === 'warning').length,
      info: list.filter(r => r.level === 'info').length,
    };
  });

  readonly hasAnyResult = computed(
    () => !!(this.loadTestResult() || this.injectionResult() || this.corsResult() || this.securityHeadersResult()),
  );

  toggleCategory(category: InjectionCategory) {
    this.selectedCategories.update(categories =>
      categories.includes(category) ? categories.filter(c => c !== category) : [...categories, category],
    );
  }

  setTab(tab: CheckTab) {
    this.activeTab.set(tab);
  }

  private readTargetUrl(): string | null {
    const value = this.url().trim();
    if (!value) {
      this.errorMessage.set('Enter a URL to test.');
      return null;
    }

    try {
      // A placeholder token like {{payload}} is not a valid URL on its own, so validate
      // against a version with the token stripped out instead.
      new URL(value.split(this.placeholderToken).join(''));
    } catch {
      this.errorMessage.set('Enter a valid absolute URL (e.g. https://api.example.com/items?id=1).');
      return null;
    }

    this.errorMessage.set(null);
    return value;
  }

  async runLoadTest() {
    const url = this.readTargetUrl();
    if (!url) {
      return;
    }

    this.runningLoadTest.set(true);
    try {
      const result = await this.urlCheckingService.runLoadTest(url, {
        totalRequests: this.totalRequests(),
        concurrency: this.concurrency(),
      });
      this.loadTestResult.set(result);
    } finally {
      this.runningLoadTest.set(false);
    }
  }

  async runInjectionTest() {
    const url = this.readTargetUrl();
    if (!url) {
      return;
    }

    if (this.selectedCategories().length === 0) {
      this.errorMessage.set('Select at least one injection category to test.');
      return;
    }

    this.runningInjection.set(true);
    try {
      const result = await this.urlCheckingService.runInjectionTest(url, this.selectedCategories(), {
        placeholderToken: this.placeholderToken,
      });
      this.injectionResult.set(result);
    } finally {
      this.runningInjection.set(false);
    }
  }

  async runCorsCheck() {
    const url = this.readTargetUrl();
    if (!url) {
      return;
    }

    this.runningCors.set(true);
    try {
      const result = await this.urlCheckingService.runCorsCheck(url);
      this.corsResult.set(result);
    } finally {
      this.runningCors.set(false);
    }
  }

  async runSecurityHeadersCheck() {
    const url = this.readTargetUrl();
    if (!url) {
      return;
    }

    this.runningSecurityHeaders.set(true);
    try {
      const result = await this.urlCheckingService.runSecurityHeadersCheck(url);
      this.securityHeadersResult.set(result);
    } finally {
      this.runningSecurityHeaders.set(false);
    }
  }

  async runAllChecks() {
    const url = this.readTargetUrl();
    if (!url) {
      return;
    }

    // Run sequentially (not in parallel) so the checks don't contend with each other
    // and so the burst load test isn't skewed by concurrent unrelated requests.
    await this.runLoadTest();
    await this.runInjectionTest();
    await this.runCorsCheck();
    await this.runSecurityHeadersCheck();
  }

  exportMarkdown() {
    if (!this.hasAnyResult()) {
      this.errorMessage.set('Run at least one check before exporting a report.');
      return;
    }

    const url = this.url().trim();
    const markdown = this.urlCheckingService.buildMarkdownReport({
      url,
      loadTest: this.loadTestResult(),
      injection: this.injectionResult(),
      cors: this.corsResult(),
      securityHeaders: this.securityHeadersResult(),
    });

    this.downloadFile(markdown, this.buildReportFileName(url));
  }

  private downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  private buildReportFileName(url: string): string {
    const plainUrl = url.split(this.placeholderToken).join('');
    const host = (() => {
      try {
        return new URL(plainUrl).hostname.replace(/[^a-z0-9.-]/gi, '-');
      } catch {
        return 'url-checking';
      }
    })();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `url-checking-${host}-${timestamp}.md`;
  }

  severityBadgeClass(severity: string | undefined): string {
    switch (severity) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'error':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-600';
    }
  }

  recommendationBadgeClass(level: RecommendationLevel): string {
    switch (level) {
      case 'critical':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      default:
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }
  }

  recommendationLabel(level: RecommendationLevel): string {
    switch (level) {
      case 'critical':
        return 'Fix before release';
      case 'warning':
        return 'Should fix';
      default:
        return 'Good practice';
    }
  }
}
