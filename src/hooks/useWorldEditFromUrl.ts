import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Abre el editor cuando la URL trae ?edit=id (menú contextual, enlaces externos). */
export function useWorldEditFromUrl<T>(onEdit: (item: T) => void, findById: (id: string) => T | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    const item = findById(editId);
    if (item) onEdit(item);
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
  }, [searchParams.get('edit')]);
}
