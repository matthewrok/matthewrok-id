/* Responsive navigation menu and collapsible purpose groups. */
(() => {
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("siteMenu");
  if (!toggle || !menu) return;

  const closeMenu = () => {
    menu.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Buka menu navigasi");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Tutup menu navigasi" : "Buka menu navigasi");
  });

  menu.querySelectorAll(".nav-group-title").forEach((heading) => {
    heading.addEventListener("click", () => {
      const group = heading.closest(".nav-group");
      if (!group) return;
      const isExpanded = heading.getAttribute("aria-expanded") === "true";
      heading.setAttribute("aria-expanded", String(!isExpanded));
      group.classList.toggle("is-collapsed", isExpanded);
      const arrows = heading.querySelector(".nav-group-arrows");
      if (arrows) arrows.textContent = isExpanded ? "↓" : "↑↓";
    });
  });

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      toggle.focus();
    }
  });
})();
