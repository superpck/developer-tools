import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SymbolCategory {
  name: string;
  symbols: string[];
}

@Component({
  selector: 'app-symbol-tool',
  imports: [CommonModule],
  templateUrl: './symbol-tool.html',
  styleUrl: './symbol-tool.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SymbolTool {
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

  copiedSymbol = signal<string | null>(null);

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