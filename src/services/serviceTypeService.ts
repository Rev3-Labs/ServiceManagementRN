/**
 * Service Type definitions with IDs and names
 * Maps Service Type IDs to their display names
 */

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
}

/**
 * Canonical Service Type IDs (program codes)
 *
 * Per UI requirements: use these codes as the IDs everywhere.
 */
export const SERVICE_TYPES: Record<string, ServiceType> = {
  RX: {
    id: 'RX',
    name: 'Regulated Medical Waste',
    description:
      'Collection and disposal of regulated medical waste (biohazard, sharps, pathological)',
  },
  HZ: {
    id: 'HZ',
    name: 'Hazardous Waste',
    description: 'General hazardous waste pickup and disposal',
  },
  CX: {
    id: 'CX',
    name: 'Chemotherapy Waste',
    description: 'Hazardous pharmaceutical/chemotherapy waste',
  },
  HD: {
    id: 'HD',
    name: 'High-Difficulty / Specialty Handling',
    description:
      'Special handling workflows (e.g., lab pack, emergency response, specialty pickups)',
  },
  FC: {
    id: 'FC',
    name: 'Facility Cleanup / Container Service',
    description: 'Sharps/container exchange and related container service work',
  },
  PH: {
    id: 'PH',
    name: 'Pharmaceutical Waste',
    description: 'Non-controlled pharmaceutical waste collection',
  },
  DE: {
    id: 'DE',
    name: 'DEA / Controlled Substances',
    description: 'DEA-regulated controlled substance destruction',
  },
  RE: {
    id: 'RE',
    name: 'Retail Waste Services',
    description: 'Retail location waste management services',
  },
};

class ServiceTypeService {
  /**
   * Get service type by ID
   */
  getServiceType(id: string): ServiceType | undefined {
    return SERVICE_TYPES[id];
  }

  /**
   * Get service type name by ID, fallback to ID if not found
   */
  getServiceTypeName(id: string): string {
    return SERVICE_TYPES[id]?.name || id;
  }

  /**
   * Format service type for dropdown display: [ID] - [Name]
   */
  formatForDropdown(id: string): string {
    const serviceType = SERVICE_TYPES[id];
    if (serviceType) {
      return `${serviceType.id} - ${serviceType.name}`;
    }
    return id;
  }

  /**
   * Format service type for compact display: [ID] - [Name]
   */
  formatForCompact(id: string): string {
    return this.formatForDropdown(id);
  }

  /**
   * Format service type for order details: [ID] - [Name]
   */
  formatForOrderDetails(id: string): string {
    return this.formatForDropdown(id);
  }

  /**
   * Format service type for order summary: [ID]: [Name]
   */
  formatForOrderSummary(id: string): string {
    const serviceType = SERVICE_TYPES[id];
    if (serviceType) {
      return `${serviceType.id}: ${serviceType.name}`;
    }
    return id;
  }

  /**
   * Format service type for badge (ID only, with tooltip showing full name)
   */
  formatForBadge(id: string): string {
    return id;
  }

  /**
   * Get all service types as array
   */
  getAllServiceTypes(): ServiceType[] {
    return Object.values(SERVICE_TYPES);
  }

  /**
   * Search service types by ID or name
   */
  searchServiceTypes(query: string): ServiceType[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return this.getAllServiceTypes();
    }

    return this.getAllServiceTypes().filter(
      serviceType =>
        serviceType.id.toLowerCase().includes(lowerQuery) ||
        serviceType.name.toLowerCase().includes(lowerQuery) ||
        (serviceType.description &&
          serviceType.description.toLowerCase().includes(lowerQuery)),
    );
  }

  /**
   * Check if a service type ID is valid
   */
  isValidServiceType(id: string): boolean {
    return id in SERVICE_TYPES;
  }
}

// Export singleton instance
export const serviceTypeService = new ServiceTypeService();
