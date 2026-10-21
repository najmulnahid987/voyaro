/**
 * Voyaro Document Events — Lightweight event bus for Document actions (Phase 12 — Step 5)
 *
 * Allows TripSubNavHeader's contextual + button to trigger the
 * upload modal in the active Documents screen without global state or providers.
 */

export type DocumentUploadRequestListener = (tripId?: string) => void;

const uploadRequestListeners = new Set<DocumentUploadRequestListener>();

/**
 * Dispatches an upload document request to active listeners (Documents screen).
 */
export function emitDocumentUploadRequest(tripId?: string): void {
  uploadRequestListeners.forEach((listener) => {
    try {
      listener(tripId);
    } catch (err) {
      console.warn('[Voyaro Documents] Upload request listener error:', err);
    }
  });
}

/**
 * Subscribes to document upload requests from the sub-navigation header.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToDocumentUploadRequest(
  listener: DocumentUploadRequestListener
): () => void {
  uploadRequestListeners.add(listener);
  return () => {
    uploadRequestListeners.delete(listener);
  };
}
