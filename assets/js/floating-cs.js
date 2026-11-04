/* Fixed-position CS shortcut: no drag handlers or stored position. */
(() => {
  "use strict";
  const button = document.getElementById("floatingCs");
  if (!button) return;
  button.title = "Hubungi Customer Service melalui WhatsApp";
  // Clear a position saved by the previous draggable version.
  try { localStorage.removeItem("matthew-floating-cs-position-v1"); } catch (_) {}
})();
