/**
 * No-Ship reason codes per Rule 52 (FR-3a.UI.8.3)
 * Used when a technician marks a service type as No-Ship for audit and billing.
 */

export const NO_SHIP_REASON_CODES = {
  'NS-GEN': 'Generator Status Issue',
  'NS-DOC': 'Incomplete Paperwork',
  'NS-SAF': 'Safety Concern',
  'NS-EQP': 'Equipment Not Available',
  'NS-CUS': 'Customer Request',
  'NS-ACC': 'Site Access Issue',
  'NS-OTH': 'Other (requires notes)',
} as const;

export type NoShipReasonCode = keyof typeof NO_SHIP_REASON_CODES;

export interface NoShipRecord {
  reasonCode: NoShipReasonCode;
  notes?: string; // Required when reasonCode is NS-OTH (min 10 characters)
}

export const NO_SHIP_OTHER_CODE: NoShipReasonCode = 'NS-OTH';
export const MIN_OTHER_NOTES_LENGTH = 10;

export function getNoShipReasonLabel(code: NoShipReasonCode): string {
  return NO_SHIP_REASON_CODES[code] ?? code;
}

export function isOtherReason(code: string): boolean {
  return code === NO_SHIP_OTHER_CODE;
}
