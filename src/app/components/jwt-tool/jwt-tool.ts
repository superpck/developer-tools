import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as CryptoJS from 'crypto-js';

type JwtMode = 'Decode' | 'Encode';
type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';

@Component({
  selector: 'app-jwt-tool',
  imports: [CommonModule, FormsModule],
  templateUrl: './jwt-tool.html',
  styleUrl: './jwt-tool.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JwtTool {
  mode = signal<JwtMode>('Decode');
  
  // Decode State
  encodedToken = signal('');
  
  // Encode State
  headerJson = signal('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  payloadJson = signal('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
  secretKey = signal('');
  
  // Computed Decode
  decodedResult = computed(() => {
    const token = this.encodedToken().trim();
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format. Must contain 3 parts separated by dots.' };
    }
    
    try {
      const header = this.base64UrlDecode(parts[0]);
      const payload = this.base64UrlDecode(parts[1]);
      
      let headerObj, payloadObj;
      try {
        headerObj = JSON.parse(header);
      } catch (e) {
        headerObj = header; // if not valid JSON
      }
      try {
        payloadObj = JSON.parse(payload);
      } catch (e) {
        payloadObj = payload;
      }
      
      return {
        headerObj,
        payloadObj,
        signatureString: parts[2]
      };
    } catch (e: any) {
      return { error: 'Failed to decode token: ' + e.message };
    }
  });

  // Verify Signature
  verifySignature = computed(() => {
    const token = this.encodedToken().trim();
    const key = this.secretKey();
    if (!token || !key) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    try {
      const headerDecoded = JSON.parse(this.base64UrlDecode(parts[0]));
      const alg = headerDecoded.alg;
      
      const dataToSign = parts[0] + '.' + parts[1];
      let expectedSig = '';
      
      switch (alg) {
        case 'HS256':
          expectedSig = this.base64UrlEncode(CryptoJS.HmacSHA256(dataToSign, key));
          break;
        case 'HS384':
          expectedSig = this.base64UrlEncode(CryptoJS.HmacSHA384(dataToSign, key));
          break;
        case 'HS512':
          expectedSig = this.base64UrlEncode(CryptoJS.HmacSHA512(dataToSign, key));
          break;
        default:
          return { status: 'unsupported', message: `Algorithm ${alg} is not supported for automatic verification.` };
      }
      
      if (expectedSig === parts[2]) {
        return { status: 'valid', message: 'Signature Verified' };
      } else {
        return { status: 'invalid', message: 'Invalid Signature' };
      }
    } catch {
      return null;
    }
  });

  // Computed Encode
  encodedResult = computed(() => {
    try {
      const hStr = this.headerJson();
      const pStr = this.payloadJson();
      const key = this.secretKey();

      JSON.parse(hStr); // validate JSON
      JSON.parse(pStr); // validate JSON
      
      const encodedHeader = this.base64UrlEncodeString(hStr);
      const encodedPayload = this.base64UrlEncodeString(pStr);
      
      const dataToSign = encodedHeader + '.' + encodedPayload;
      
      if (!key) {
        // Return without signature if no key provided
        return { token: dataToSign + '.' };
      }
      
      const headerObj = JSON.parse(hStr);
      let signature = '';
      
      switch (headerObj.alg) {
        case 'HS256':
          signature = this.base64UrlEncode(CryptoJS.HmacSHA256(dataToSign, key));
          break;
        case 'HS384':
          signature = this.base64UrlEncode(CryptoJS.HmacSHA384(dataToSign, key));
          break;
        case 'HS512':
          signature = this.base64UrlEncode(CryptoJS.HmacSHA512(dataToSign, key));
          break;
        default:
          return { error: `Algorithm ${headerObj.alg} is not supported for signing.` };
      }
      
      return { token: dataToSign + '.' + signature };

    } catch (e: any) {
      return { error: 'Invalid JSON configuration: ' + e.message };
    }
  });

  private base64UrlEncodeString(str: string): string {
    const utf8Bytes = CryptoJS.enc.Utf8.parse(str);
    return this.base64UrlEncode(utf8Bytes);
  }

  private base64UrlEncode(wordArray: CryptoJS.lib.WordArray): string {
    let base64 = CryptoJS.enc.Base64.stringify(wordArray);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private base64UrlDecode(base64Url: string): string {
    base64Url = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Url.length % 4) {
      base64Url += '=';
    }
    const wordArray = CryptoJS.enc.Base64.parse(base64Url);
    return CryptoJS.enc.Utf8.stringify(wordArray);
  }
}