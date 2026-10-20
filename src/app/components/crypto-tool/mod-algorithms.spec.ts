import { describe, it, expect } from 'vitest';
import {
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

describe('MOD Check Digit Algorithms', () => {
  describe('MOD 10 - Luhn', () => {
    it('calculates Luhn check digit correctly', () => {
      // 7992739871 -> Luhn check digit is 3 (79927398713 is standard Luhn example)
      const res = processMod10('7992739871', 'luhn', 'generate');
      expect(res.checkDigit).toBe('3');
      expect(res.fullString).toBe('79927398713');
    });

    it('validates correct and incorrect Luhn numbers', () => {
      const valid = processMod10('79927398713', 'luhn', 'validate');
      expect(valid.isValid).toBe(true);

      const invalid = processMod10('79927398714', 'luhn', 'validate');
      expect(invalid.isValid).toBe(false);
    });
  });

  describe('MOD 10 - EAN/UPC', () => {
    it('calculates EAN-13 check digit correctly', () => {
      // 400638133393 -> 1 (4006381333931)
      const res = processMod10('400638133393', 'ean_upc', 'generate');
      expect(res.checkDigit).toBe('1');
      expect(res.fullString).toBe('4006381333931');
    });
  });

  describe('MOD 11 - Bank / Bill Payment (Weights 2-7 cyclic)', () => {
    it('calculates Bank Mod 11 check digit correctly', () => {
      // Input: '12345678' -> from right: weights are 2, 3, 4, 5, 6, 7, 2, 3
      // Digits: 1*3 + 2*2 + 3*7 + 4*6 + 5*5 + 6*4 + 7*3 + 8*2
      // = 3 + 4 + 21 + 24 + 25 + 24 + 21 + 16 = 138
      // 138 % 11 = 6. 11 - 6 = 5.
      const res = processMod11('12345678', 'bank_bill_payment', '0', 'generate');
      expect(res.checkDigit).toBe('5');
      expect(res.fullString).toBe('123456785');
    });

    it('validates Bank Mod 11 check digit correctly', () => {
      const valid = processMod11('123456785', 'bank_bill_payment', '0', 'validate');
      expect(valid.isValid).toBe(true);

      const invalid = processMod11('123456786', 'bank_bill_payment', '0', 'validate');
      expect(invalid.isValid).toBe(false);
    });

    it('handles remainder 1 (value 10) according to rem10Handling', () => {
      // Find a payload where sum % 11 === 1
      // e.g. payload with sum 12 -> 12 % 11 = 1
      // 6*2 = 12
      const res0 = processMod11('6', 'bank_bill_payment', '0', 'generate');
      expect(res0.checkDigit).toBe('0');

      const resX = processMod11('6', 'bank_bill_payment', 'X', 'generate');
      expect(resX.checkDigit).toBe('X');

      expect(() => {
        processMod11('6', 'bank_bill_payment', 'error', 'generate');
      }).toThrow();
    });
  });

  describe('MOD 11 - Thai National ID', () => {
    it('calculates Thai Citizen ID check digit correctly', () => {
      // Example 12 digits: 123456789012
      // sum = 1*13 + 2*12 + 3*11 + 4*10 + 5*9 + 6*8 + 7*7 + 8*6 + 9*5 + 0*4 + 1*3 + 2*2
      // 13 + 24 + 33 + 40 + 45 + 48 + 49 + 48 + 45 + 0 + 3 + 4 = 352
      // 352 % 11 = 0
      // (11 - 0) % 10 = 1
      const res = processMod11('123456789012', 'thai_id', '0', 'generate');
      expect(res.checkDigit).toBe('1');
      expect(res.fullString).toBe('1234567890121');

      const valid = processMod11('1234567890121', 'thai_id', '0', 'validate');
      expect(valid.isValid).toBe(true);
    });
  });

  describe('MOD 97 - ISO 7064 / IBAN', () => {
    it('calculates ISO 7064 Mod 97-10 check digits correctly', () => {
      // ISO 11649 RF Creditor reference or IBAN format
      // Test payload '532013000'
      const res = processMod97('532013000', 'iso7064', 'generate');
      expect(res.checkDigit.length).toBe(2);
      expect(res.fullString).toBe(`532013000${res.checkDigit}`);

      const valid = processMod97(res.fullString, 'iso7064', 'validate');
      expect(valid.isValid).toBe(true);
    });
  });

  describe('MOD 7', () => {
    it('calculates simple modulo 7 correctly', () => {
      // 12345 % 7 = 4
      const res = processMod7('12345', 'generate');
      expect(res.checkDigit).toBe('4');
      expect(res.fullString).toBe('123454');
    });
  });

  describe('MOD 23 - Spanish DNI', () => {
    it('calculates DNI check letter correctly', () => {
      // 12345678 % 23 = 14 -> index 14 in 'TRWAGMYFPDXBNJZSQVHLCKE' is 'Z'
      const res = processMod23('12345678', 'generate');
      expect(res.checkDigit).toBe('Z');
      expect(res.fullString).toBe('12345678Z');

      const valid = processMod23('12345678Z', 'validate');
      expect(valid.isValid).toBe(true);
    });
  });

  describe('MOD 43 - Code 39', () => {
    it('calculates Code 39 check character correctly', () => {
      // 'CODE 39'
      const res = processMod43('CODE 39', 'generate');
      expect(res.checkDigit.length).toBe(1);

      const valid = processMod43(res.fullString, 'validate');
      expect(valid.isValid).toBe(true);
    });
  });

  describe('Verhoeff & Damm', () => {
    it('calculates Verhoeff correctly and validates', () => {
      // 236 -> check digit 3 -> 2363
      const res = processVerhoeff('236', 'generate');
      expect(res.checkDigit).toBe('3');
      expect(res.fullString).toBe('2363');

      const valid = processVerhoeff('2363', 'validate');
      expect(valid.isValid).toBe(true);

      const invalid = processVerhoeff('2364', 'validate');
      expect(invalid.isValid).toBe(false);
    });

    it('calculates Damm correctly and validates', () => {
      // 572 -> check digit 4 -> 5724
      const res = processDamm('572', 'generate');
      expect(res.checkDigit).toBe('4');
      expect(res.fullString).toBe('5724');

      const valid = processDamm('5724', 'validate');
      expect(valid.isValid).toBe(true);

      const invalid = processDamm('5725', 'validate');
      expect(invalid.isValid).toBe(false);
    });
  });
});

