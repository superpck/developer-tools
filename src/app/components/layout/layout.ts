import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import Config from '../../configs/config';

interface ToolLink {
  path: string;
  label: string;
  activeClass: string;
}

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class Layout {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);

  config = Config;
  readonly currentYear = new Date().getFullYear();

  readonly toolLinks: ReadonlyArray<ToolLink> = [
    { path: '/request', label: 'API Calling', activeClass: 'bg-indigo-50 text-indigo-700' },
    { path: '/crypto', label: 'Crypto Tool', activeClass: 'bg-violet-50 text-violet-700' },
    { path: '/jwt', label: 'JWT Tool', activeClass: 'bg-rose-50 text-rose-700' },
    { path: '/network', label: 'Network: URL Diagnostics', activeClass: 'bg-emerald-50 text-emerald-700' },
    { path: '/subnet', label: 'Network: Subnet Calculator', activeClass: 'bg-cyan-50 text-cyan-700' },
    { path: '/json-xml-formatted', label: 'Text: Formatters', activeClass: 'bg-fuchsia-50 text-fuchsia-700' },
    { path: '/csv-table', label: 'Text: CSV to Table', activeClass: 'bg-teal-50 text-teal-700' },
    { path: '/markdown', label: 'Text: Markdown viewer', activeClass: 'bg-sky-50 text-sky-700' },
    { path: '/symbols', label: 'ICON: Symbols', activeClass: 'bg-amber-50 text-amber-700' },
  ];

  readonly menuOpen = signal(false);
  private readonly currentUrl = signal(this.router.url);

  readonly activeLabel = computed(() => {
    const url = this.currentUrl();
    return this.toolLinks.find(link => url.startsWith(link.path))?.label ?? 'Tools';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
        this.closeMenu();
      });
  }

  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }
}

