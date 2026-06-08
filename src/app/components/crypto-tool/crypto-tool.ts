import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as CryptoJS from 'crypto-js';

type HashOperation = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512';
type EncryptOperation = 'Base64Encode' | 'Base64Decode' | 'AESEncrypt' | 'AESDecrypt';
type Operation = HashOperation | EncryptOperation;

@Component({
  selector: 'app-crypto-tool',
  imports: [CommonModule, FormsModule],
  templateUrl: './crypto-tool.html',
  styleUrl: './crypto-tool.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CryptoTool {
  inputText = signal('');
  secretKey = signal('');
  selectedOp = signal<Operation>('MD5');

  oneWayOps: Operation[] = ['MD5', 'SHA1', 'SHA256', 'SHA512'];
  twoWayOps: Operation[] = ['Base64Encode', 'Base64Decode', 'AESEncrypt', 'AESDecrypt'];

  resultText = computed(() => {
    const text = this.inputText();
    const op = this.selectedOp();
    const key = this.secretKey();

    if (!text) return '';

    try {
      switch (op) {
        // One-Way Hash
        case 'MD5': return CryptoJS.MD5(text).toString();
        case 'SHA1': return CryptoJS.SHA1(text).toString();
        case 'SHA256': return CryptoJS.SHA256(text).toString();
        case 'SHA512': return CryptoJS.SHA512(text).toString();

        // Two-Way
        case 'Base64Encode': return btoa(unescape(encodeURIComponent(text)));
        case 'Base64Decode': return decodeURIComponent(escape(atob(text)));

        case 'AESEncrypt':
          if (!key) return 'Please provide a Secret Key for AES encryption.';
          return CryptoJS.AES.encrypt(text, key).toString();

        case 'AESDecrypt':
          if (!key) return 'Please provide a Secret Key for AES decryption.';
          const bytes = CryptoJS.AES.decrypt(text, key);
          return bytes.toString(CryptoJS.enc.Utf8) || 'Decryption failed (Invalid Secret Key or Data).';

        default: return '';
      }
    } catch (e) {
      return 'Operation failed: Invalid input or parameters.';
    }
  });
}
