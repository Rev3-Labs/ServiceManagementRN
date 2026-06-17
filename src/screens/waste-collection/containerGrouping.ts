import {AddedContainer, MaterialsSupply, OrderData} from '../../types/wasteCollection';
import {serviceTypeService} from '../../services/serviceTypeService';

export const UNASSIGNED_SERVICE_TYPE_ID = '__unassigned__';

export interface ServiceRequestGroup<T> {
  serviceTypeId: string;
  items: T[];
}

export interface ServiceRequestContainerGroup {
  serviceTypeId: string;
  containers: AddedContainer[];
}

export interface ServiceRequestMaterialsGroup {
  serviceTypeId: string;
  materials: MaterialsSupply[];
}

function groupItemsByServiceRequest<T extends {serviceTypeId?: string}>(
  items: T[],
  programOrder: string[],
): ServiceRequestGroup<T>[] {
  const groups: ServiceRequestGroup<T>[] = [];
  const assignedIds = new Set(programOrder);

  for (const serviceTypeId of programOrder) {
    const inGroup = items.filter(item => item.serviceTypeId === serviceTypeId);
    if (inGroup.length > 0) {
      groups.push({serviceTypeId, items: inGroup});
    }
  }

  const unassigned = items.filter(
    item => !item.serviceTypeId || !assignedIds.has(item.serviceTypeId),
  );
  if (unassigned.length > 0) {
    groups.push({
      serviceTypeId: UNASSIGNED_SERVICE_TYPE_ID,
      items: unassigned,
    });
  }

  return groups;
}

export function groupContainersByServiceRequest(
  containers: AddedContainer[],
  programOrder: string[],
): ServiceRequestContainerGroup[] {
  return groupItemsByServiceRequest(containers, programOrder).map(group => ({
    serviceTypeId: group.serviceTypeId,
    containers: group.items,
  }));
}

export function groupMaterialsByServiceRequest(
  materials: MaterialsSupply[],
  programOrder: string[],
): ServiceRequestMaterialsGroup[] {
  return groupItemsByServiceRequest(materials, programOrder).map(group => ({
    serviceTypeId: group.serviceTypeId,
    materials: group.items,
  }));
}

export function getDefaultExpandedServiceTypeId(
  groups: Array<{serviceTypeId: string}>,
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
