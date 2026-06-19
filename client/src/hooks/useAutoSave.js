import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Debounced auto-save hook.
 * Returns a triggerSave function and the current save status.
 * Status cycles: 'saved' -> 'unsaved' (on trigger) -> 'saving' -> 'saved'
 */
export function useAutoSave(saveFn, delay = 2000) {
  const [status, setStatus] = useState('saved');
  const timeoutRef = useRef(null);
  const saveFnRef = useRef(saveFn);

  // Keep the save function reference up to date without re-triggering effects
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  const triggerSave = useCallback(() => {
    setStatus('unsaved');

    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFnRef.current();
        setStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setStatus('unsaved');
      }
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { triggerSave, status };
}
