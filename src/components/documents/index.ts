/**
 * Voyaro Documents UI Components — Barrel Index (Phase 12 — Step 4)
 *
 * Exports modular, reusable document presentation components:
 *  - DocumentCard: individual document display card with actions
 *  - DocumentCategoryChips: category filter chip bar
 *  - UploadDocumentModal: document selection & upload modal
 */

export { DocumentCard } from './DocumentCard';
export type { DocumentCardProps } from './DocumentCard';

export { DocumentCategoryChips, DOCUMENT_FILTER_OPTIONS } from './DocumentCategoryChips';
export type {
  DocumentCategoryChipsProps,
  DocumentFilterCategory,
  FilterOption,
} from './DocumentCategoryChips';

export { UploadDocumentModal } from './UploadDocumentModal';
export type { UploadDocumentModalProps } from './UploadDocumentModal';

export {
  emitDocumentUploadRequest,
  subscribeToDocumentUploadRequest,
} from './documentEvents';
export type { DocumentUploadRequestListener } from './documentEvents';
