/* Responsive navigation menu and reliable collapsible groups. */
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

  // Event delegation remains reliable even if other scripts alter the menu.
  menu.addEventListener("click", (event) => {
    const heading = event.target.closest(".nav-group-title");
    if (!heading || !menu.contains(heading)) return;
    event.preventDefault();
    event.stopPropagation();
    const group = heading.closest(".nav-group");
    if (!group) return;

    const willExpand = heading.getAttribute("aria-expanded") !== "true";
    heading.setAttribute("aria-expanded", String(willExpand));
    group.classList.toggle("is-collapsed", !willExpand);
    group.querySelectorAll(":scope > a, :scope > .nav-user, :scope > #logout").forEach((item) => {
      item.hidden = !willExpand;
    });
    const arrows = heading.querySelector(".nav-group-arrows");
    if (arrows) arrows.textContent = willExpand ? "↑↓" : "↓";
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
