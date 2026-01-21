/**
 * Service Type definitions with IDs and names
 * Maps Service Type IDs to their display names
 */

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
}

// HCS (Healthcare Services) Service Types
export const HCS_SERVICE_TYPES: Record<string, ServiceType> = {
  'HCS-RMW': {
    id: 'HCS-RMW',
    name: 'HCS - Regulated Medical Waste',
    description: 'Collection and disposal of regulated medical waste (biohazard, sharps, pathological)',
  },
  'HCS-PHARM': {
    id: 'HCS-PHARM',
    name: 'HCS - Pharmaceutical Waste',
    description: 'Non-controlled pharmaceutical waste collection',
  },
  'HCS-CTRL': {
    id: 'HCS-CTRL',
    name: 'HCS - Controlled Substances',
    description: 'DEA-regulated controlled substance destruction (replaces DEA type)',
  },
  'HCS-CHEMO': {
    id: 'HCS-CHEMO',
    name: 'HCS - Chemotherapy Waste',
    description: 'Hazardous pharmaceutical/chemotherapy waste',
  },
  'HCS-PATH': {
    id: 'HCS-PATH',
    name: 'HCS - Pathological Waste',
    description: 'Anatomical and pathological waste handling',
  },
  'HCS-SHARPS': {
    id: 'HCS-SHARPS',
    name: 'HCS - Sharps Management',
    description: 'Sharps container exchange and disposal',
  },
};

// WS (Waste Services) Service Types
export const WS_SERVICE_TYPES: Record<string, ServiceType> = {
  'WS-HAZ': {
    id: 'WS-HAZ',
    name: 'WS - Hazardous Waste',
    description: 'General hazardous waste pickup and disposal',
  },
  'WS-NHAZ': {
    id: 'WS-NHAZ',
    name: 'WS - Non-Hazardous Waste',
    description: 'Non-hazardous industrial waste services',
  },
  'WS-UNIV': {
    id: 'WS-UNIV',
    name: 'WS - Universal Waste',
    description: 'Batteries, lamps, electronics, mercury devices',
  },
  'WS-RETAIL': {
    id: 'WS-RETAIL',
    name: 'WS - Retail Waste Services',
    description: 'Retail location waste management (replaces RETAIL type)',
  },
  'WS-LABPACK': {
    id: 'WS-LABPACK',
    name: 'WS - Lab Pack Services',
    description: 'Laboratory chemical consolidation and disposal',
  },
  'WS-EMERG': {
    id: 'WS-EMERG',
    name: 'WS - Emergency Response',
    description: 'Spill response and emergency waste services',
  },
};

// Combined service types map
export const SERVICE_TYPES: Record<string, ServiceType> = {
  ...HCS_SERVICE_TYPES,
  ...WS_SERVICE_TYPES,
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
