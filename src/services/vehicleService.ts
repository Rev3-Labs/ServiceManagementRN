import {serviceCenterService} from './serviceCenterService';

export interface Vehicle {
  id: string;
  number: string;
  description: string;
  type: string;
  serviceCenter?: string;
  isActive: boolean;
}

export interface Truck extends Vehicle {
  type: 'truck';
}

export interface Trailer extends Vehicle {
  type: 'trailer';
}

// Mock FleetIO data - In production, this would come from FleetIO API
const MOCK_TRUCKS: Truck[] = [
  {id: 'truck-1', number: 'TRK-1045', description: 'Ford F-550 Service Truck', type: 'truck', serviceCenter: 'Dallas Service Center', isActive: true},
  {id: 'truck-2', number: 'TRK-1046', description: 'Ford F-550 Service Truck', type: 'truck', serviceCenter: 'Dallas Service Center', isActive: true},
  {id: 'truck-3', number: 'TRK-1047', description: 'Freightliner M2 Service Truck', type: 'truck', serviceCenter: 'Dallas Service Center', isActive: true},
  {id: 'truck-4', number: 'TRK-2045', description: 'Ford F-550 Service Truck', type: 'truck', serviceCenter: 'Houston Service Center', isActive: true},
  {id: 'truck-5', number: 'TRK-2046', description: 'Freightliner M2 Service Truck', type: 'truck', serviceCenter: 'Houston Service Center', isActive: true},
  {id: 'truck-6', number: 'TRK-3045', description: 'Ford F-550 Service Truck', type: 'truck', serviceCenter: 'Austin Service Center', isActive: true},
  {id: 'truck-7', number: 'TRK-3046', description: 'Freightliner M2 Service Truck', type: 'truck', serviceCenter: 'Austin Service Center', isActive: true},
];

const MOCK_TRAILERS: Trailer[] = [
  {id: 'trailer-1', number: 'TRL-0892', description: '20ft Flatbed Trailer', type: 'trailer', isActive: true},
  {id: 'trailer-2', number: 'TRL-0893', description: '20ft Flatbed Trailer', type: 'trailer', isActive: true},
  {id: 'trailer-3', number: 'TRL-0894', description: '24ft Enclosed Trailer', type: 'trailer', isActive: true},
  {id: 'trailer-4', number: 'TRL-0895', description: '20ft Flatbed Trailer', type: 'trailer', isActive: true},
  {id: 'trailer-5', number: 'TRL-0896', description: '24ft Enclosed Trailer', type: 'trailer', isActive: true},
  {id: 'trailer-6', number: 'TRL-0897', description: '30ft Flatbed Trailer', type: 'trailer', isActive: true},
];

class VehicleService {
  /**
   * Get all active trucks for a service center
   */
  getTrucksForServiceCenter(serviceCenterName: string | null): Truck[] {
    if (!serviceCenterName) {
      return MOCK_TRUCKS.filter(t => t.isActive);
    }
    return MOCK_TRUCKS.filter(
      t => t.isActive && (t.serviceCenter === serviceCenterName || !t.serviceCenter)
    );
  }

  /**
   * Get all active trailers
   */
  getAllTrailers(): Trailer[] {
    return MOCK_TRAILERS.filter(t => t.isActive);
  }

  /**
   * Search trucks by number or description
   */
  searchTrucks(serviceCenterName: string | null, query: string): Truck[] {
    const trucks = this.getTrucksForServiceCenter(serviceCenterName);
    if (!query.trim()) {
      return trucks;
    }
    const lowerQuery = query.toLowerCase();
    return trucks.filter(
      t =>
        t.number.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Search trailers by number or description
   */
  searchTrailers(query: string): Trailer[] {
    const trailers = this.getAllTrailers();
    if (!query.trim()) {
      return trailers;
    }
    const lowerQuery = query.toLowerCase();
    return trailers.filter(
      t =>
        t.number.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get truck by ID
   */
  getTruckById(id: string): Truck | null {
    return MOCK_TRUCKS.find(t => t.id === id && t.isActive) || null;
  }

  /**
   * Get trailer by ID
   */
  getTrailerById(id: string): Trailer | null {
    return MOCK_TRAILERS.find(t => t.id === id && t.isActive) || null;
  }

  /**
   * Get truck by number
   */
  getTruckByNumber(number: string): Truck | null {
    return MOCK_TRUCKS.find(t => t.number === number && t.isActive) || null;
  }

  /**
   * Get trailer by number
   */
  getTrailerByNumber(number: string): Trailer | null {
    return MOCK_TRAILERS.find(t => t.number === number && t.isActive) || null;
  }

  /**
   * Validate truck exists and is active
   */
  validateTruck(truckId: string): boolean {
    return MOCK_TRUCKS.some(t => t.id === truckId && t.isActive);
  }

  /**
   * Validate trailer exists and is active
   */
  validateTrailer(trailerId: string | null): boolean {
    if (!trailerId) return true; // No trailer is valid
    return MOCK_TRAILERS.some(t => t.id === trailerId && t.isActive);
  }

  /**
   * Format truck display: "[Truck #] - [Description/Type]"
   */
  formatTruckDisplay(truck: Truck): string {
    return `${truck.number}`;
  }

  /**
   * Format trailer display: "[Trailer #] - [Type]"
   */
  formatTrailerDisplay(trailer: Trailer): string {
    return `${trailer.number} - ${trailer.description}`;
  }
}

// Export singleton instance
export const vehicleService = new VehicleService();
