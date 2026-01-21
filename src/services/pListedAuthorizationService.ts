import {safeAsyncStorage} from '../utils/storage';

const AUTHORIZATIONS_KEY = '@p_listed_authorizations';

export type PListedCode = `P${string}`; // P001-P205

export type AuthorizationStatus = 'active' | 'suspended' | 'expired' | 'revoked';

export interface PListedAuthorization {
  id: string; // Format: PAUTH-YYYYMMDD-XXXX
  technicianUsername: string;
  generatorIds: string[]; // EPA IDs or generator identifiers
  pCodes: PListedCode[];
  effectiveDate: number; // Timestamp
  expirationDate: number; // Timestamp
  trainingDate: number | null; // Timestamp
  status: AuthorizationStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

class PListedAuthorizationService {
  private authorizations: Map<string, PListedAuthorization> = new Map();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await this.loadAuthorizations();
  }

  private async loadAuthorizations() {
    try {
      const stored = await safeAsyncStorage.getItem(AUTHORIZATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([id, auth]) => {
          this.authorizations.set(id, auth as PListedAuthorization);
        });
      } else {
        // Initialize with some mock authorizations for testing
        await this.initializeMockAuthorizations();
      }
    } catch (error) {
      console.error('[PListedAuthorizationService] Error loading authorizations:', error);
    }
  }

  private async saveAuthorizations() {
    try {
      const authObj: Record<string, PListedAuthorization> = {};
      this.authorizations.forEach((auth, id) => {
        authObj[id] = auth;
      });
      await safeAsyncStorage.setItem(AUTHORIZATIONS_KEY, JSON.stringify(authObj));
    } catch (error) {
      console.error('[PListedAuthorizationService] Error saving authorizations:', error);
    }
  }

  private async initializeMockAuthorizations() {
    const now = Date.now();
    const oneYearFromNow = now + 365 * 24 * 60 * 60 * 1000;
    
    const mockAuths: PListedAuthorization[] = [
      {
        id: `PAUTH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`,
        technicianUsername: 'john.smith',
        generatorIds: ['EPA123456789', 'EPA987654321'],
        pCodes: ['P001', 'P012', 'P075', 'P098'],
        effectiveDate: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        expirationDate: oneYearFromNow,
        trainingDate: now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
        status: 'active',
        notes: 'Full authorization for acute hazardous waste handling',
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now - 30 * 24 * 60 * 60 * 1000,
      },
      {
        id: `PAUTH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0002`,
        technicianUsername: 'john.smith',
        generatorIds: ['EPA111222333'],
        pCodes: ['P001', 'P002'],
        effectiveDate: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        expirationDate: now + 355 * 24 * 60 * 60 * 1000, // ~1 year from now
        trainingDate: now - 20 * 24 * 60 * 60 * 1000, // 20 days ago
        status: 'active',
        notes: 'Limited authorization for specific generator',
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
        updatedAt: now - 10 * 24 * 60 * 60 * 1000,
      },
    ];

    mockAuths.forEach(auth => {
      this.authorizations.set(auth.id, auth);
    });
    await this.saveAuthorizations();
  }

  /**
   * Get all authorizations for a technician
   */
  getAuthorizationsForTechnician(username: string): PListedAuthorization[] {
    return Array.from(this.authorizations.values()).filter(
      auth => auth.technicianUsername === username
    );
  }

  /**
   * Get active authorizations for a technician
   */
  getActiveAuthorizationsForTechnician(username: string): PListedAuthorization[] {
    const now = Date.now();
    return this.getAuthorizationsForTechnician(username).filter(
      auth =>
        auth.status === 'active' &&
        auth.effectiveDate <= now &&
        auth.expirationDate >= now
    );
  }

  /**
   * Validate authorization for P-Listed waste handling
   */
  validateAuthorization(
    username: string,
    generatorId: string,
    pCodes: PListedCode[],
  ): {
    authorized: boolean;
    authorization: PListedAuthorization | null;
    failureReason?: string;
  } {
    const activeAuths = this.getActiveAuthorizationsForTechnician(username);
    const now = Date.now();

    // Find authorization that covers this generator and all P-codes
    for (const auth of activeAuths) {
      // Check generator coverage
      if (!auth.generatorIds.includes(generatorId)) {
        continue;
      }

      // Check all P-codes are covered
      const allCodesCovered = pCodes.every(code => auth.pCodes.includes(code));
      if (!allCodesCovered) {
        const missingCodes = pCodes.filter(code => !auth.pCodes.includes(code));
        return {
          authorized: false,
          authorization: null,
          failureReason: `Not authorized for P-code(s): ${missingCodes.join(', ')}`,
        };
      }

      // Check expiration
      if (auth.expirationDate < now) {
        const expDate = new Date(auth.expirationDate).toLocaleDateString();
        return {
          authorized: false,
          authorization: null,
          failureReason: `Authorization expired on ${expDate}`,
        };
      }

      // Check status
      if (auth.status !== 'active') {
        return {
          authorized: false,
          authorization: null,
          failureReason: `Authorization is ${auth.status}`,
        };
      }

      // All checks passed
      return {
        authorized: true,
        authorization: auth,
      };
    }

    // No matching authorization found
    return {
      authorized: false,
      authorization: null,
      failureReason: 'Not authorized for P-Listed waste',
    };
  }

  /**
   * Check if a waste profile contains P-Listed codes
   */
  extractPListedCodes(profile: {codes?: string[]; wasteCodes?: string[]}): PListedCode[] {
    const codes = profile.codes || profile.wasteCodes || [];
    return codes.filter(
      code => typeof code === 'string' && /^P\d{3}$/.test(code)
    ) as PListedCode[];
  }

  /**
   * Create a new authorization (for CORE admin interface - mock for now)
   */
  async createAuthorization(
    technicianUsername: string,
    generatorIds: string[],
    pCodes: PListedCode[],
    effectiveDate: number,
    expirationDate: number,
    trainingDate: number | null,
    status: AuthorizationStatus = 'active',
    notes?: string,
  ): Promise<PListedAuthorization> {
    const now = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const id = `PAUTH-${dateStr}-${randomSuffix}`;

    const authorization: PListedAuthorization = {
      id,
      technicianUsername,
      generatorIds,
      pCodes,
      effectiveDate,
      expirationDate,
      trainingDate,
      status,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    this.authorizations.set(id, authorization);
    await this.saveAuthorizations();

    return authorization;
  }

  /**
   * Update authorization status
   */
  async updateAuthorizationStatus(
    authorizationId: string,
    status: AuthorizationStatus,
  ): Promise<void> {
    const auth = this.authorizations.get(authorizationId);
    if (auth) {
      auth.status = status;
      auth.updatedAt = Date.now();
      await this.saveAuthorizations();
    }
  }

  /**
   * Get all authorizations (for admin interface)
   */
  getAllAuthorizations(): PListedAuthorization[] {
    return Array.from(this.authorizations.values());
  }
}

// Export singleton instance
export const pListedAuthorizationService = new PListedAuthorizationService();
