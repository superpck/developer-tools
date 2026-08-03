import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-markdown-viewer',
  imports: [FormsModule],
  templateUrl: './markdown-viewer.html',
  styleUrl: './markdown-viewer.css',
})
export class MarkdownViewer {
  inputText = signal('');

  renderedHtml = computed(() => this.parse(this.inputText()));

  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private inlineFormat(text: string): string {
    return text
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '<img alt="$1" src="$2" class="md-img" />')
      .replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>');
  }

  private parse(md: string): string {
    if (!md.trim()) return '';
    const lines = md.split(/\r?\n/);
    const html: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const raw = lines[i];

      // Fenced code block
      if (raw.startsWith('```')) {
        const lang = raw.slice(3).trim();
        const code: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          code.push(this.escape(lines[i]));
          i++;
        }
        html.push(`<pre class="md-pre"><code${lang ? ` class="language-${lang}"` : ''}>${code.join('\n')}</code></pre>`);
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(---+|\*\*\*+|___+)\s*$/.test(raw)) {
        html.push('<hr class="md-hr" />');
        i++; continue;
      }

      // Headings
      const hMatch = raw.match(/^(#{1,6})\s+(.+)/);
      if (hMatch) {
        const level = hMatch[1].length;
        html.push(`<h${level} class="md-h${level}">${this.inlineFormat(this.escape(hMatch[2]))}</h${level}>`);
        i++; continue;
      }

      // Blockquote
      if (raw.startsWith('> ')) {
        const lines2: string[] = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          lines2.push(lines[i].slice(2));
          i++;
        }
        html.push(`<blockquote class="md-blockquote">${this.inlineFormat(this.escape(lines2.join(' ')))}</blockquote>`);
        continue;
      }

      // Unordered list
      if (/^[\-\*\+] /.test(raw)) {
        const items: string[] = [];
        while (i < lines.length && /^[\-\*\+] /.test(lines[i])) {
          items.push(`<li>${this.inlineFormat(this.escape(lines[i].slice(2)))}</li>`);
          i++;
        }
        html.push(`<ul class="md-ul">${items.join('')}</ul>`);
        continue;
      }

      // Ordered list
      if (/^\d+\.\s/.test(raw)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          items.push(`<li>${this.inlineFormat(this.escape(lines[i].replace(/^\d+\.\s/, '')))}</li>`);
          i++;
        }
        html.push(`<ol class="md-ol">${items.join('')}</ol>`);
        continue;
      }

      // Blank line → paragraph break
      if (raw.trim() === '') {
        i++; continue;
      }

      // Paragraph — collect consecutive non-empty, non-special lines
      const para: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('```') &&
        !lines[i].startsWith('> ') &&
        !/^[\-\*\+] /.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i]) &&
        !/^(---+|\*\*\*+|___+)\s*$/.test(lines[i])
      ) {
        para.push(lines[i]);
        i++;
      }
      if (para.length) {
        html.push(`<p class="md-p">${this.inlineFormat(this.escape(para.join(' ')))}</p>`);
      }
    }

    return html.join('\n');
  }
}
