/**
 * Voyaro Document Persistence & Storage Service (Phase 12 — Step 2)
 *
 * Provides type-safe, authenticated management of travel documents:
 *  - Secure document listing per trip
 *  - Uploads to the private Supabase Storage bucket ('trip-documents')
 *  - Automatic compensatory cleanup on failed metadata inserts
 *  - Expiry-bound, short-lived signed URLs (no public URLs)
 *  - Atomic, permission-aware deletion respecting Supabase RLS
 *  - Cross-platform file reading supporting native URIs and web File/Blob payloads
 */

import { supabase } from './supabase';
import {
  TripDocument,
  DocumentCategory,
  DOCUMENT_CATEGORIES,
} from '@/types/document';
import { TripDocumentRow } from '@/types/database.types';
import {
  mapDocumentRowToDomain,
  mapDocumentInputToInsert,
} from './mappers';
import { isDevMockTrip } from './mockData';

// ---------------------------------------------------------------------------
// 1. Storage & File Constraints
// ---------------------------------------------------------------------------

export const DOCUMENT_STORAGE_BUCKET = 'trip-documents';

/**
 * 20 MB file size limit enforced by the Supabase Storage bucket.
 */
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20,971,520 bytes

/**
 * Allowed MIME types matching the private storage bucket configuration.
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour
export const MIN_SIGNED_URL_EXPIRY_SECONDS = 60; // 1 minute
export const MAX_SIGNED_URL_EXPIRY_SECONDS = 86400; // 24 hours

// ---------------------------------------------------------------------------
// 2. Types & Interfaces
// ---------------------------------------------------------------------------

/**
 * Cross-platform file input representation.
 * Supports native file URIs, web File / Blob objects, and raw ArrayBuffer / Uint8Array.
 */
export interface DocumentFileInput {
  /**
   * Original file name with extension (e.g., 'flight_e-ticket.pdf').
   */
  name: string;
  /**
   * File MIME type (must be in ALLOWED_DOCUMENT_MIME_TYPES).
   */
  mimeType: string;
  /**
   * File size in bytes (must be <= 20 MB).
   */
  size: number;
  /**
   * File URI (native file://, content://, or web blob: URL).
   */
  uri?: string;
  /**
   * Web File or Blob object (standard in browser environments).
   */
  file?: Blob | File;
  /**
   * Raw binary data (useful for test mocks and headless environments).
   */
  bytes?: ArrayBuffer | Uint8Array;
}

export interface UploadTripDocumentParams {
  tripId: string;
  file: DocumentFileInput;
  title: string;
  category: DocumentCategory;
}

export interface GetSignedUrlOptions {
  /**
   * Optional trip ID to verify that the storage path belongs to the expected trip.
   */
  tripId?: string;
  /**
   * Expiration time in seconds (between 60 and 86400, defaults to 3600).
   */
  expiresIn?: number;
}

export interface DeleteTripDocumentOptions {
  /**
   * Optional expected storage path to ensure client-server consistency before deletion.
   */
  expectedFilePath?: string;
  /**
   * Optional expected trip ID to ensure the document belongs to the specified trip.
   */
  tripId?: string;
}

// ---------------------------------------------------------------------------
// 3. Validation & Platform Helpers
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateDocumentUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function validateTripId(tripId: string): string {
  if (!tripId || typeof tripId !== 'string') {
    throw new Error('Trip ID is required.');
  }
  const cleanId = tripId.trim();
  if (isDevMockTrip(cleanId)) {
    throw new Error('Document operations are not supported for mock trips. Please use a saved trip.');
  }
  if (!UUID_REGEX.test(cleanId)) {
    throw new Error(`Invalid trip ID "${cleanId}". A valid UUID is required.`);
  }
  return cleanId;
}

function validateTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    throw new Error('Document title is required.');
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error('Document title cannot be empty.');
  }
  if (trimmed.length > 200) {
    throw new Error('Document title must be 200 characters or fewer.');
  }
  return trimmed;
}

function validateCategory(category: string): DocumentCategory {
  if (!category || !DOCUMENT_CATEGORIES.includes(category as DocumentCategory)) {
    throw new Error(
      `Invalid document category "${category}". Supported categories: ${DOCUMENT_CATEGORIES.join(', ')}.`
    );
  }
  return category as DocumentCategory;
}

function validateMimeType(mimeType: string): AllowedDocumentMimeType {
  const normalized = mimeType?.trim().toLowerCase();
  if (!normalized || !(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(normalized)) {
    throw new Error(
      `Unsupported file type "${mimeType}". Allowed types: PDF, JPEG, PNG, WebP, HEIC.`
    );
  }
  return normalized as AllowedDocumentMimeType;
}

function validateFileSize(size: number): void {
  if (typeof size !== 'number' || isNaN(size) || size <= 0) {
    throw new Error('File size must be a positive number of bytes.');
  }
  if (size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    const mbSize = (size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File size exceeds the 20 MB limit (current: ${mbSize} MB). Please choose a smaller file.`
    );
  }
}

function extractFileExtension(fileName: string, mimeType: string): string {
  const parts = fileName.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()?.trim().toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) {
      return ext;
    }
  }

  // Fallback to extension based on MIME type
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'bin';
  }
}

/**
 * Resolves binary data from a DocumentFileInput across Web, React Native, and Node runtimes.
 */
export async function resolveUploadPayload(
  file: DocumentFileInput
): Promise<Blob | ArrayBuffer | Uint8Array> {
  if (file.bytes) {
    return file.bytes;
  }

  if (file.file) {
    return file.file;
  }

  if (file.uri) {
    try {
      const response = await fetch(file.uri);
      if (!response.ok && response.status !== 0) {
        throw new Error(`HTTP status ${response.status}`);
      }
      return await response.blob();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Unable to read file content from URI "${file.uri}": ${msg}`);
    }
  }

  throw new Error('No valid file payload provided (uri, file, or bytes required).');
}

// ---------------------------------------------------------------------------
// 4. Document Service API
// ---------------------------------------------------------------------------

/**
 * Lists all documents associated with a specific trip.
 * Ordered by `created_at` descending (newest first).
 */
export async function listTripDocuments(tripId: string): Promise<TripDocument[]> {
  if (!tripId || typeof tripId !== 'string') {
    return [];
  }

  const cleanTripId = tripId.trim();
  if (isDevMockTrip(cleanTripId)) {
    return [];
  }

  if (!UUID_REGEX.test(cleanTripId)) {
    return [];
  }

  const { data, error } = await supabase
    .from('trip_documents')
    .select('*')
    .eq('trip_id', cleanTripId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn(`[Voyaro DocumentService] Error listing documents for trip ${cleanTripId}:`, error.message);
    throw new Error(`Failed to load trip documents: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row: TripDocumentRow) => mapDocumentRowToDomain(row));
}

/**
 * Uploads a document to private Supabase Storage and records its metadata in `trip_documents`.
 *
 * Guarantees:
 *  - Enforces authentication
 *  - Enforces 20 MB size limit and bucket allowed MIME types
 *  - Generates UUID-based path: `${tripId}/${documentId}.${ext}`
 *  - Compensatory rollback: deletes uploaded storage object if metadata insertion fails
 */
export async function uploadTripDocument(
  paramsOrTripId: UploadTripDocumentParams | string,
  fileArg?: DocumentFileInput,
  titleArg?: string,
  categoryArg?: DocumentCategory
): Promise<TripDocument> {
  const params: UploadTripDocumentParams =
    typeof paramsOrTripId === 'string'
      ? {
          tripId: paramsOrTripId,
          file: fileArg!,
          title: titleArg!,
          category: categoryArg!,
        }
      : paramsOrTripId;

  // 1. Verify Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be signed in to upload travel documents.');
  }

  // 2. Validate Inputs
  const cleanTripId = validateTripId(params.tripId);
  const cleanTitle = validateTitle(params.title);
  const cleanCategory = validateCategory(params.category);

  if (!params.file) {
    throw new Error('A file must be selected for upload.');
  }

  const cleanMimeType = validateMimeType(params.file.mimeType);
  validateFileSize(params.file.size);

  const cleanFileName = params.file.name?.trim() || `document_${Date.now()}`;
  const extension = extractFileExtension(cleanFileName, cleanMimeType);
  const documentId = generateDocumentUuid();

  // Storage path: <trip_id>/<document_id>.<ext>
  // Strictly complies with storage policy requirement: name ~ '^[0-9a-fA-F-]{36}/'
  const storagePath = `${cleanTripId}/${documentId}.${extension}`;

  // 3. Resolve Binary Payload
  const payload = await resolveUploadPayload(params.file);

  // 4. Upload File to Private Storage Bucket
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .upload(storagePath, payload, {
      contentType: cleanMimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload document file: ${uploadError.message}`);
  }

  // 5. Insert Metadata into Database
  const insertPayload = mapDocumentInputToInsert(
    {
      tripId: cleanTripId,
      title: cleanTitle,
      category: cleanCategory,
      filePath: storagePath,
      fileName: cleanFileName,
      fileSize: params.file.size,
      mimeType: cleanMimeType,
    },
    user.id
  );

  const { data: insertedRow, error: insertError } = await supabase
    .from('trip_documents')
    .insert({
      ...insertPayload,
      id: documentId,
    })
    .select('*')
    .single();

  if (insertError) {
    // 6. Compensatory Rollback: Clean up uploaded storage object on metadata failure
    try {
      const { error: cleanupError } = await supabase.storage
        .from(DOCUMENT_STORAGE_BUCKET)
        .remove([storagePath]);

      if (cleanupError) {
        console.warn(
          `[Voyaro DocumentService] Orphaned storage cleanup failed for ${storagePath}:`,
          cleanupError.message
        );
      }
    } catch (cleanupEx) {
      console.warn(
        `[Voyaro DocumentService] Exception during orphaned storage cleanup:`,
        cleanupEx instanceof Error ? cleanupEx.message : String(cleanupEx)
      );
    }

    throw new Error(`Failed to save document metadata: ${insertError.message}`);
  }

  return mapDocumentRowToDomain(insertedRow as TripDocumentRow);
}

/**
 * Generates a short-lived signed URL for securely viewing or downloading a document.
 * Never constructs or exposes public URLs.
 */
export async function getTripDocumentSignedUrl(
  filePath: string,
  optionsOrExpiresIn?: number | GetSignedUrlOptions
): Promise<string> {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('A valid document storage path is required.');
  }

  const cleanPath = filePath.trim();
  const pathParts = cleanPath.split('/');

  if (pathParts.length < 2 || !pathParts[0] || !pathParts[1]) {
    throw new Error('Invalid storage path structure. Expected: <tripId>/<fileName>');
  }

  let expiresIn = DEFAULT_SIGNED_URL_EXPIRY_SECONDS;
  let expectedTripId: string | undefined;

  if (typeof optionsOrExpiresIn === 'number') {
    expiresIn = optionsOrExpiresIn;
  } else if (optionsOrExpiresIn) {
    if (optionsOrExpiresIn.expiresIn !== undefined) {
      expiresIn = optionsOrExpiresIn.expiresIn;
    }
    expectedTripId = optionsOrExpiresIn.tripId;
  }

  if (expiresIn < MIN_SIGNED_URL_EXPIRY_SECONDS || expiresIn > MAX_SIGNED_URL_EXPIRY_SECONDS) {
    throw new Error(
      `Signed URL expiry must be between ${MIN_SIGNED_URL_EXPIRY_SECONDS} and ${MAX_SIGNED_URL_EXPIRY_SECONDS} seconds.`
    );
  }

  if (expectedTripId) {
    const cleanExpected = expectedTripId.trim();
    if (pathParts[0].toLowerCase() !== cleanExpected.toLowerCase()) {
      throw new Error('Security check failed: Document storage path does not match the expected trip.');
    }
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .createSignedUrl(cleanPath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed document URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error('Storage service failed to return a signed URL.');
  }

  return data.signedUrl;
}

/**
 * Deletes a document and its storage object securely.
 *
 * Guarantees:
 *  - Verifies metadata existence in database before attempting removal
 *  - Validates that the requested document matches stored record
 *  - Enforces database and storage RLS:
 *      * Owner can delete any trip document
 *      * Editor can only delete documents they uploaded
 *      * Viewer cannot delete any document
 *  - Handles partial failure with explicit error reporting
 */
export async function deleteTripDocument(
  documentId: string,
  optionsOrFilePath?: string | DeleteTripDocumentOptions
): Promise<void> {
  if (!documentId || typeof documentId !== 'string') {
    throw new Error('Document ID is required for deletion.');
  }

  const cleanDocId = documentId.trim();

  let expectedFilePath: string | undefined;
  let expectedTripId: string | undefined;

  if (typeof optionsOrFilePath === 'string') {
    expectedFilePath = optionsOrFilePath.trim();
  } else if (optionsOrFilePath) {
    expectedFilePath = optionsOrFilePath.expectedFilePath?.trim();
    expectedTripId = optionsOrFilePath.tripId?.trim();
  }

  // 1. Verify Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required to delete documents.');
  }

  // 2. Fetch authoritative document record from database
  const { data: record, error: fetchError } = await supabase
    .from('trip_documents')
    .select('*')
    .eq('id', cleanDocId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to verify document before deletion: ${fetchError.message}`);
  }

  if (!record) {
    throw new Error('Document not found or you do not have permission to access it.');
  }

  // 3. Consistency Validations
  if (expectedFilePath && record.file_path !== expectedFilePath) {
    throw new Error('Document storage path mismatch. Deletion rejected.');
  }

  if (expectedTripId && record.trip_id !== expectedTripId) {
    throw new Error('Document does not belong to the specified trip. Deletion rejected.');
  }

  const storagePath = record.file_path;

  // 4. Remove Storage Object
  // Storage RLS policy enforces: is_trip_owner OR (editor AND auth.uid() = owner)
  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`Failed to delete document file from storage: ${storageError.message}`);
  }

  // 5. Remove Metadata Row from Database
  // Database RLS policy enforces: is_trip_owner OR (editor AND auth.uid() = user_id)
  const { error: dbError } = await supabase
    .from('trip_documents')
    .delete()
    .eq('id', cleanDocId);

  if (dbError) {
    console.error(
      `[Voyaro DocumentService] Partial deletion failure for document ${cleanDocId}: ` +
        `Storage object was deleted, but metadata row delete failed: ${dbError.message}`
    );
    throw new Error(
      `Document file was removed from storage, but database record deletion failed: ${dbError.message}. Please refresh.`
    );
  }
}
