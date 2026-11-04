/* Draggable CS shortcut. Position is remembered on this device/browser. */
(() => {
  "use strict";
  const button = document.getElementById("floatingCs");
  if (!button) return;
  const key = "matthew-floating-cs-position-v1";
  let dragging = false;
  let moved = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  let pointerId = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const place = (left, top) => {
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const x = clamp(left, margin, window.innerWidth - rect.width - margin);
    const y = clamp(top, margin, window.innerHeight - rect.height - margin);
    button.style.left = x + "px";
    button.style.top = y + "px";
    button.style.right = "auto";
    button.style.bottom = "auto";
  };
  const save = () => {
    const r = button.getBoundingClientRect();
    try { localStorage.setItem(key, JSON.stringify({ x: r.left / Math.max(1, window.innerWidth), y: r.top / Math.max(1, window.innerHeight) })); } catch (_) {}
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      place(saved.x * window.innerWidth, saved.y * window.innerHeight);
    }
  } catch (_) {}

  button.addEventListener("pointerdown", event => {
    if (event.button !== undefined && event.button !== 0) return;
    const r = button.getBoundingClientRect();
    dragging = true;
    moved = false;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = r.left;
    startTop = r.top;
    button.setPointerCapture?.(pointerId);
  });
  button.addEventListener("pointermove", event => {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
    if (moved) {
      place(startLeft + dx, startTop + dy);
      event.preventDefault();
    }
  });
  const finish = event => {
    if (!dragging || (event && event.pointerId !== pointerId)) return;
    dragging = false;
    pointerId = null;
    if (moved) {
      save();
      button.dataset.dragged = "true";
      window.setTimeout(() => { delete button.dataset.dragged; }, 250);
    }
  };
  button.addEventListener("pointerup", finish);
  button.addEventListener("pointercancel", finish);
  button.addEventListener("click", event => {
    if (button.dataset.dragged === "true") {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  window.addEventListener("resize", () => {
    const r = button.getBoundingClientRect();
    place(r.left, r.top);
    save();
  });
})();
