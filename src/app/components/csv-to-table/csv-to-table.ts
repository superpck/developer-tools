import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

@Component({
  selector: 'app-csv-to-table',
  imports: [FormsModule],
  templateUrl: './csv-to-table.html',
  styleUrl: './csv-to-table.css',
})
export class CsvToTable {
  inputText = signal('');
  delimiter = signal(',');

  parsed = computed<ParsedCsv | null>(() => {
    const text = this.inputText().trim();
    if (!text) return null;

    const sep = this.delimiter() || ',';
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) return null;

    const parse = (line: string) => {
      const cells: string[] = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuote = !inQuote;
        } else if (ch === sep && !inQuote) {
          cells.push(cur); cur = '';
        } else {
          cur += ch;
        }
      }
      cells.push(cur);
      return cells;
    };

    const [headerLine, ...dataLines] = lines;
    return {
      headers: parse(headerLine),
      rows: dataLines.map(parse),
    };
  });

  copyAsMarkdown() {
    const data = this.parsed();
    if (!data) return;
    const sep = ' | ';
    const header = '| ' + data.headers.join(sep) + ' |';
    const divider = '| ' + data.headers.map(() => '---').join(sep) + ' |';
    const rows = data.rows.map((r) => '| ' + r.join(sep) + ' |');
    navigator.clipboard.writeText([header, divider, ...rows].join('\n'));
  }
}
