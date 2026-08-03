import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type FormatType = 'json' | 'xml' | 'html' | 'url_params';

const FORMAT_LABELS: Record<FormatType, string> = {
  json: 'JSON',
  xml: 'XML',
  html: 'HTML',
  url_params: 'URL Params',
};

@Component({
  selector: 'app-json-xml-formatted',
  imports: [FormsModule],
  templateUrl: './json-xml-formatted.html',
  styleUrl: './json-xml-formatted.css',
})
export class JsonXmlFormatted {
  selectedType = signal<FormatType>('json');
  inputText = signal<string>('');

  readonly formats: FormatType[] = ['json', 'xml', 'html', 'url_params'];
  readonly formatLabels = FORMAT_LABELS;
  
  formattedText = computed(() => {
    const text = this.inputText();
    const type = this.selectedType();
    
    if (!text || text.trim() === '') {
      return '';
    }
    
    try {
      if (type === 'json') {
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed, null, 2);
      } else if (type === 'xml') {
        return this.formatXml(text);
      } else if (type === 'html') {
        return this.formatHtml(text);
      } else if (type === 'url_params') {
        return this.formatUrlParams(text);
      }
    } catch (e: any) {
      return `Error formatting ${FORMAT_LABELS[type]}:\n${e.message}`;
    }
    
    return '';
  });

  private formatHtml(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return this.serializeNode(doc.body || doc.documentElement, 0).trim();
  }

  private serializeNode(node: Node, depth: number): string {
    const indent = '  '.repeat(depth);
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').trim();
      return text ? `${indent}${text}\n` : '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const attrs = Array.from(el.attributes)
      .map((a) => ` ${a.name}="${a.value}"`)
      .join('');
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes)
      .map((c) => this.serializeNode(c, depth + 1))
      .join('');
    if (!children.trim()) return `${indent}<${tag}${attrs}></${tag}>\n`;
    return `${indent}<${tag}${attrs}>\n${children}${indent}</${tag}>\n`;
  }

  private formatUrlParams(input: string): string {
    // Accept full URL or just a query string
    const qs = input.includes('?') ? input.split('?').slice(1).join('?') : input;
    const params = new URLSearchParams(qs);
    const lines: string[] = [];
    params.forEach((value, key) => lines.push(`${key} = ${decodeURIComponent(value)}`));
    if (lines.length === 0) throw new Error('No parameters found');
    return lines.join('\n');
  }

  private formatXml(xml: string) {
    let formatted = '';
    let indent = '';
    const tab = '  ';
    
    xml.split(/>\s*</).forEach(function(node) {
        if (node.match( /^\/\w/ )) {
            indent = indent.substring(tab.length);
        }
        
        formatted += indent + '<' + node + '>\r\n';
        
        if (node.match( /^<?\w[^>]*[^\/]$/ )) {
            indent += tab;
        }
    });
    
    return formatted.substring(1, formatted.length-3);
  }
  
  copyToClipboard() {
    const text = this.formattedText();
    if (text) {
      navigator.clipboard.writeText(text);
    }
  }
}
