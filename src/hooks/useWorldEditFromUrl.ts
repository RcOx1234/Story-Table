import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Abre el editor cuando la URL trae ?edit=id (menú contextual, enlaces externos). */
export function useWorldEditFromUrl<T>(onEdit: (item: T) => void, findById: (id: string) => T | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledRef = useRef<string | null>(null);
  const onEditRef = useRef(onEdit);
  const findByIdRef = useRef(findById);
  onEditRef.current = onEdit;
  findByIdRef.current = findById;

  const editId = searchParams.get('edit');

  useEffect(() => {
    if (!editId) {
      handledRef.current = null;
      return;
    }
    if (handledRef.current === editId) return;

    handledRef.current = editId;
    const item = findByIdRef.current(editId);
    if (item) onEditRef.current(item);

    setSearchParams(
      (prev) => {
        if (!prev.has('edit')) return prev;
        const next = new URLSearchParams(prev);
        next.delete('edit');
        return next;
      },
      { replace: true }
    );
  }, [editId, setSearchParams]);
}
