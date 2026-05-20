/** Ajusta la posición de un menú flotante para que quede dentro del viewport. */
export function clampMenuPosition(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
  padding = 10
): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = clientX;
  let top = clientY;

  if (left + width > vw - padding) left = Math.max(padding, vw - width - padding);
  if (top + height > vh - padding) top = Math.max(padding, vh - height - padding);
  if (left < padding) left = padding;
  if (top < padding) top = padding;

  return { left, top };
}

export type FlyoutAnchor = { left: number; top: number; width: number; height: number };

/** Coloca un submenú junto a un ancla; invierte lado si no cabe. */
export function placeFlyoutMenu(
  anchor: FlyoutAnchor,
  menuWidth: number,
  menuHeight: number,
  prefer: 'right' | 'left' = 'right',
  gap = 6,
  padding = 10
): { left: number; top: number; placement: 'right' | 'left' } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let placement: 'right' | 'left' = prefer;
  let left =
    placement === 'right' ? anchor.left + anchor.width + gap : anchor.left - menuWidth - gap;

  if (placement === 'right' && left + menuWidth > vw - padding) {
    placement = 'left';
    left = anchor.left - menuWidth - gap;
  }
  if (placement === 'left' && left < padding) {
    placement = 'right';
    left = anchor.left + anchor.width + gap;
  }
  if (left + menuWidth > vw - padding) left = vw - menuWidth - padding;
  if (left < padding) left = padding;

  let top = anchor.top;
  if (top + menuHeight > vh - padding) top = vh - menuHeight - padding;
  if (top < padding) top = padding;

  return { left, top, placement };
}
