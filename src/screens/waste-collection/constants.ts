import {ViewStyle} from 'react-native';

export const DASHBOARD_INVENTORY_COLUMNS = ['55DF', '55DM', '30DF', '30DM', 'Tote', '18DF', '8DF', 'Other'];

export const SIMULATED_CONTAINERS_BY_ORDER_INDEX: Record<string, number>[] = [
  { '55DF': 2, '55DM': 0, '30DF': 1, '30DM': 0, 'Tote': 0, '18DF': 1, '8DF': 0, 'Other': 0 },
  { '55DF': 0, '55DM': 1, '30DF': 2, '30DM': 0, 'Tote': 1, '18DF': 0, '8DF': 0, 'Other': 1 },
  { '55DF': 1, '55DM': 1, '30DF': 0, '30DM': 1, 'Tote': 2, '18DF': 0, '8DF': 1, 'Other': 0 },
  { '55DF': 3, '55DM': 0, '30DF': 1, '30DM': 0, 'Tote': 0, '18DF': 2, '8DF': 0, 'Other': 1 },
  { '55DF': 0, '55DM': 2, '30DF': 0, '30DM': 1, 'Tote': 3, '18DF': 0, '8DF': 0, 'Other': 0 },
  { '55DF': 2, '55DM': 0, '30DF': 2, '30DM': 1, 'Tote': 1, '18DF': 0, '8DF': 1, 'Other': 0 },
  { '55DF': 1, '55DM': 1, '30DF': 1, '30DM': 0, 'Tote': 2, '18DF': 1, '8DF': 0, 'Other': 1 },
  { '55DF': 0, '55DM': 0, '30DF': 3, '30DM': 2, 'Tote': 0, '18DF': 1, '8DF': 2, 'Other': 0 },
  { '55DF': 2, '55DM': 1, '30DF': 0, '30DM': 0, 'Tote': 1, '18DF': 0, '8DF': 0, 'Other': 0 },
  { '55DF': 1, '55DM': 0, '30DF': 1, '30DM': 1, 'Tote': 2, '18DF': 2, '8DF': 1, 'Other': 1 },
];

export const CONTAINER_CODE_TO_PROJECTED_COLUMN: Record<string, string> = {
  '55G': '55DF',
  '30G': '30DF',
  '85G': '55DM',
  '95T': 'Tote',
  '1YD': 'Tote',
  '2YD': 'Tote',
  '4YD': 'Tote',
  '5G': '30DM',
  'CYL': 'Other',
};

export const BUSINESS_TYPE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string }> = {
  'waste services': { label: 'WS', bg: '#ea580c22', border: '#ea580c', text: '#ea580c' },
  retail: { label: 'RE', bg: '#2563eb22', border: '#2563eb', text: '#2563eb' },
  healthcare: { label: 'HD', bg: '#0d948822', border: '#0d9488', text: '#0d9488' },
  pharmacy: { label: 'RX', bg: '#7c3aed22', border: '#7c3aed', text: '#7c3aed' },
  dea: { label: 'DE', bg: '#dc262622', border: '#dc2626', text: '#dc2626' },
};

export function getBusinessTypeStyle(orderType: string | undefined): { label: string; bg: string; border: string; text: string } {
  const key = (orderType || 'waste services').toLowerCase().trim();
  return BUSINESS_TYPE_CONFIG[key] ?? BUSINESS_TYPE_CONFIG['waste services'];
}

export const INVENTORY_SUMMARY_STORAGE_KEY = '@inventory_summary';

export const DEFAULT_INVENTORY_SUMMARY: Record<string, number> = {
  '55DF': 6, '55DM': 7, '30DF': 8, '30DM': 4, 'Tote': 0, '18DF': 16, '8DF': 10, 'Other': 0,
};

export const ROUTE_IDS = ['WA01', 'WA02', 'OR01', 'CA01', 'CA02', 'CA03', 'AZ01', 'CO01', 'TX01', 'IL01'];
export const DEFAULT_ROUTE_ID = 'CO01';

export const APPROVED_TRANSFER_LOCATIONS = [
  'Main Transfer Station - Downtown',
  'Northside Waste Facility',
  'Southside Recycling Center',
  'East End Transfer Point',
  'West Industrial Waste Hub',
  'Central Processing Facility',
  'Riverside Drop-Off Site',
  'Highway 101 Transfer Station',
  'Airport Road Waste Center',
  'Port Authority Facility',
  'Mountain View Disposal Site',
  'Valley Waste Management',
  'Coastal Transfer Station',
  'Inland Processing Center',
  'Metro Waste Facility',
  'Suburban Drop Point',
  'Urban Collection Center',
  'Regional Transfer Hub',
  'City Main Facility',
  'Industrial Park Station',
];

export const FOOTER_NAV_ICON_COLOR = '#0092bc';
