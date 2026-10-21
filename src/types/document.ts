/**
 * Voyaro Core Domain — Document Types (Phase 12)
 *
 * Defines the strongly typed data model for travel documents and vault
 * attachments across trips.
 */

// ---------------------------------------------------------------------------
// 1. Supported Document Categories
// ---------------------------------------------------------------------------

/**
 * Supported document categories matching the database constraint:
 * CHECK (category IN ('flights', 'accommodation', 'transport', 'insurance', 'other'))
 */
export const DOCUMENT_CATEGORIES = [
  'flights',
  'accommodation',
  'transport',
  'insurance',
  'other',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

/**
 * Display metadata and UI descriptors for each document category.
 */
export interface DocumentCategoryMeta {
  key: DocumentCategory;
  label: string;
  iconName: string;
  description: string;
}

export const DOCUMENT_CATEGORY_META: Record<DocumentCategory, DocumentCategoryMeta> = {
  flights: {
    key: 'flights',
    label: 'Flights',
    iconName: 'flight',
    description: 'Boarding passes, airline tickets, and flight confirmations',
  },
  accommodation: {
    key: 'accommodation',
    label: 'Accommodation',
    iconName: 'hotel',
    description: 'Hotel vouchers, check-in confirmations, and property bookings',
  },
  transport: {
    key: 'transport',
    label: 'Transport',
    iconName: 'ticket',
    description: 'Train tickets, rail passes, car rental vouchers, and transit cards',
  },
  insurance: {
    key: 'insurance',
    label: 'Insurance',
    iconName: 'verified',
    description: 'Travel health insurance, policy certificates, and claims info',
  },
  other: {
    key: 'other',
    label: 'Other',
    iconName: 'receipt',
    description: 'Visas, entry permits, receipts, and miscellaneous travel files',
  },
};

// ---------------------------------------------------------------------------
// 2. Core Document Domain Model
// ---------------------------------------------------------------------------

/**
 * Strong domain model for a travel document belonging to a trip.
 */
export interface TripDocument {
  id: string;
  tripId: string;
  userId: string;
  title: string;
  category: DocumentCategory;
  filePath: string;
  fileName: string;
  fileSize: number; // Bytes
  mimeType: string;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ---------------------------------------------------------------------------
// 3. Document Creation & Mutation Payloads
// ---------------------------------------------------------------------------

/**
 * Input payload for saving document metadata after or during storage upload.
 */
export interface DocumentUploadInput {
  tripId: string;
  title: string;
  category: DocumentCategory;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  userId?: string;
}

/**
 * Input payload for updating document metadata.
 */
export interface UpdateDocumentInput {
  title?: string;
  category?: DocumentCategory;
}
