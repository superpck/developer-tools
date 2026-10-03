import { Injectable } from '@angular/core';

export type IpClass = 'A' | 'B' | 'C' | 'D' | 'E';

export type IpAddressType =
  | 'private'
  | 'public'
  | 'loopback'
  | 'link-local'
  | 'multicast'
  | 'reserved'
  | 'cgnat'
  | 'documentation'
  | 'benchmarking'
  | 'this-network'
  | 'broadcast'
  | 'protocol-assignment';

export interface IpClassification {
  type: IpAddressType;
  label: string;
  description: string;
}

export interface SubnetCalculationResult {
  ipAddress: string;
  ipBinary: string;
  prefixLength: number;
  subnetMask: string;
  subnetMaskBinary: string;
  wildcardMask: string;
  cidr: string;
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  ipClass: IpClass;
  classification: IpClassification;
  reverseDns: string;
}

/** Ranges are ordered from most to least specific; the first match wins. */
const IP_SPECIAL_RANGES: Array<{ network: string; prefix: number } & IpClassification> = [
  { network: '0.0.0.0', prefix: 8, type: 'this-network', label: 'Current network', description: '"This network" address block, used only as a source address (RFC 791).' },
  { network: '10.0.0.0', prefix: 8, type: 'private', label: 'Private (RFC 1918)', description: 'Private-use address space, not routable on the public internet.' },
  { network: '100.64.0.0', prefix: 10, type: 'cgnat', label: 'Carrier-grade NAT (RFC 6598)', description: 'Shared address space used by ISPs for carrier-grade NAT.' },
  { network: '127.0.0.0', prefix: 8, type: 'loopback', label: 'Loopback', description: 'Loopback addresses used for local host communication (e.g. 127.0.0.1).' },
  { network: '169.254.0.0', prefix: 16, type: 'link-local', label: 'Link-local (APIPA)', description: 'Automatically assigned when no DHCP server is reachable (RFC 3927).' },
  { network: '172.16.0.0', prefix: 12, type: 'private', label: 'Private (RFC 1918)', description: 'Private-use address space, not routable on the public internet.' },
  { network: '192.0.0.0', prefix: 24, type: 'protocol-assignment', label: 'IETF protocol assignments', description: 'Reserved for IETF protocol assignments (RFC 6890).' },
  { network: '192.0.2.0', prefix: 24, type: 'documentation', label: 'Documentation (TEST-NET-1)', description: 'Reserved for use in documentation and examples (RFC 5737).' },
  { network: '192.88.99.0', prefix: 24, type: 'reserved', label: '6to4 relay anycast (deprecated)', description: 'Formerly reserved for 6to4 relay anycast (RFC 7526).' },
  { network: '192.168.0.0', prefix: 16, type: 'private', label: 'Private (RFC 1918)', description: 'Private-use address space, not routable on the public internet.' },
  { network: '198.18.0.0', prefix: 15, type: 'benchmarking', label: 'Benchmarking', description: 'Reserved for network interconnect device benchmark testing (RFC 2544).' },
  { network: '198.51.100.0', prefix: 24, type: 'documentation', label: 'Documentation (TEST-NET-2)', description: 'Reserved for use in documentation and examples (RFC 5737).' },
  { network: '203.0.113.0', prefix: 24, type: 'documentation', label: 'Documentation (TEST-NET-3)', description: 'Reserved for use in documentation and examples (RFC 5737).' },
  { network: '255.255.255.255', prefix: 32, type: 'broadcast', label: 'Limited broadcast', description: 'The limited broadcast address, never forwarded by routers.' },
  { network: '224.0.0.0', prefix: 4, type: 'multicast', label: 'Multicast', description: 'Class D multicast address space (RFC 5771).' },
  { network: '240.0.0.0', prefix: 4, type: 'reserved', label: 'Reserved', description: 'Reserved for future use (Class E), not usable on the public internet.' },
];

/** Common CIDR prefixes with their dotted mask and usable host counts, handy as a quick reference. */
export const CIDR_CHEAT_SHEET: Array<{ prefix: number; mask: string; hosts: number }> = Array.from(
  { length: 33 },
  (_, prefix) => ({
    prefix,
    mask: intToIp(prefixToMaskInt(prefix)),
    hosts: prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(2 ** (32 - prefix) - 2, 0),
  }),
).filter(entry => entry.prefix >= 1);

function assertValid(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/** Parses a dotted-quad IPv4 string into its four octets, or returns null when invalid. */
export function parseIPv4(value: string): number[] | null {
  const trimmed = value.trim();
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
    return null;
  }

  const octets = trimmed.split('.').map(Number);
  if (octets.some(octet => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
}

export function ipToInt(octets: number[]): number {
  return octets[0] * 2 ** 24 + octets[1] * 2 ** 16 + octets[2] * 2 ** 8 + octets[3];
}

export function intToIp(value: number): string {
  return [24, 16, 8, 0].map(shift => Math.floor(value / 2 ** shift) % 256).join('.');
}

export function toBinaryOctets(value: number): string {
  return intToIp(value)
    .split('.')
    .map(octet => Number(octet).toString(2).padStart(8, '0'))
    .join('.');
}

export function prefixToMaskInt(prefix: number): number {
  if (prefix <= 0) {
    return 0;
  }
  return (0xffffffff << (32 - prefix)) >>> 0;
}

/** Converts a dotted mask (e.g. 255.255.255.0) into a prefix length, or null if it is not a valid contiguous mask. */
export function maskIntToPrefix(maskInt: number): number | null {
  for (let prefix = 0; prefix <= 32; prefix++) {
    if (prefixToMaskInt(prefix) === maskInt) {
      return prefix;
    }
  }
  return null;
}

/** Accepts either a CIDR prefix ("24", "/24") or a dotted subnet mask ("255.255.255.0"). */
export function parseSubnetInput(value: string): number {
  const trimmed = value.trim().replace(/^\//, '');
  assertValid(trimmed.length > 0, 'Enter a subnet mask or CIDR prefix.');

  if (/^\d{1,2}$/.test(trimmed)) {
    const prefix = Number(trimmed);
    assertValid(prefix >= 0 && prefix <= 32, 'CIDR prefix must be between 0 and 32.');
    return prefix;
  }

  const octets = parseIPv4(trimmed);
  assertValid(octets !== null, 'Subnet must be a CIDR prefix (e.g. 24) or dotted mask (e.g. 255.255.255.0).');

  const prefix = maskIntToPrefix(ipToInt(octets!));
  assertValid(prefix !== null, 'Subnet mask bits must be contiguous (e.g. 255.255.255.0).');

  return prefix!;
}

export function ipClassOf(firstOctet: number): IpClass {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D';
  return 'E';
}

export function classifyIpAddress(ip: string): IpClassification {
  const octets = parseIPv4(ip);
  assertValid(octets !== null, 'Enter a valid IPv4 address (e.g. 192.168.1.10).');

  const value = ipToInt(octets!);
  const match = IP_SPECIAL_RANGES.find(range => {
    const rangeOctets = parseIPv4(range.network)!;
    const rangeInt = ipToInt(rangeOctets);
    const mask = prefixToMaskInt(range.prefix);
    return (value & mask) >>> 0 === (rangeInt & mask) >>> 0;
  });

  if (match) {
    return { type: match.type, label: match.label, description: match.description };
  }

  return {
    type: 'public',
    label: 'Public',
    description: 'Globally routable (public) address space.',
  };
}

export function reverseDnsOf(ip: string): string {
  const octets = parseIPv4(ip);
  assertValid(octets !== null, 'Enter a valid IPv4 address (e.g. 192.168.1.10).');
  return [...octets!].reverse().join('.') + '.in-addr.arpa';
}

export function calculateSubnet(ipInput: string, subnetInput: string): SubnetCalculationResult {
  const octets = parseIPv4(ipInput);
  assertValid(octets !== null, 'Enter a valid IPv4 address (e.g. 192.168.1.10).');

  const prefixLength = parseSubnetInput(subnetInput);

  const ipInt = ipToInt(octets!);
  const maskInt = prefixToMaskInt(prefixLength);
  const wildcardInt = (~maskInt) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;

  const totalAddresses = 2 ** (32 - prefixLength);
  let firstHostInt = networkInt;
  let lastHostInt = broadcastInt;
  let usableHosts = Math.max(totalAddresses - 2, 0);

  if (prefixLength === 32) {
    usableHosts = 1;
    firstHostInt = networkInt;
    lastHostInt = networkInt;
  } else if (prefixLength === 31) {
    // RFC 3021 point-to-point links use both addresses as hosts.
    usableHosts = 2;
    firstHostInt = networkInt;
    lastHostInt = broadcastInt;
  } else {
    firstHostInt = networkInt + 1;
    lastHostInt = broadcastInt - 1;
  }

  return {
    ipAddress: intToIp(ipInt),
    ipBinary: toBinaryOctets(ipInt),
    prefixLength,
    subnetMask: intToIp(maskInt),
    subnetMaskBinary: toBinaryOctets(maskInt),
    wildcardMask: intToIp(wildcardInt),
    cidr: `${intToIp(ipInt)}/${prefixLength}`,
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstHost: intToIp(firstHostInt),
    lastHost: intToIp(lastHostInt),
    totalAddresses,
    usableHosts,
    ipClass: ipClassOf(octets![0]),
    classification: classifyIpAddress(intToIp(ipInt)),
    reverseDns: reverseDnsOf(intToIp(ipInt)),
  };
}

@Injectable({
  providedIn: 'root',
})
export class SubnetCalculatorService {
  calculate(ipInput: string, subnetInput: string): SubnetCalculationResult {
    return calculateSubnet(ipInput, subnetInput);
  }

  classify(ipInput: string): IpClassification {
    return classifyIpAddress(ipInput);
  }
}
