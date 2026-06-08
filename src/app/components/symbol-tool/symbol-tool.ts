import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SymbolCategory {
  name: string;
  symbols: string[];
}

@Component({
  selector: 'app-symbol-tool',
  imports: [CommonModule],
  templateUrl: './symbol-tool.html',
  styleUrls: ['./symbol-tool.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SymbolTool implements OnInit {
  categories: SymbolCategory[] = [
    {
      name: 'Checks & Crosses',
      symbols: ['✅', '❌', '❎', '✔️', '✖️', '✗', '✘', '☑️']
    },
    {
      name: 'Dev & Tech',
      symbols: ['🧑🏻‍💻', '👨🏻‍💻', '👩🏻‍💻', '💻', '📱', '⚙️', '🛠️', '🚀', '💡', '🐛', '🎯', '💾', '🔌', '🔋']
    },
    {
      name: 'Status & Alerts',
      symbols: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '⚠️', '❗', '❓', '🛑', '🔔', '📢']
    },
    {
      name: 'Arrows',
      symbols: ['←', '↑', '→', '↓', '↔', '↕', '🔄', '➔', '➜', '➡️', '⬅️', '⬆️', '⬇️', '▶', '◀']
    },
    {
      name: 'Math, Punctuation & Currency',
      symbols: ['×', '÷', '±', '≈', '≠', '≤', '≥', '∞', 'π', '©', '®', '™', '€', '£', '¥', '฿']
    },
    {
      name: 'Objects & UI',
      symbols: ['🔍', '🗑️', '✏️', '📝', '📅', '📎', '📌', '🔒', '🔓', '🔑', '📁', '📂', '💬', '📧']
    },
    {
      name: 'Stars & Bullets',
      symbols: ['•', '◦', '‣', '⁃', '❖', '⭐', '★', '🌟', '✨', '💯', '🔥', '💥']
    },
  ];

  symbolCharacters = [
    { name: "Symbol", range: [0x2600, 0x26FF], characters: [] },
    { name: "Dingbats", range: [0x2700, 0x27BF], characters: [] },
    { name: "Arrows", range: [0x2190, 0x21FF], characters: [] },
    { name: "Mathematical Operators", range: [0x2200, 0x22FF], characters: [] },
    { name: "Miscellaneous Technical", range: [0x2300, 0x23FF], characters: [] },
    {
      name: 'Emoji: Medical',
      range: [
        0x1F3E5, 0x1F691, 0x1F489, 0x1FA78, 0x1F48A, 0x1FA7C, 0x1FA7A, 0x1FA79,
        0x1FA7B, 0x1F6CF, 0x1F6AC, 0x1F9AF, 0x1F9EC, 0x1F52C, 0x1F9EA, 0x1F637,
        0x1F92E, 0x1F912, 0x1F975
      ],
      characters: [] as { symbol: string; code: string }[]
    },
    { name: "Emoji: Emoticons", range: [0x1F600, 0x1F64F], characters: [] },
    { name: "Emoji: Miscellaneous Symbols and Pictographs", range: [0x1F300, 0x1F5FF], characters: [] },
    { name: "Emoji: Office", range: [0x1F4BC, 0x1F5BC], characters: [] },
    { name: "Emoji: Sports", range: [0x1F3C0, 0x1F3DF], characters: [] },
    { name: "Emoji: Places", range: [0x1F3E0, 0x1F3FF], characters: [] },
  ];

  activeTab = signal<string | null>(null);

  copiedSymbol = signal<string | null>(null);

  async ngOnInit() {
    // อักษรสำหรับ HTML
    this.symbolCharacters.forEach(category => {
      if (category.range.length == 2) {
        const [start, end] = category.range;
        for (let code = start; code <= end; code++) {
          category.characters.push({
            symbol: String.fromCodePoint(code),
            code: code.toString(16).toUpperCase().padStart(4, '0')
          });
        }
      } else {
        const codePoints = category.range as number[];
        codePoints.forEach(code => {
          category.characters.push({
            symbol: String.fromCodePoint(code),
            code: code.toString(16).toUpperCase().padStart(4, '0')
          });
        });
      }
    });
  }

  copyToClipboard(sym: string) {
    navigator.clipboard.writeText(sym).then(() => {
      this.copiedSymbol.set(sym);
      setTimeout(() => {
        // Only clear if the current symbol is still the one we just copied
        if (this.copiedSymbol() === sym) {
          this.copiedSymbol.set(null);
        }
      }, 2000);
    });
  }
}