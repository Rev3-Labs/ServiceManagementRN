import React from 'react';
import {
  AppConfirmModal,
  AppConfirmModalProps,
} from '../../components/feedback/AppConfirmModal';

export type ConfirmDeleteModalProps = Omit<
  AppConfirmModalProps,
  'destructive' | 'title'
> & {
  title?: string;
};

/** Thin wrapper — prefer AppConfirmModal for new call sites. */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  title = 'Delete Item',
  confirmLabel = 'Delete',
  ...rest
}) => (
  <AppConfirmModal
    title={title}
    confirmLabel={confirmLabel}
    destructive
    {...rest}
  />
);
