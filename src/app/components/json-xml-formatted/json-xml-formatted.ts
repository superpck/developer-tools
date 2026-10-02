import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type FormatType = 'json' | 'xml' | 'html' | 'url_params' | 'sql';

const FORMAT_LABELS: Record<FormatType, string> = {
  json: 'JSON',
  xml: 'XML',
  html: 'HTML',
  url_params: 'URL Params',
  sql: 'SQL',
};

const SQL_TOP_LEVEL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
  'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE FROM', 'UNION', 'UNION ALL',
]);

const SQL_JOIN_KEYWORDS = new Set([
  'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
  'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
]);

const SQL_CONDITION_KEYWORDS = new Set(['AND', 'OR']);

const SQL_MULTI_WORD_KEYWORDS = [
  'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
  'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
  'GROUP BY', 'ORDER BY', 'UNION ALL', 'INSERT INTO', 'DELETE FROM',
];

const SQL_INLINE_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE',
  'BETWEEN', 'EXISTS', 'AS', 'ON', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL',
  'OUTER', 'CROSS', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'UNION', 'ALL',
  'DISTINCT', 'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'DEFAULT', 'CREATE', 'TABLE',
  'ALTER', 'DROP', 'INDEX', 'VIEW', 'WITH',
]);

@Component({
  selector: 'app-json-xml-formatted',
  imports: [FormsModule],
  templateUrl: './json-xml-formatted.html',
  styleUrl: './json-xml-formatted.css',
})
export class JsonXmlFormatted {
  selectedType = signal<FormatType>('json');
  inputText = signal<string>('');

  readonly formats: FormatType[] = ['json', 'xml', 'html', 'url_params', 'sql'];
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
      } else if (type === 'sql') {
        return this.formatSql(text);
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

  private formatSql(sql: string): string {
    const trimmed = sql.trim();
    if (!trimmed) throw new Error('Empty input');

    const tokens = this.mergeSqlKeywords(this.tokenizeSql(trimmed));

    const lines: string[] = [];
    let currentLine = '';
    let indent = 0;
    let parenDepth = 0;
    let extraIndent = 0;
    let betweenPending = false;

    const flush = () => {
      if (currentLine.length) {
        lines.push('  '.repeat(indent + extraIndent) + currentLine);
        currentLine = '';
      }
      extraIndent = 0;
    };

    const append = (text: string, forceNoSpace = false) => {
      const noSpace = !currentLine.length || forceNoSpace || currentLine.endsWith('(');
      currentLine += noSpace ? text : ' ' + text;
    };

    tokens.forEach((tok, i) => {
      const token = tok.text;
      const upper = token.toUpperCase();
      const isLiteral = /^['"`]/.test(token);

      if (!isLiteral && SQL_TOP_LEVEL_KEYWORDS.has(upper)) {
        flush();
        indent = Math.max(parenDepth, 0);
        append(upper);
        return;
      }

      if (!isLiteral && SQL_JOIN_KEYWORDS.has(upper)) {
        flush();
        indent = Math.max(parenDepth, 0);
        append(upper);
        return;
      }

      if (!isLiteral && SQL_CONDITION_KEYWORDS.has(upper)) {
        if (upper === 'AND' && betweenPending) {
          betweenPending = false;
          append(upper);
          return;
        }
        flush();
        append(upper);
        extraIndent = 1;
        return;
      }

      if (token === '(') {
        const prev = tokens[i - 1];
        // Preserve the author's original spacing: tight for function calls, e.g. COUNT(x).
        const noSpace = currentLine.length > 0 && !!prev && prev.end === tok.start;
        append('(', noSpace);
        parenDepth++;
        if (tokens[i + 1]?.text.toUpperCase() === 'SELECT') {
          flush();
        }
        return;
      }

      if (token === ')') {
        parenDepth = Math.max(parenDepth - 1, 0);
        if (!currentLine.length) {
          indent = Math.max(parenDepth, 0);
        }
        append(')', true);
        return;
      }

      if (token === ',' || token === ';') {
        append(token, true);
        if (token === ';' || parenDepth === 0) {
          flush();
          if (token === ',') extraIndent = 1;
        }
        return;
      }

      if (!isLiteral && upper === 'BETWEEN') {
        betweenPending = true;
      }

      append(!isLiteral && SQL_INLINE_KEYWORDS.has(upper) ? upper : token);
    });

    flush();
    return lines.join('\n');
  }

  private tokenizeSql(sql: string): { text: string; start: number; end: number }[] {
    const regex = /'[^']*'|"[^"]*"|`[^`]*`|--[^\n]*|\/\*[\s\S]*?\*\/|\(|\)|,|;|[^\s,();]+/g;
    const tokens: { text: string; start: number; end: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sql))) {
      tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
    }
    return tokens;
  }

  private mergeSqlKeywords(
    tokens: { text: string; start: number; end: number }[]
  ): { text: string; start: number; end: number }[] {
    const result: { text: string; start: number; end: number }[] = [];
    let i = 0;
    while (i < tokens.length) {
      const twoWord = tokens.slice(i, i + 2).map((t) => t.text).join(' ').toUpperCase();
      const threeWord = tokens.slice(i, i + 3).map((t) => t.text).join(' ').toUpperCase();
      if (SQL_MULTI_WORD_KEYWORDS.includes(threeWord)) {
        result.push({ text: threeWord, start: tokens[i].start, end: tokens[i + 2].end });
        i += 3;
      } else if (SQL_MULTI_WORD_KEYWORDS.includes(twoWord)) {
        result.push({ text: twoWord, start: tokens[i].start, end: tokens[i + 1].end });
        i += 2;
      } else {
        result.push(tokens[i]);
        i += 1;
      }
    }
    return result;
  }
}

