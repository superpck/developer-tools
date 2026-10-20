export type Mod10Variant = 'luhn' | 'ean_upc' | 'weighted_21' | 'custom';
export type Mod11Variant = 'bank_bill_payment' | 'thai_id' | 'isbn10' | 'custom';
export type Rem10Handling = '0' | 'X' | 'error';
export type Mod97Variant = 'iso7064' | 'simple';
export type Mod103CodeSet = 'A' | 'B' | 'C';
export type ModAction = 'generate' | 'validate';
export type ModOutputFormat = 'detailed' | 'checkDigitOnly' | 'appended';

export interface CheckDigitResult {
  algorithm: string;
  action: ModAction;
  isValid?: boolean;
  input: string;
  payload: string;
  checkDigit: string;
  fullString: string;
  expectedCheckDigit?: string;
  actualCheckDigit?: string;
  details: string[];
}

/**
 * Arbitrary-length string modulo calculation for base-10 digits.
 */
function bigIntMod(digits: string, mod: number): number {
  let remainder = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = parseInt(digits[i], 10);
    if (isNaN(digit)) continue;
    remainder = (remainder * 10 + digit) % mod;
  }
  return remainder;
}

/**
 * Parses comma-separated weight string (e.g. "2,3,4,5,6,7" or "3,1").
 */
export function parseWeights(weightsStr: string, defaultWeights: number[] = [2, 3, 4, 5, 6, 7]): number[] {
  const parts = weightsStr
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);
  return parts.length > 0 ? parts : defaultWeights;
}

// -------------------------------------------------------------
// MOD 10
// -------------------------------------------------------------
export function processMod10(
  rawInput: string,
  variant: Mod10Variant,
  action: ModAction,
  customWeightsStr: string = '2,1'
): CheckDigitResult {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Input must contain at least one numeric digit.');
  }

  const isLuhn = variant === 'luhn';
  const isEan = variant === 'ean_upc';
  const isCustom = variant === 'custom';

  const algName = isLuhn
    ? 'MOD 10 (Luhn Algorithm - Credit Card / IMEI)'
    : isEan
    ? 'MOD 10 (GS1 / EAN / UPC - Weight 3, 1)'
    : isCustom
    ? 'MOD 10 (Custom Weights)'
    : 'MOD 10 (Weighted 2, 1)';

  if (action === 'validate') {
    if (digits.length < 2) {
      throw new Error('Validation requires at least 2 digits (payload + check digit).');
    }
    const payload = digits.slice(0, -1);
    const actualCheck = digits.slice(-1);
    const expectedCheck = calculateMod10CheckDigit(payload, variant, customWeightsStr).checkDigit;
    const isValid = actualCheck === expectedCheck;

    return {
      algorithm: algName,
      action: 'validate',
      isValid,
      input: rawInput,
      payload,
      checkDigit: actualCheck,
      fullString: digits,
      expectedCheckDigit: expectedCheck,
      actualCheckDigit: actualCheck,
      details: [
        `Payload: ${payload}`,
        `Actual check digit: ${actualCheck}`,
        `Expected check digit: ${expectedCheck}`,
        `Status: ${isValid ? 'VALID' : 'INVALID'}`
      ]
    };
  }

  // Generate
  const { checkDigit, details } = calculateMod10CheckDigit(digits, variant, customWeightsStr);
  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: digits,
    checkDigit,
    fullString: `${digits}${checkDigit}`,
    details
  };
}

function calculateMod10CheckDigit(
  payload: string,
  variant: Mod10Variant,
  customWeightsStr: string
): { checkDigit: string; details: string[] } {
  const details: string[] = [];
  let sum = 0;

  if (variant === 'luhn') {
    const weights: number[] = [];
    const products: number[] = [];
    for (let i = payload.length - 1; i >= 0; i--) {
      const digit = parseInt(payload[i], 10);
      const isSecond = (payload.length - 1 - i) % 2 === 0;
      const weight = isSecond ? 2 : 1;
      weights.unshift(weight);
      let prod = digit * weight;
      if (prod > 9) {
        prod -= 9;
      }
      products.unshift(prod);
      sum += prod;
    }
    const checkDigit = String((10 - (sum % 10)) % 10);
    details.push(`Weights (from right): [2, 1, 2, 1, ...]`);
    details.push(`Processed values: [${products.join(', ')}]`);
    details.push(`Sum: ${sum}`);
    details.push(`Remainder: ${sum} % 10 = ${sum % 10}`);
    details.push(`Check digit: (10 - ${sum % 10}) % 10 = ${checkDigit}`);
    return { checkDigit, details };
  }

  const weightsList =
    variant === 'ean_upc'
      ? [3, 1]
      : variant === 'custom'
      ? parseWeights(customWeightsStr, [2, 1])
      : [2, 1];

  const usedWeights: number[] = [];
  const terms: number[] = [];

  for (let i = payload.length - 1; i >= 0; i--) {
    const digit = parseInt(payload[i], 10);
    const weightIndex = (payload.length - 1 - i) % weightsList.length;
    const weight = weightsList[weightIndex];
    usedWeights.unshift(weight);
    const term = digit * weight;
    terms.unshift(term);
    sum += term;
  }

  const checkDigit = String((10 - (sum % 10)) % 10);
  details.push(`Weights applied: [${usedWeights.join(', ')}]`);
  details.push(`Sum: ${terms.join(' + ')} = ${sum}`);
  details.push(`Remainder: ${sum} % 10 = ${sum % 10}`);
  details.push(`Check digit: (10 - ${sum % 10}) % 10 = ${checkDigit}`);
  return { checkDigit, details };
}

// -------------------------------------------------------------
// MOD 11
// -------------------------------------------------------------
export function processMod11(
  rawInput: string,
  variant: Mod11Variant,
  rem10Handling: Rem10Handling,
  action: ModAction,
  customWeightsStr: string = '2,3,4,5,6,7'
): CheckDigitResult {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Input must contain at least one numeric digit.');
  }

  const algName =
    variant === 'bank_bill_payment'
      ? 'MOD 11 (Bank / Bill Payment - Weights 2-7)'
      : variant === 'thai_id'
      ? 'MOD 11 (Thai National ID - 13-digit Citizen ID)'
      : variant === 'isbn10'
      ? 'MOD 11 (ISBN-10)'
      : 'MOD 11 (Custom Weights)';

  if (variant === 'thai_id' && (action === 'generate' ? digits.length !== 12 : digits.length !== 13)) {
    throw new Error(
      action === 'generate'
        ? `Thai National ID calculation requires exactly 12 digits (received ${digits.length}).`
        : `Thai National ID validation requires exactly 13 digits (received ${digits.length}).`
    );
  }

  if (variant === 'isbn10' && (action === 'generate' ? digits.length !== 9 : digits.length !== 10)) {
    throw new Error(
      action === 'generate'
        ? `ISBN-10 calculation requires exactly 9 digits (received ${digits.length}).`
        : `ISBN-10 validation requires exactly 10 characters (received ${digits.length}).`
    );
  }

  if (action === 'validate') {
    if (digits.length < 2) {
      throw new Error('Validation requires at least 2 digits (payload + check digit).');
    }
    const payload = rawInput.trim().slice(0, -1);
    const actualCheck = rawInput.trim().slice(-1).toUpperCase();
    const expectedCheck = calculateMod11CheckDigit(
      payload.replace(/\D/g, ''),
      variant,
      rem10Handling,
      customWeightsStr
    ).checkDigit;
    const isValid = actualCheck === expectedCheck;

    return {
      algorithm: algName,
      action: 'validate',
      isValid,
      input: rawInput,
      payload,
      checkDigit: actualCheck,
      fullString: rawInput.trim(),
      expectedCheckDigit: expectedCheck,
      actualCheckDigit: actualCheck,
      details: [
        `Payload: ${payload}`,
        `Actual check digit: ${actualCheck}`,
        `Expected check digit: ${expectedCheck}`,
        `Status: ${isValid ? 'VALID' : 'INVALID'}`
      ]
    };
  }

  // Generate
  const { checkDigit, details } = calculateMod11CheckDigit(digits, variant, rem10Handling, customWeightsStr);
  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: digits,
    checkDigit,
    fullString: `${digits}${checkDigit}`,
    details
  };
}

function calculateMod11CheckDigit(
  payload: string,
  variant: Mod11Variant,
  rem10Handling: Rem10Handling,
  customWeightsStr: string
): { checkDigit: string; details: string[] } {
  const details: string[] = [];
  let sum = 0;

  if (variant === 'thai_id') {
    const terms: number[] = [];
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(payload[i], 10);
      const weight = 13 - i;
      terms.push(digit * weight);
      sum += digit * weight;
    }
    const rem = sum % 11;
    const checkDigit = String((11 - rem) % 10);
    details.push(`Weights (from left): [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]`);
    details.push(`Sum: ${sum}`);
    details.push(`Remainder: ${sum} % 11 = ${rem}`);
    details.push(`Check digit: (11 - ${rem}) % 10 = ${checkDigit}`);
    return { checkDigit, details };
  }

  if (variant === 'isbn10') {
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(payload[i], 10);
      const weight = 10 - i;
      sum += digit * weight;
    }
    const rem = sum % 11;
    const checkVal = (11 - rem) % 11;
    const checkDigit = checkVal === 10 ? 'X' : String(checkVal);
    details.push(`Weights (from left): [10, 9, 8, 7, 6, 5, 4, 3, 2]`);
    details.push(`Sum: ${sum}`);
    details.push(`Remainder: ${sum} % 11 = ${rem}`);
    details.push(`Check digit: ${checkVal === 10 ? '10 -> X' : checkDigit}`);
    return { checkDigit, details };
  }

  // Bank / Bill payment or custom
  const weightsList =
    variant === 'custom' ? parseWeights(customWeightsStr, [2, 3, 4, 5, 6, 7]) : [2, 3, 4, 5, 6, 7];

  const appliedWeights: number[] = [];
  for (let i = payload.length - 1; i >= 0; i--) {
    const digit = parseInt(payload[i], 10);
    const weightIndex = (payload.length - 1 - i) % weightsList.length;
    const weight = weightsList[weightIndex];
    appliedWeights.unshift(weight);
    sum += digit * weight;
  }

  const rem = sum % 11;
  let checkDigit: string;

  if (rem === 0) {
    checkDigit = '0';
  } else if (rem === 1) {
    if (rem10Handling === 'error') {
      throw new Error('Remainder is 1 (Check digit is 10, rejected by strict rule).');
    }
    checkDigit = rem10Handling; // '0' or 'X'
  } else {
    checkDigit = String(11 - rem);
  }

  details.push(`Weights applied (from right): [${appliedWeights.join(', ')}]`);
  details.push(`Sum: ${sum}`);
  details.push(`Remainder: ${sum} % 11 = ${rem}`);
  if (rem === 1) {
    details.push(`Remainder 1 (11 - 1 = 10) handled as: '${checkDigit}'`);
  } else if (rem === 0) {
    details.push(`Remainder 0 -> Check digit: 0`);
  } else {
    details.push(`Check digit: 11 - ${rem} = ${checkDigit}`);
  }

  return { checkDigit, details };
}

// -------------------------------------------------------------
// MOD 97 (ISO/IEC 7064 MOD 97-10 - IBAN / RF Creditor)
// -------------------------------------------------------------
export function processMod97(
  rawInput: string,
  variant: Mod97Variant,
  action: ModAction
): CheckDigitResult {
  const clean = rawInput.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!clean) {
    throw new Error('Input must contain letters or digits.');
  }

  const algName =
    variant === 'iso7064'
      ? 'MOD 97-10 (ISO 7064 / IBAN / Creditor Reference)'
      : 'MOD 97 (Simple Remainder)';

  if (action === 'validate') {
    if (variant === 'iso7064') {
      // Convert all letters A->10..Z->35
      const numericStr = convertAlphaToDigits(clean);
      const rem = bigIntMod(numericStr, 97);
      const isValid = rem === 1;
      const actualCheck = clean.slice(-2);
      const payload = clean.slice(0, -2);
      return {
        algorithm: algName,
        action: 'validate',
        isValid,
        input: rawInput,
        payload,
        checkDigit: actualCheck,
        fullString: clean,
        details: [
          `Converted numeric string: ${numericStr}`,
          `Remainder: ${numericStr} % 97 = ${rem}`,
          `Status: ${isValid ? 'VALID (Remainder is 1)' : 'INVALID'}`
        ]
      };
    } else {
      const digitsOnly = clean.replace(/\D/g, '');
      const actualCheck = digitsOnly.slice(-2);
      const payload = digitsOnly.slice(0, -2);
      const rem = bigIntMod(payload, 97);
      const expectedCheck = String(rem).padStart(2, '0');
      const isValid = actualCheck === expectedCheck;
      return {
        algorithm: algName,
        action: 'validate',
        isValid,
        input: rawInput,
        payload,
        checkDigit: actualCheck,
        fullString: digitsOnly,
        expectedCheckDigit: expectedCheck,
        actualCheckDigit: actualCheck,
        details: [
          `Remainder: ${payload} % 97 = ${rem}`,
          `Status: ${isValid ? 'VALID' : 'INVALID'}`
        ]
      };
    }
  }

  // Generate
  const details: string[] = [];
  if (variant === 'iso7064') {
    const converted = convertAlphaToDigits(clean);
    // Append 00 to compute check digits
    const appendedWith00 = converted + '00';
    const rem = bigIntMod(appendedWith00, 97);
    const checkVal = 98 - rem;
    const checkDigit = String(checkVal).padStart(2, '0');
    details.push(`Normalized alphanumeric: ${clean}`);
    details.push(`Converted to digits (A=10..Z=35): ${converted}`);
    details.push(`Appended '00': ${appendedWith00}`);
    details.push(`Remainder: ${appendedWith00} % 97 = ${rem}`);
    details.push(`Check digits: 98 - ${rem} = ${checkDigit}`);
    return {
      algorithm: algName,
      action: 'generate',
      input: rawInput,
      payload: clean,
      checkDigit,
      fullString: `${clean}${checkDigit}`,
      details
    };
  } else {
    const digitsOnly = clean.replace(/\D/g, '');
    if (!digitsOnly) throw new Error('Input must contain digits for Simple MOD 97.');
    const rem = bigIntMod(digitsOnly, 97);
    const checkDigit = String(rem).padStart(2, '0');
    details.push(`Calculation: ${digitsOnly} % 97 = ${rem}`);
    details.push(`Check digit (2 digits): ${checkDigit}`);
    return {
      algorithm: algName,
      action: 'generate',
      input: rawInput,
      payload: digitsOnly,
      checkDigit,
      fullString: `${digitsOnly}${checkDigit}`,
      details
    };
  }
}

function convertAlphaToDigits(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch >= '0' && ch <= '9') {
      result += ch;
    } else if (ch >= 'A' && ch <= 'Z') {
      result += String(ch.charCodeAt(0) - 55); // A=10, B=11 ...
    }
  }
  return result;
}

// -------------------------------------------------------------
// MOD 7 (Logistics / FedEx / DHL / USPS)
// -------------------------------------------------------------
export function processMod7(rawInput: string, action: ModAction): CheckDigitResult {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) throw new Error('Input must contain at least one numeric digit.');

  const algName = 'MOD 7 (FedEx / DHL / USPS Money Order)';

  if (action === 'validate') {
    if (digits.length < 2) throw new Error('Validation requires at least 2 digits.');
    const payload = digits.slice(0, -1);
    const actualCheck = digits.slice(-1);
    const rem = bigIntMod(payload, 7);
    const expectedCheck = String(rem);
    const isValid = actualCheck === expectedCheck;

    return {
      algorithm: algName,
      action: 'validate',
      isValid,
      input: rawInput,
      payload,
      checkDigit: actualCheck,
      fullString: digits,
      expectedCheckDigit: expectedCheck,
      actualCheckDigit: actualCheck,
      details: [
        `Payload: ${payload}`,
        `Calculation: ${payload} % 7 = ${rem}`,
        `Actual: ${actualCheck}, Expected: ${expectedCheck}`,
        `Status: ${isValid ? 'VALID' : 'INVALID'}`
      ]
    };
  }

  const rem = bigIntMod(digits, 7);
  const checkDigit = String(rem);
  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: digits,
    checkDigit,
    fullString: `${digits}${checkDigit}`,
    details: [
      `Input digits: ${digits}`,
      `Calculation: ${digits} % 7 = ${rem}`,
      `Check digit: ${checkDigit}`
    ]
  };
}

// -------------------------------------------------------------
// MOD 23 (Spanish DNI)
// -------------------------------------------------------------
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function processMod23(rawInput: string, action: ModAction): CheckDigitResult {
  const clean = rawInput.trim().toUpperCase();
  const algName = 'MOD 23 (Spanish DNI)';

  if (action === 'validate') {
    const actualCheck = clean.slice(-1);
    const payload = clean.slice(0, -1).replace(/\D/g, '');
    if (!payload) throw new Error('DNI number must contain digits.');
    const rem = bigIntMod(payload, 23);
    const expectedCheck = DNI_LETTERS[rem];
    const isValid = actualCheck === expectedCheck;

    return {
      algorithm: algName,
      action: 'validate',
      isValid,
      input: rawInput,
      payload,
      checkDigit: actualCheck,
      fullString: `${payload}${actualCheck}`,
      expectedCheckDigit: expectedCheck,
      actualCheckDigit: actualCheck,
      details: [
        `DNI Number: ${payload}`,
        `Calculation: ${payload} % 23 = ${rem}`,
        `Letter table index ${rem} -> '${expectedCheck}'`,
        `Actual check letter: '${actualCheck}'`,
        `Status: ${isValid ? 'VALID' : 'INVALID'}`
      ]
    };
  }

  const digits = clean.replace(/\D/g, '');
  if (!digits) throw new Error('Input must contain digits.');
  const rem = bigIntMod(digits, 23);
  const checkDigit = DNI_LETTERS[rem];

  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: digits,
    checkDigit,
    fullString: `${digits}${checkDigit}`,
    details: [
      `DNI Number: ${digits}`,
      `Calculation: ${digits} % 23 = ${rem}`,
      `DNI Letter index ${rem} in '${DNI_LETTERS}' -> '${checkDigit}'`,
      `Result: ${digits}${checkDigit}`
    ]
  };
}

// -------------------------------------------------------------
// MOD 43 (Code 39 Barcode)
// -------------------------------------------------------------
const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

export function processMod43(rawInput: string, action: ModAction): CheckDigitResult {
  const clean = rawInput.trim().toUpperCase().replace(/^\*|\*$/g, '');
  const algName = 'MOD 43 (Code 39 Barcode)';

  for (let i = 0; i < clean.length; i++) {
    if (!CODE39_CHARS.includes(clean[i])) {
      throw new Error(`Invalid Code 39 character: '${clean[i]}'`);
    }
  }

  if (action === 'validate') {
    if (clean.length < 2) throw new Error('Validation requires at least 2 characters.');
    const payload = clean.slice(0, -1);
    const actualCheck = clean.slice(-1);
    let sum = 0;
    for (let i = 0; i < payload.length; i++) {
      sum += CODE39_CHARS.indexOf(payload[i]);
    }
    const rem = sum % 43;
    const expectedCheck = CODE39_CHARS[rem];
    const isValid = actualCheck === expectedCheck;

    return {
      algorithm: algName,
      action: 'validate',
      isValid,
      input: rawInput,
      payload,
      checkDigit: actualCheck,
      fullString: clean,
      expectedCheckDigit: expectedCheck,
      actualCheckDigit: actualCheck,
      details: [
        `Payload: ${payload}`,
        `Character values sum: ${sum}`,
        `Remainder: ${sum} % 43 = ${rem}`,
        `Expected character: '${expectedCheck}', Actual: '${actualCheck}'`,
        `Status: ${isValid ? 'VALID' : 'INVALID'}`
      ]
    };
  }

  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    sum += CODE39_CHARS.indexOf(clean[i]);
  }
  const rem = sum % 43;
  const checkDigit = CODE39_CHARS[rem];

  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: clean,
    checkDigit,
    fullString: `${clean}${checkDigit}`,
    details: [
      `Payload: ${clean}`,
      `Sum of character values: ${sum}`,
      `Remainder: ${sum} % 43 = ${rem}`,
      `Check character: '${checkDigit}' (Index ${rem})`
    ]
  };
}

// -------------------------------------------------------------
// MOD 47 (Code 93 Barcode)
// -------------------------------------------------------------
const CODE93_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

export function processMod47(rawInput: string, action: ModAction): CheckDigitResult {
  const clean = rawInput.trim().toUpperCase().replace(/^\*|\*$/g, '');
  const algName = 'MOD 47 (Code 93 Barcode - Dual Check C & K)';

  for (let i = 0; i < clean.length; i++) {
    if (!CODE93_CHARS.includes(clean[i])) {
      throw new Error(`Invalid Code 93 character: '${clean[i]}'`);
    }
  }

  if (action === 'validate') {
    if (clean.length < 3) throw new Error('Validation requires at least 3 characters (payload + C + K).');
    const payload = clean.slice(0, -2);
    const actualC = clean[clean.length - 2];
    const actualK = clean[clean.length - 1];

    const { checkC, checkK } = calculateCode93CheckDigits(payload);
    const isValid = actualC === checkC && actualK === checkK;

    return {
      algorithm: algName,
      action: 'validate',
      isValid,
      input: rawInput,
      payload,
      checkDigit: `${actualC}${actualK}`,
      fullString: clean,
      expectedCheckDigit: `${checkC}${checkK}`,
      actualCheckDigit: `${actualC}${actualK}`,
      details: [
        `Payload: ${payload}`,
        `Actual check characters: C='${actualC}', K='${actualK}'`,
        `Expected check characters: C='${checkC}', K='${checkK}'`,
        `Status: ${isValid ? 'VALID' : 'INVALID'}`
      ]
    };
  }

  const { checkC, checkK, details } = calculateCode93CheckDigits(clean);
  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: clean,
    checkDigit: `${checkC}${checkK}`,
    fullString: `${clean}${checkC}${checkK}`,
    details
  };
}

function calculateCode93CheckDigits(payload: string): { checkC: string; checkK: string; details: string[] } {
  // Check character C (weights 1 to 20 from right)
  let sumC = 0;
  for (let i = payload.length - 1, w = 1; i >= 0; i--, w++) {
    const weight = ((w - 1) % 20) + 1;
    sumC += CODE93_CHARS.indexOf(payload[i]) * weight;
  }
  const checkC = CODE93_CHARS[sumC % 47];

  // Check character K (weights 1 to 15 from right, including C)
  const payloadWithC = payload + checkC;
  let sumK = 0;
  for (let i = payloadWithC.length - 1, w = 1; i >= 0; i--, w++) {
    const weight = ((w - 1) % 15) + 1;
    sumK += CODE93_CHARS.indexOf(payloadWithC[i]) * weight;
  }
  const checkK = CODE93_CHARS[sumK % 47];

  return {
    checkC,
    checkK,
    details: [
      `Payload: ${payload}`,
      `Sum for 'C' (weights 1-20): ${sumC} % 47 = ${sumC % 47} -> '${checkC}'`,
      `Sum for 'K' (weights 1-15 including C): ${sumK} % 47 = ${sumK % 47} -> '${checkK}'`,
      `Combined check characters: '${checkC}${checkK}'`
    ]
  };
}

// -------------------------------------------------------------
// MOD 103 (Code 128 Barcode)
// -------------------------------------------------------------
export function processMod103(
  rawInput: string,
  codeSet: Mod103CodeSet,
  action: ModAction
): CheckDigitResult {
  const clean = rawInput.trim();
  if (!clean) throw new Error('Input cannot be empty for Code 128.');

  const algName = `MOD 103 (Code 128 Barcode - Set ${codeSet})`;
  const startCode = codeSet === 'A' ? 103 : codeSet === 'B' ? 104 : 105;

  let sum = startCode;
  const details: string[] = [`Start code (Set ${codeSet}): ${startCode}`];

  if (codeSet === 'C') {
    const digits = clean.replace(/\D/g, '');
    if (digits.length % 2 !== 0) {
      throw new Error('Code 128 Set C requires an even number of numeric digits.');
    }
    let pos = 1;
    for (let i = 0; i < digits.length; i += 2) {
      const pairVal = parseInt(digits.slice(i, i + 2), 10);
      sum += pairVal * pos;
      pos++;
    }
    const checkVal = sum % 103;
    details.push(`Digit pairs weighted sum: ${sum}`);
    details.push(`Check symbol value: ${sum} % 103 = ${checkVal}`);
    return {
      algorithm: algName,
      action: 'generate',
      input: rawInput,
      payload: digits,
      checkDigit: String(checkVal),
      fullString: `${digits} [Check: ${checkVal}]`,
      details
    };
  }

  // Set A or B
  for (let i = 0; i < clean.length; i++) {
    const ascii = clean.charCodeAt(i);
    const charVal = ascii >= 32 ? ascii - 32 : ascii + 64;
    const weight = i + 1;
    sum += charVal * weight;
  }
  const checkVal = sum % 103;
  details.push(`Weighted character sum: ${sum}`);
  details.push(`Check symbol value: ${sum} % 103 = ${checkVal}`);

  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: clean,
    checkDigit: String(checkVal),
    fullString: `${clean} [Check Value: ${checkVal}]`,
    details
  };
}

// -------------------------------------------------------------
// VERHOEFF ALGORITHM (Dihedral Group D5)
// -------------------------------------------------------------
const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const VERHOEFF_INV: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function processVerhoeff(rawInput: string, action: ModAction): CheckDigitResult {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) throw new Error('Input must contain at least one numeric digit.');

  const algName = 'Verhoeff Algorithm (Dihedral Group D5 - Aadhaar)';

  if (action === 'validate') {
    if (digits.length < 2) throw new Error('Validation requires at least 2 digits.');
    let c = 0;
    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[digits.length - 1 - i], 10);
      c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digit]];
    }
    const isValid = c === 0;
    const payload = digits.slice(0, -1);
    const actualCheck = digits.slice(-1);

    return {
      algorithm: algName,
      action: 'validate',
      isValid,
      input: rawInput,
      payload,
      checkDigit: actualCheck,
      fullString: digits,
      details: [
        `Input digits: ${digits}`,
        `Verhoeff checksum result: ${c}`,
        `Status: ${isValid ? 'VALID' : 'INVALID'}`
      ]
    };
  }

  // Generate
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = parseInt(digits[digits.length - 1 - i], 10);
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digit]];
  }
  const checkDigit = String(VERHOEFF_INV[c]);

  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: digits,
    checkDigit,
    fullString: `${digits}${checkDigit}`,
    details: [
      `Input digits: ${digits}`,
      `Intermediate checksum: ${c}`,
      `Inverse lookup: inv[${c}] = ${checkDigit}`,
      `Result: ${digits}${checkDigit}`
    ]
  };
}

// -------------------------------------------------------------
// DAMM ALGORITHM (Quasigroup Table)
// -------------------------------------------------------------
const DAMM_MATRIX: number[][] = [
  [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
  [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
  [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
  [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
  [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
  [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
  [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
  [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
  [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
  [2, 5, 8, 1, 4, 3, 6, 7, 9, 0]
];

export function processDamm(rawInput: string, action: ModAction): CheckDigitResult {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) throw new Error('Input must contain at least one numeric digit.');

  const algName = 'Damm Algorithm (Anti-symmetric Quasigroup)';

  if (action === 'validate') {
    if (digits.length < 2) throw new Error('Validation requires at least 2 digits.');
    let interim = 0;
    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[i], 10);
      interim = DAMM_MATRIX[interim][digit];
    }
    const isValid = interim === 0;
    const payload = digits.slice(0, -1);
    const actualCheck = digits.slice(-1);

    return {
      algorithm: algName,
      action: 'validate',
      isValid,
      input: rawInput,
      payload,
      checkDigit: actualCheck,
      fullString: digits,
      details: [
        `Input digits: ${digits}`,
        `Interim evaluation: ${interim}`,
        `Status: ${isValid ? 'VALID' : 'INVALID'}`
      ]
    };
  }

  // Generate
  let interim = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = parseInt(digits[i], 10);
    interim = DAMM_MATRIX[interim][digit];
  }
  const checkDigit = String(interim);

  return {
    algorithm: algName,
    action: 'generate',
    input: rawInput,
    payload: digits,
    checkDigit,
    fullString: `${digits}${checkDigit}`,
    details: [
      `Input digits: ${digits}`,
      `Quasigroup reduction result: ${interim}`,
      `Check digit: ${checkDigit}`,
      `Result: ${digits}${checkDigit}`
    ]
  };
}

