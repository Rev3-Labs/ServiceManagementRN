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
  WCS: {
    id: 'WCS',
    name: 'Waste Container Service',
    description: 'Container exchange, delivery, and related container service work',
  },
  WS: {
    id: 'WS',
    name: 'Waste Services',
    description: 'General waste collection and disposal services',
  },
  HCS: {
    id: 'HCS',
    name: 'Healthcare Collection Service',
    description:
      'Healthcare waste collection including regulated medical, pharmaceutical, and biohazard waste',
  },
  SDO: {
    id: 'SDO',
    name: 'Supplies Drop Off',
    description:
      'Deliver materials and equipment to the customer site; containers track supplies only',
  },
};

export const SUPPLIES_DROP_OFF_SERVICE_TYPE_ID = 'SDO';

export function isSuppliesDropOffServiceType(serviceTypeId: string): boolean {
  return serviceTypeId === SUPPLIES_DROP_OFF_SERVICE_TYPE_ID;
}

export function getServiceEntryStep(
  serviceTypeId: string,
  isNoShip = false,
): 'container-summary' | 'stream-selection' {
  return isSuppliesDropOffServiceType(serviceTypeId) || isNoShip
    ? 'container-summary'
    : 'stream-selection';
}

export function shouldSkipContainerEntryFlow(
  serviceTypeId: string,
  isNoShip = false,
): boolean {
  return getServiceEntryStep(serviceTypeId, isNoShip) === 'container-summary';
}

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
