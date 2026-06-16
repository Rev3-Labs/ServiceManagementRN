import {AddedContainer, OrderData} from '../../types/wasteCollection';
import {serviceTypeService} from '../../services/serviceTypeService';

export const UNASSIGNED_SERVICE_TYPE_ID = '__unassigned__';

export interface ServiceRequestContainerGroup {
  serviceTypeId: string;
  containers: AddedContainer[];
}

export function groupContainersByServiceRequest(
  containers: AddedContainer[],
  programOrder: string[],
): ServiceRequestContainerGroup[] {
  const groups: ServiceRequestContainerGroup[] = [];
  const assignedIds = new Set(programOrder);

  for (const serviceTypeId of programOrder) {
    const inGroup = containers.filter(c => c.serviceTypeId === serviceTypeId);
    if (inGroup.length > 0) {
      groups.push({serviceTypeId, containers: inGroup});
    }
  }

  const unassigned = containers.filter(
    c => !c.serviceTypeId || !assignedIds.has(c.serviceTypeId),
  );
  if (unassigned.length > 0) {
    groups.push({
      serviceTypeId: UNASSIGNED_SERVICE_TYPE_ID,
      containers: unassigned,
    });
  }

  return groups;
}

export function getDefaultExpandedServiceTypeId(
  groups: ServiceRequestContainerGroup[],
  activeServiceTypeTimer: string | null,
): string | null {
  if (groups.length === 0) {
    return null;
  }
  if (
    activeServiceTypeTimer &&
    groups.some(group => group.serviceTypeId === activeServiceTypeTimer)
  ) {
    return activeServiceTypeTimer;
  }
  return groups[0].serviceTypeId;
}

export function formatServiceRequestLabel(
  serviceTypeId: string,
  order: OrderData,
): string {
  if (serviceTypeId === UNASSIGNED_SERVICE_TYPE_ID) {
    return 'Unassigned';
  }

  const serviceOrderNumber = order.serviceOrderNumbers?.[serviceTypeId];
  const badge = serviceTypeService.formatForBadge(serviceTypeId);
  return serviceOrderNumber ? `${badge} • ${serviceOrderNumber}` : badge;
}
