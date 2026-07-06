import {OrderData} from '../../types/wasteCollection';
import {ServiceTypeTimeEntry} from '../../services/serviceTypeTimeService';
import {UNASSIGNED_SERVICE_TYPE_ID} from './containerGrouping';

/** True when every program on the order is complete (timed or no-ship). */
export function areAllServiceRequestsComplete(
  order: OrderData,
  serviceTypeTimeEntries: Map<string, ServiceTypeTimeEntry>,
  isServiceTypeNoShip: (orderNumber: string, serviceTypeId: string) => boolean,
): boolean {
  return order.programs.every(serviceTypeId => {
    if (isServiceTypeNoShip(order.orderNumber, serviceTypeId)) {
      return true;
    }
    const entry = serviceTypeTimeEntries.get(serviceTypeId);
    return entry?.startTime != null && entry?.endTime != null;
  });
}

/**
 * Review-mode assignment: multiple service requests, all complete, user is in the
 * manifest-completion phase, and no service type timer is actively running.
 */
export function canAssignServiceRequestsInReview(
  order: OrderData | null,
  inManifestCompletion: boolean,
  serviceTypeTimeEntries: Map<string, ServiceTypeTimeEntry>,
  isServiceTypeNoShip: (orderNumber: string, serviceTypeId: string) => boolean,
  activeServiceTypeTimer: string | null,
): boolean {
  if (!order || !inManifestCompletion || order.programs.length < 2) {
    return false;
  }
  if (activeServiceTypeTimer) {
    return false;
  }
  return areAllServiceRequestsComplete(
    order,
    serviceTypeTimeEntries,
    isServiceTypeNoShip,
  );
}

export function isItemUnassigned(
  serviceTypeId: string | undefined,
  programOrder: string[],
): boolean {
  if (!serviceTypeId) {
    return true;
  }
  if (serviceTypeId === UNASSIGNED_SERVICE_TYPE_ID) {
    return true;
  }
  return !programOrder.includes(serviceTypeId);
}

export function resolveServiceTypeIdForAdd(
  order: OrderData,
  canAssignInReview: boolean,
  activeServiceTypeTimer: string | null,
  selectedServiceTypeId: string | null,
): string | undefined {
  if (activeServiceTypeTimer) {
    return activeServiceTypeTimer;
  }
  if (order.programs.length === 1) {
    return order.programs[0];
  }
  if (canAssignInReview) {
    return selectedServiceTypeId ?? undefined;
  }
  return undefined;
}
