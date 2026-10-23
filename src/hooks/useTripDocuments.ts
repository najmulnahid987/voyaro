/**
 * Voyaro Trip Documents Reactive State Hook (Phase 12 — Step 3)
 *
 * Connects the document service to React UI state with:
 *  - Trip-scoped document loading and caching
 *  - Stale-response protection during rapid trip switching
 *  - Safe lifecycle guards preventing state updates on unmounted components
 *  - Optimistic/instant local state updates upon upload and deletion
 *  - Concurrency locks preventing duplicate simultaneous uploads or deletions
 *  - Actionable error propagation without crashing the UI
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TripDocument,
  DocumentCategory,
} from '@/types/document';
import {
  DocumentFileInput,
  listTripDocuments,
  listUniversalDocuments,
  uploadTripDocument,
  deleteTripDocument,
} from '@/services/documentService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export const ALL_TRIPS_SCOPE_ID = 'all_trips';

export interface UploadDocumentOptions {
  file: DocumentFileInput;
  title: string;
  category: DocumentCategory;
  isForAllTrips?: boolean;
}

export type UploadDocumentFn = {
  (options: UploadDocumentOptions): Promise<TripDocument>;
  (
    file: DocumentFileInput,
    title: string,
    category: DocumentCategory,
    isForAllTrips?: boolean
  ): Promise<TripDocument>;
};

export interface UseTripDocumentsResult {
  /**
   * List of documents associated with the current trip, ordered newest first.
   */
  documents: TripDocument[];
  /**
   * Whether documents are currently being loaded from Supabase.
   */
  isLoading: boolean;
  /**
   * Error message from the most recent failed operation, or null if healthy.
   */
  error: string | null;
  /**
   * Whether a document is currently uploading.
   */
  isUploading: boolean;
  /**
   * ID of the document currently being deleted, or null if idle.
   */
  deletingId: string | null;
  /**
   * Uploads a document and adds it to local state immediately upon success.
   */
  uploadDocument: UploadDocumentFn;
  /**
   * Deletes a document and removes it from local state upon success.
   */
  deleteDocument: (documentId: string, filePath?: string) => Promise<void>;
  /**
   * Refetches fresh documents from Supabase. Preserves current list if fetch fails.
   */
  refetch: () => Promise<TripDocument[]>;
  /**
   * Manually clears the active error state.
   */
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

/**
 * Custom React hook for managing travel documents belonging to a trip.
 *
 * @param tripId The unique identifier of the active trip (UUID) or ALL_TRIPS_SCOPE_ID.
 * @param fallbackTripId Optional fallback trip ID when uploading while in universal scope.
 */
export function useTripDocuments(tripId?: string): UseTripDocumentsResult;
export function useTripDocuments(
  tripId?: string,
  fallbackTripId?: string
): UseTripDocumentsResult;
export function useTripDocuments(
  tripId?: string,
  fallbackTripId?: string
): UseTripDocumentsResult {
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(tripId));
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Lifecycle & concurrency refs
  const mountedRef = useRef<boolean>(true);
  const isUploadingRef = useRef<boolean>(false);
  const deletingIdsRef = useRef<Set<string>>(new Set());

  // Track component mount status
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // -------------------------------------------------------------------------
  // 1. Initial Load & Trip Change Effect (with Stale Response Protection)
  // -------------------------------------------------------------------------
  useEffect(() => {
    let isCurrent = true;

    const fetchDocumentsForTrip = async () => {
      if (!tripId || typeof tripId !== 'string' || !tripId.trim()) {
        if (isCurrent) {
          setDocuments([]);
          setIsLoading(false);
          setError(null);
        }
        return;
      }      const currentTripId = tripId.trim();

      try {
        let data: TripDocument[] = [];
        if (currentTripId === ALL_TRIPS_SCOPE_ID) {
          data = await listUniversalDocuments();
        } else {
          const [tripData, universalData] = await Promise.all([
            listTripDocuments(currentTripId),
            listUniversalDocuments().catch(() => []),
          ]);
          const combined = [...tripData];
          const existingIds = new Set(tripData.map((d) => d.id));
          for (const uDoc of universalData) {
            if (!existingIds.has(uDoc.id)) {
              combined.push(uDoc);
            }
          }
          combined.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          data = combined;
        }

        if (isCurrent && mountedRef.current) {
          setDocuments(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isCurrent && mountedRef.current) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setDocuments([]);
        }
      } finally {
        if (isCurrent && mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchDocumentsForTrip();

    return () => {
      isCurrent = false;
    };
  }, [tripId]);

  // -------------------------------------------------------------------------
  // 2. Refetch (Preserves existing list if reload fails)
  // -------------------------------------------------------------------------
  const refetch = useCallback(async (): Promise<TripDocument[]> => {
    if (!tripId || typeof tripId !== 'string' || !tripId.trim()) {
      if (mountedRef.current) {
        setDocuments([]);
        setIsLoading(false);
      }
      return [];
    }

    const currentTripId = tripId.trim();
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      let fetched: TripDocument[] = [];
      if (currentTripId === ALL_TRIPS_SCOPE_ID) {
        fetched = await listUniversalDocuments();
      } else {
        const [tripData, universalData] = await Promise.all([
          listTripDocuments(currentTripId),
          listUniversalDocuments().catch(() => []),
        ]);
        const combined = [...tripData];
        const existingIds = new Set(tripData.map((d) => d.id));
        for (const uDoc of universalData) {
          if (!existingIds.has(uDoc.id)) {
            combined.push(uDoc);
          }
        }
        combined.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        fetched = combined;
      }

      if (mountedRef.current) {
        setDocuments(fetched);
        setError(null);
      }
      return fetched;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (mountedRef.current) {
        setError(message);
      }
      // Preserve existing documents in local state on refetch error
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tripId]);

  // -------------------------------------------------------------------------
  // 3. Upload Document
  // -------------------------------------------------------------------------
  const uploadDocument: UploadDocumentFn = useCallback(
    async (
      optionsOrFile: UploadDocumentOptions | DocumentFileInput,
      titleArg?: string,
      categoryArg?: DocumentCategory,
      isForAllTripsArg?: boolean
    ): Promise<TripDocument> => {
      if (!tripId || typeof tripId !== 'string' || !tripId.trim()) {
        throw new Error('Cannot upload document: No active trip ID provided.');
      }

      const file =
        'file' in optionsOrFile && 'title' in optionsOrFile
          ? (optionsOrFile as UploadDocumentOptions).file
          : (optionsOrFile as DocumentFileInput);

      const title =
        'title' in optionsOrFile
          ? (optionsOrFile as UploadDocumentOptions).title
          : titleArg!;

      const category =
        'category' in optionsOrFile
          ? (optionsOrFile as UploadDocumentOptions).category
          : categoryArg!;

      const isForAllTrips =
        'isForAllTrips' in optionsOrFile
          ? (optionsOrFile as UploadDocumentOptions).isForAllTrips
          : isForAllTripsArg;

      // Concurrency lock: prevent duplicate simultaneous uploads
      if (isUploadingRef.current) {
        throw new Error('An upload is already in progress. Please wait.');
      }

      isUploadingRef.current = true;
      if (mountedRef.current) {
        setIsUploading(true);
      }

      const isAllTripsScope = tripId.trim() === ALL_TRIPS_SCOPE_ID;
      const uploadTripId = isAllTripsScope
        ? (fallbackTripId?.trim() || '')
        : tripId.trim();

      if (!uploadTripId) {
        throw new Error(
          'Cannot upload document: A valid trip is required to attach the document.'
        );
      }

      try {
        const createdDoc = await uploadTripDocument({
          tripId: uploadTripId,
          file,
          title,
          category,
          isForAllTrips: isAllTripsScope ? true : isForAllTrips,
        });

        // Add the newly created document to the top of the list
        if (mountedRef.current) {
          setDocuments((prev) => [
            createdDoc,
            ...prev.filter((d) => d.id !== createdDoc.id),
          ]);
          setError(null);
        }

        return createdDoc;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (mountedRef.current) {
          setError(message);
        }
        throw err;
      } finally {
        isUploadingRef.current = false;
        if (mountedRef.current) {
          setIsUploading(false);
        }
      }
    },
    [tripId]
  );

  // -------------------------------------------------------------------------
  // 4. Delete Document
  // -------------------------------------------------------------------------
  const deleteDocument = useCallback(
    async (documentId: string, filePath?: string): Promise<void> => {
      if (!documentId || typeof documentId !== 'string' || !documentId.trim()) {
        throw new Error('Document ID is required for deletion.');
      }

      const cleanDocId = documentId.trim();

      // Concurrency lock per document ID: prevent duplicate delete clicks
      if (deletingIdsRef.current.has(cleanDocId)) {
        throw new Error('Deletion for this document is already in progress.');
      }

      deletingIdsRef.current.add(cleanDocId);
      if (mountedRef.current) {
        setDeletingId(cleanDocId);
      }

      try {
        await deleteTripDocument(cleanDocId, {
          tripId: tripId ? tripId.trim() : undefined,
          expectedFilePath: filePath,
        });

        // Remove document from local state immediately upon success
        if (mountedRef.current) {
          setDocuments((prev) => prev.filter((d) => d.id !== cleanDocId));
          setError(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (mountedRef.current) {
          setError(message);
        }
        // Document is retained in the list if deletion fails
        throw err;
      } finally {
        deletingIdsRef.current.delete(cleanDocId);
        if (mountedRef.current) {
          setDeletingId(null);
        }
      }
    },
    [tripId]
  );

  // -------------------------------------------------------------------------
  // 5. Clear Error
  // -------------------------------------------------------------------------
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null);
    }
  }, []);

  return {
    documents,
    isLoading,
    error,
    isUploading,
    deletingId,
    uploadDocument,
    deleteDocument,
    refetch,
    clearError,
  };
}
