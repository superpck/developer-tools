import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CIDR_CHEAT_SHEET,
  IpAddressType,
  SubnetCalculationResult,
  calculateSubnet,
} from '../../services/subnet-calculator.service';

interface ClassificationStyle {
  badgeClasses: string;
  icon: string;
}

const CLASSIFICATION_STYLES: Record<IpAddressType, ClassificationStyle> = {
  private: { badgeClasses: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: '🔒' },
  public: { badgeClasses: 'border-cyan-200 bg-cyan-50 text-cyan-700', icon: '🌐' },
  loopback: { badgeClasses: 'border-violet-200 bg-violet-50 text-violet-700', icon: '🏠' },
  'link-local': { badgeClasses: 'border-amber-200 bg-amber-50 text-amber-700', icon: '📡' },
  multicast: { badgeClasses: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700', icon: '📣' },
  reserved: { badgeClasses: 'border-slate-200 bg-slate-100 text-slate-700', icon: '🚧' },
  cgnat: { badgeClasses: 'border-indigo-200 bg-indigo-50 text-indigo-700', icon: '🛰️' },
  documentation: { badgeClasses: 'border-sky-200 bg-sky-50 text-sky-700', icon: '📄' },
  benchmarking: { badgeClasses: 'border-teal-200 bg-teal-50 text-teal-700', icon: '⏱️' },
  'this-network': { badgeClasses: 'border-slate-200 bg-slate-100 text-slate-700', icon: '❔' },
  broadcast: { badgeClasses: 'border-rose-200 bg-rose-50 text-rose-700', icon: '📢' },
  'protocol-assignment': { badgeClasses: 'border-slate-200 bg-slate-100 text-slate-700', icon: '🧩' },
};

@Component({
  selector: 'app-subnet-calculator',
  imports: [CommonModule, FormsModule],
  templateUrl: './subnet-calculator.html',
  styleUrl: './subnet-calculator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubnetCalculator {
  readonly ipAddress = signal('192.168.1.10');
  readonly subnet = signal('24');
  readonly showCheatSheet = signal(false);

  readonly cheatSheet = CIDR_CHEAT_SHEET;

  readonly commonPrefixes: ReadonlyArray<string> = ['8', '16', '24', '25', '26', '27', '28', '30', '32'];

  private readonly calculation = computed<{ result: SubnetCalculationResult | null; error: string | null }>(() => {
    const ip = this.ipAddress().trim();
    const subnet = this.subnet().trim();

    if (!ip || !subnet) {
      return { result: null, error: null };
    }

    try {
      return { result: calculateSubnet(ip, subnet), error: null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : String(error) };
    }
  });

  readonly result = computed(() => this.calculation().result);
  readonly errorMessage = computed(() => this.calculation().error);

  readonly classificationStyle = computed<ClassificationStyle>(() => {
    const type = this.result()?.classification.type ?? 'public';
    return CLASSIFICATION_STYLES[type];
  });

  readonly networkBitRatio = computed(() => {
    const result = this.result();
    return result ? Math.round((result.prefixLength / 32) * 100) : 0;
  });

  /** Splits each binary octet into its network-bit and host-bit portions for the bit-layout view. */
  readonly bitLayout = computed(() => {
    const result = this.result();
    if (!result) {
      return [];
    }

    const prefixLength = result.prefixLength;
    return result.ipBinary.split('.').map((octetBits, index) => {
      const networkBitCount = Math.min(Math.max(prefixLength - index * 8, 0), 8);
      return {
        networkBits: octetBits.slice(0, networkBitCount),
        hostBits: octetBits.slice(networkBitCount),
      };
    });
  });

  setSubnetPrefix(prefix: string) {
    this.subnet.set(prefix);
  }

  toggleCheatSheet() {
    this.showCheatSheet.update(value => !value);
  }
}
