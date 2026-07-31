export type DeviceId =
  | 'scale'
  | 'label-printer'
  | 'document-printer';

export type DeviceConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'unavailable';

export interface ConnectedDevice {
  id: DeviceId;
  name: string;
  description: string;
  icon: string;
  status: DeviceConnectionStatus;
  /** Optional detail shown under the device name (e.g. model or connection type). */
  detail?: string;
  lastUpdated: number;
}

export type DevicesListener = (devices: ConnectedDevice[]) => void;

const DEVICE_CATALOG: Array<
  Pick<ConnectedDevice, 'id' | 'name' | 'description' | 'icon' | 'detail'>
> = [
  {
    id: 'scale',
    name: 'Truck scale',
    description: 'Live weight readings during container entry',
    // Kitchen-scale glyph (Material Icons `scale`)
    icon: 'scale',
    detail: 'Bluetooth · Simulated',
  },
  {
    id: 'label-printer',
    name: 'Label printer',
    description: 'Shipping label printing at container summary',
    icon: 'print',
    detail: 'Zebra · Bluetooth',
  },
  {
    id: 'document-printer',
    name: 'Document printer',
    description: 'Manifest, BOL, and LDR printing',
    icon: 'description',
    detail: 'Office printer · Network',
  },
];

class DeviceStatusService {
  private statuses = new Map<DeviceId, DeviceConnectionStatus>([
    ['scale', 'connected'],
    ['label-printer', 'disconnected'],
    ['document-printer', 'disconnected'],
  ]);

  private lastUpdated = new Map<DeviceId, number>();
  private listeners: DevicesListener[] = [];

  constructor() {
    const now = Date.now();
    DEVICE_CATALOG.forEach(device => {
      this.lastUpdated.set(device.id, now);
    });
  }

  getDevices(): ConnectedDevice[] {
    const now = Date.now();
    return DEVICE_CATALOG.map(device => ({
      ...device,
      status: this.statuses.get(device.id) ?? 'unavailable',
      lastUpdated: this.lastUpdated.get(device.id) ?? now,
    }));
  }

  getDevice(id: DeviceId): ConnectedDevice | undefined {
    return this.getDevices().find(device => device.id === id);
  }

  getConnectedCount(): number {
    return this.getDevices().filter(device => device.status === 'connected')
      .length;
  }

  getDisconnectedCount(): number {
    return this.getDevices().filter(
      device =>
        device.status === 'disconnected' || device.status === 'unavailable',
    ).length;
  }

  getDeviceCount(): number {
    return DEVICE_CATALOG.length;
  }

  hasConnectingDevice(): boolean {
    return this.getDevices().some(device => device.status === 'connecting');
  }

  isScaleConnected(): boolean {
    return this.statuses.get('scale') === 'connected';
  }

  setDeviceStatus(id: DeviceId, status: DeviceConnectionStatus): void {
    this.statuses.set(id, status);
    this.lastUpdated.set(id, Date.now());
    this.notifyListeners();
  }

  setScaleConnected(connected: boolean): void {
    this.setDeviceStatus('scale', connected ? 'connected' : 'disconnected');
  }

  /** Simulated reconnect for peripherals without native integration yet. */
  async reconnectDevice(id: DeviceId): Promise<void> {
    const device = DEVICE_CATALOG.find(entry => entry.id === id);
    if (!device) {
      return;
    }

    this.setDeviceStatus(id, 'connecting');
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Printers stay disconnected until native modules exist; scale reconnects.
    if (id === 'scale') {
      this.setDeviceStatus(id, 'connected');
      return;
    }

    this.setDeviceStatus(id, 'disconnected');
  }

  onDevicesChange(listener: DevicesListener): () => void {
    this.listeners.push(listener);
    listener(this.getDevices());
    return () => {
      this.listeners = this.listeners.filter(entry => entry !== listener);
    };
  }

  private notifyListeners(): void {
    const devices = this.getDevices();
    this.listeners.forEach(listener => listener(devices));
  }
}

export const deviceStatusService = new DeviceStatusService();

export function formatDeviceStatusLabel(
  status: DeviceConnectionStatus,
): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'disconnected':
      return 'Disconnected';
    case 'connecting':
      return 'Connecting…';
    default:
      return 'Unavailable';
  }
}

export function formatDeviceLastUpdated(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 60_000) {
    return 'Just now';
  }
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
}
