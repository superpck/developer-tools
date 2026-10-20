import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as CryptoJS from 'crypto-js';
import {
  CheckDigitResult,
  Mod10Variant,
  Mod11Variant,
  Mod97Variant,
  Mod103CodeSet,
  ModAction,
  ModOutputFormat,
  Rem10Handling,
  processMod10,
  processMod11,
  processMod97,
  processMod7,
  processMod23,
  processMod43,
  processMod47,
  processMod103,
  processVerhoeff,
  processDamm
} from './mod-algorithms';

export type HashOperation = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512';
export type EncryptOperation = 'Base64Encode' | 'Base64Decode' | 'AESEncrypt' | 'AESDecrypt';
export type ModOperation =
  | 'MOD10'
  | 'MOD11'
  | 'MOD97'
  | 'MOD7'
  | 'MOD23'
  | 'MOD43'
  | 'MOD47'
  | 'MOD103'
  | 'Verhoeff'
  | 'Damm';

export type Operation = HashOperation | EncryptOperation | ModOperation;

@Component({
  selector: 'app-crypto-tool',
  imports: [CommonModule, FormsModule],
  templateUrl: './crypto-tool.html',
  styleUrl: './crypto-tool.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CryptoTool {
  readonly inputText = signal('');
  readonly secretKey = signal('');
  readonly selectedOp = signal<Operation>('MD5');

  // MOD Options
  readonly modAction = signal<ModAction>('generate');
  readonly modOutputFormat = signal<ModOutputFormat>('detailed');
  readonly mod10Variant = signal<Mod10Variant>('luhn');
  readonly mod11Variant = signal<Mod11Variant>('bank_bill_payment');
  readonly mod11Rem10 = signal<Rem10Handling>('0');
  readonly mod97Variant = signal<Mod97Variant>('iso7064');
  readonly mod103CodeSet = signal<Mod103CodeSet>('B');
  readonly customWeights = signal<string>('2,3,4,5,6,7');
  readonly cleanInput = signal<boolean>(true);

  // Copy state
  readonly copied = signal(false);

  readonly oneWayOps: readonly Operation[] = ['MD5', 'SHA1', 'SHA256', 'SHA512'];
  readonly twoWayOps: readonly Operation[] = ['Base64Encode', 'Base64Decode', 'AESEncrypt', 'AESDecrypt'];
  readonly modOps: readonly ModOperation[] = [
    'MOD10',
    'MOD11',
    'MOD97',
    'MOD7',
    'MOD23',
    'MOD43',
    'MOD47',
    'MOD103',
    'Verhoeff',
    'Damm',
  ];

  readonly opDisplayLabels: Record<ModOperation, string> = {
    MOD10: 'MOD 10 (Luhn / EAN / Barcode)',
    MOD11: 'MOD 11 (Bank Ref / Bill Payment / Thai ID)',
    MOD97: 'MOD 97-10 (IBAN / ISO 7064)',
    MOD7: 'MOD 7 (FedEx / DHL / Logistics)',
    MOD23: 'MOD 23 (Spanish DNI)',
    MOD43: 'MOD 43 (Code 39 Barcode)',
    MOD47: 'MOD 47 (Code 93 Barcode)',
    MOD103: 'MOD 103 (Code 128 Barcode)',
    Verhoeff: 'Verhoeff (Dihedral D5 - Aadhaar)',
    Damm: 'Damm (Quasigroup Table)',
  };

  readonly isModOperation = computed(() => {
    return this.modOps.includes(this.selectedOp() as ModOperation);
  });

  readonly resultText = computed(() => {
    const rawText = this.inputText();
    const op = this.selectedOp();
    const key = this.secretKey();

    if (!rawText.trim()) return '';

    try {
      // 1. One-Way Hash
      switch (op) {
        case 'MD5': return CryptoJS.MD5(rawText).toString();
        case 'SHA1': return CryptoJS.SHA1(rawText).toString();
        case 'SHA256': return CryptoJS.SHA256(rawText).toString();
        case 'SHA512': return CryptoJS.SHA512(rawText).toString();

        // 2. Two-Way
        case 'Base64Encode': return btoa(unescape(encodeURIComponent(rawText)));
        case 'Base64Decode': return decodeURIComponent(escape(atob(rawText)));

        case 'AESEncrypt':
          if (!key) return 'Please provide a Secret Key for AES encryption.';
          return CryptoJS.AES.encrypt(rawText, key).toString();

        case 'AESDecrypt':
          if (!key) return 'Please provide a Secret Key for AES decryption.';
          const bytes = CryptoJS.AES.decrypt(rawText, key);
          return bytes.toString(CryptoJS.enc.Utf8) || 'Decryption failed (Invalid Secret Key or Data).';

        default:
          break;
      }

      // 3. Check Digit / MOD Operations
      if (this.isModOperation()) {
        return this.calculateModResult(rawText, op as ModOperation);
      }

      return '';
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Operation failed.';
      return `Error: ${message}`;
    }
  });

  private calculateModResult(text: string, op: ModOperation): string {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const action = this.modAction();
    const format = this.modOutputFormat();
    const shouldClean = this.cleanInput();

    if (lines.length === 0) return '';

    if (lines.length === 1) {
      const inputLine = shouldClean ? lines[0].trim().replace(/[\s-]/g, '') : lines[0].trim();
      const res = this.runSingleMod(inputLine, op, action);
      return this.formatSingleResult(res, format);
    }

    // Multi-line batch processing
    const results: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const cleanedLine = shouldClean ? rawLine.trim().replace(/[\s-]/g, '') : rawLine.trim();
      try {
        const res = this.runSingleMod(cleanedLine, op, action);
        if (format === 'checkDigitOnly') {
          results.push(action === 'validate' ? (res.isValid ? 'VALID' : 'INVALID') : res.checkDigit);
        } else if (format === 'appended') {
          results.push(res.fullString);
        } else {
          // Compact multi-line summary
          if (action === 'validate') {
            results.push(`[${i + 1}] ${res.input} -> ${res.isValid ? 'VALID' : 'INVALID'} (Actual: ${res.checkDigit}, Expected: ${res.expectedCheckDigit})`);
          } else {
            results.push(`[${i + 1}] ${res.payload} -> Check Digit: ${res.checkDigit} -> ${res.fullString}`);
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Invalid';
        results.push(`[${i + 1}] ${rawLine} -> Error: ${errMsg}`);
      }
    }
    return results.join('\n');
  }

  private runSingleMod(input: string, op: ModOperation, action: ModAction): CheckDigitResult {
    switch (op) {
      case 'MOD10':
        return processMod10(input, this.mod10Variant(), action, this.customWeights());
      case 'MOD11':
        return processMod11(input, this.mod11Variant(), this.mod11Rem10(), action, this.customWeights());
      case 'MOD97':
        return processMod97(input, this.mod97Variant(), action);
      case 'MOD7':
        return processMod7(input, action);
      case 'MOD23':
        return processMod23(input, action);
      case 'MOD43':
        return processMod43(input, action);
      case 'MOD47':
        return processMod47(input, action);
      case 'MOD103':
        return processMod103(input, this.mod103CodeSet(), action);
      case 'Verhoeff':
        return processVerhoeff(input, action);
      case 'Damm':
        return processDamm(input, action);
      default:
        throw new Error(`Unsupported MOD operation: ${op}`);
    }
  }

  private formatSingleResult(res: CheckDigitResult, format: ModOutputFormat): string {
    if (format === 'checkDigitOnly') {
      return res.action === 'validate' ? (res.isValid ? 'VALID' : 'INVALID') : res.checkDigit;
    }

    if (format === 'appended') {
      return res.fullString;
    }

    // Detailed format
    const lines: string[] = [
      `Algorithm:       ${res.algorithm}`,
      `Action:          ${res.action === 'generate' ? 'Generate Check Digit' : 'Validate Check Digit'}`,
      `Input:           ${res.input}`,
      `Payload:         ${res.payload}`,
      `Check Digit:     ${res.checkDigit}`,
      `Complete String: ${res.fullString}`,
    ];

    if (res.action === 'validate') {
      lines.push(`Status:          ${res.isValid ? 'VALID' : 'INVALID'}`);
      if (res.expectedCheckDigit) {
        lines.push(`Expected:        ${res.expectedCheckDigit}`);
      }
      if (res.actualCheckDigit) {
        lines.push(`Actual:          ${res.actualCheckDigit}`);
      }
    }

    lines.push('--------------------------------------------------');
    lines.push('Calculation Breakdown:');
    for (const detail of res.details) {
      lines.push(`- ${detail}`);
    }

    return lines.join('\n');
  }

  async copyResult(): Promise<void> {
    const text = this.resultText();
    if (!text) return;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      }
    } catch {
      // Fallback
    }
  }
}
