import {AddedContainer, MaterialsSupply, EquipmentPPE, OrderData} from '../../types/wasteCollection';
import {OrderPhoto} from '../../services/photoService';
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

export interface ServiceRequestEquipmentGroup {
  serviceTypeId: string;
  equipment: EquipmentPPE[];
}

export interface ServiceRequestPhotoGroup {
  serviceTypeId: string;
  photos: OrderPhoto[];
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

export function groupEquipmentByServiceRequest(
  equipment: EquipmentPPE[],
  programOrder: string[],
): ServiceRequestEquipmentGroup[] {
  return groupItemsByServiceRequest(equipment, programOrder).map(group => ({
    serviceTypeId: group.serviceTypeId,
    equipment: group.items,
  }));
}

export function groupPhotosByServiceRequest(
  photos: OrderPhoto[],
  programOrder: string[],
): ServiceRequestPhotoGroup[] {
  return groupItemsByServiceRequest(photos, programOrder).map(group => ({
    serviceTypeId: group.serviceTypeId,
    photos: group.items,
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

/** Subtitle for container cards: "55 Gallon Drum - 55G" (+ " - Units: N" for cylinders). */
export function formatContainerCardSubtitle(container: AddedContainer): string {
  const parts = [container.containerSize, container.containerType].filter(
    Boolean,
  );
  if (container.unitCount != null) {
    parts.push(`Units: ${container.unitCount}`);
  }
  return parts.join(' - ');
}
