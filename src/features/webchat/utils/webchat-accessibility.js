let _prevFocus = null;

export function saveFocus() {
  _prevFocus = document.activeElement;
}

export function restoreFocus() {
  if (_prevFocus && typeof _prevFocus.focus === 'function') {
    try { _prevFocus.focus(); } catch { /* ignore */ }
  }
  _prevFocus = null;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusFirst(container) {
  if (!container) return;
  const first = container.querySelector(FOCUSABLE_SELECTOR);
  if (first) first.focus();
}

export function trapFocus(container, event) {
  if (!container || event.key !== 'Tab') return;
  const focusable = [...container.querySelectorAll(FOCUSABLE_SELECTOR)];
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first) { event.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { event.preventDefault(); first.focus(); }
  }
}
