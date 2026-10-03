import { describe, expect, it } from 'vitest';

import {
  CIDR_CHEAT_SHEET,
  calculateSubnet,
  classifyIpAddress,
  ipClassOf,
  parseIPv4,
  parseSubnetInput,
  reverseDnsOf,
} from './subnet-calculator.service';

describe('subnet-calculator.service', () => {
  describe('parseIPv4', () => {
    it('parses a valid dotted-quad address', () => {
      expect(parseIPv4('192.168.1.10')).toEqual([192, 168, 1, 10]);
    });

    it('rejects out-of-range octets', () => {
      expect(parseIPv4('192.168.1.256')).toBeNull();
    });

    it('rejects malformed input', () => {
      expect(parseIPv4('not-an-ip')).toBeNull();
      expect(parseIPv4('192.168.1')).toBeNull();
    });
  });

  describe('parseSubnetInput', () => {
    it('accepts a CIDR prefix', () => {
      expect(parseSubnetInput('24')).toBe(24);
      expect(parseSubnetInput('/24')).toBe(24);
    });

    it('accepts a dotted subnet mask', () => {
      expect(parseSubnetInput('255.255.255.0')).toBe(24);
      expect(parseSubnetInput('255.255.255.128')).toBe(25);
    });

    it('rejects a non-contiguous mask', () => {
      expect(() => parseSubnetInput('255.255.0.255')).toThrow();
    });

    it('rejects an out-of-range prefix', () => {
      expect(() => parseSubnetInput('33')).toThrow();
    });
  });

  describe('calculateSubnet', () => {
    it('computes network details for a typical /24', () => {
      const result = calculateSubnet('192.168.1.10', '24');

      expect(result.networkAddress).toBe('192.168.1.0');
      expect(result.broadcastAddress).toBe('192.168.1.255');
      expect(result.firstHost).toBe('192.168.1.1');
      expect(result.lastHost).toBe('192.168.1.254');
      expect(result.subnetMask).toBe('255.255.255.0');
      expect(result.wildcardMask).toBe('0.0.0.255');
      expect(result.totalAddresses).toBe(256);
      expect(result.usableHosts).toBe(254);
      expect(result.cidr).toBe('192.168.1.10/24');
    });

    it('accepts a dotted subnet mask as the second argument', () => {
      const result = calculateSubnet('10.0.5.20', '255.255.255.192');
      expect(result.prefixLength).toBe(26);
      expect(result.networkAddress).toBe('10.0.5.0');
      expect(result.broadcastAddress).toBe('10.0.5.63');
    });

    it('handles /31 point-to-point links per RFC 3021', () => {
      const result = calculateSubnet('10.0.0.0', '31');
      expect(result.usableHosts).toBe(2);
      expect(result.firstHost).toBe('10.0.0.0');
      expect(result.lastHost).toBe('10.0.0.1');
    });

    it('handles /32 host routes', () => {
      const result = calculateSubnet('10.0.0.5', '32');
      expect(result.usableHosts).toBe(1);
      expect(result.networkAddress).toBe('10.0.0.5');
      expect(result.broadcastAddress).toBe('10.0.0.5');
    });

    it('throws for an invalid IP address', () => {
      expect(() => calculateSubnet('999.1.1.1', '24')).toThrow();
    });
  });

  describe('classifyIpAddress', () => {
    it('identifies private RFC 1918 ranges', () => {
      expect(classifyIpAddress('192.168.1.10').type).toBe('private');
      expect(classifyIpAddress('10.1.2.3').type).toBe('private');
      expect(classifyIpAddress('172.20.0.1').type).toBe('private');
    });

    it('identifies loopback addresses', () => {
      expect(classifyIpAddress('127.0.0.1').type).toBe('loopback');
    });

    it('identifies link-local (APIPA) addresses', () => {
      expect(classifyIpAddress('169.254.10.5').type).toBe('link-local');
    });

    it('identifies multicast and broadcast addresses', () => {
      expect(classifyIpAddress('224.0.0.1').type).toBe('multicast');
      expect(classifyIpAddress('255.255.255.255').type).toBe('broadcast');
    });

    it('identifies carrier-grade NAT addresses', () => {
      expect(classifyIpAddress('100.64.0.1').type).toBe('cgnat');
    });

    it('falls back to public for globally routable addresses', () => {
      expect(classifyIpAddress('8.8.8.8').type).toBe('public');
      expect(classifyIpAddress('1.1.1.1').type).toBe('public');
    });
  });

  describe('ipClassOf', () => {
    it('maps the first octet to the legacy classful class', () => {
      expect(ipClassOf(10)).toBe('A');
      expect(ipClassOf(172)).toBe('B');
      expect(ipClassOf(192)).toBe('C');
      expect(ipClassOf(224)).toBe('D');
      expect(ipClassOf(240)).toBe('E');
    });
  });

  describe('reverseDnsOf', () => {
    it('builds the in-addr.arpa pointer name', () => {
      expect(reverseDnsOf('192.168.1.10')).toBe('10.1.168.192.in-addr.arpa');
    });
  });

  describe('CIDR_CHEAT_SHEET', () => {
    it('includes entries from /1 through /32', () => {
      expect(CIDR_CHEAT_SHEET).toHaveLength(32);
      expect(CIDR_CHEAT_SHEET[0]).toEqual({ prefix: 1, mask: '128.0.0.0', hosts: expect.any(Number) });
      expect(CIDR_CHEAT_SHEET.at(-1)).toEqual({ prefix: 32, mask: '255.255.255.255', hosts: 1 });
    });
  });
});
