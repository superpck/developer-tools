import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { CryptoTool } from './crypto-tool';

describe('CryptoTool', () => {
  it('instantiates correctly with defaults', () => {
    const tool = new CryptoTool();
    expect(tool.selectedOp()).toBe('MD5');
    expect(tool.modAction()).toBe('generate');
    expect(tool.resultText()).toBe('');
  });

  it('computes MD5 hash correctly', () => {
    const tool = new CryptoTool();
    tool.selectedOp.set('MD5');
    tool.inputText.set('hello');
    expect(tool.resultText()).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('computes Base64 encode and decode correctly', () => {
    const tool = new CryptoTool();
    tool.selectedOp.set('Base64Encode');
    tool.inputText.set('Hello World');
    expect(tool.resultText()).toBe('SGVsbG8gV29ybGQ=');

    tool.selectedOp.set('Base64Decode');
    tool.inputText.set('SGVsbG8gV29ybGQ=');
    expect(tool.resultText()).toBe('Hello World');
  });

  it('computes MOD 10 (Luhn) in detailed format', () => {
    const tool = new CryptoTool();
    tool.selectedOp.set('MOD10');
    tool.mod10Variant.set('luhn');
    tool.modAction.set('generate');
    tool.inputText.set('7992739871');

    const result = tool.resultText();
    expect(result).toContain('MOD 10 (Luhn');
    expect(result).toContain('Check Digit:     3');
    expect(result).toContain('Complete String: 79927398713');
  });

  it('validates MOD 10 (Luhn)', () => {
    const tool = new CryptoTool();
    tool.selectedOp.set('MOD10');
    tool.mod10Variant.set('luhn');
    tool.modAction.set('validate');
    tool.inputText.set('79927398713');

    const result = tool.resultText();
    expect(result).toContain('Status:          VALID');
  });

  it('computes MOD 11 (Bank / Bill Payment)', () => {
    const tool = new CryptoTool();
    tool.selectedOp.set('MOD11');
    tool.mod11Variant.set('bank_bill_payment');
    tool.modAction.set('generate');
    tool.inputText.set('12345678');

    const result = tool.resultText();
    expect(result).toContain('Check Digit:     5');
    expect(result).toContain('Complete String: 123456785');
  });

  it('handles multi-line batch input for MOD 10', () => {
    const tool = new CryptoTool();
    tool.selectedOp.set('MOD10');
    tool.modOutputFormat.set('appended');
    tool.inputText.set('7992739871\n400638133393');

    const result = tool.resultText();
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe('79927398713');
  });
});
