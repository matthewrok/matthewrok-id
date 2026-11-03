/* Subtle falling meteor field for the MATTHEW homepage. */
(() => {
  const meteorField = document.getElementById("embers");
  if (!meteorField) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const fragment = document.createDocumentFragment();
  const meteorCount = window.matchMedia("(max-width: 600px)").matches ? 12 : 22;

  for (let i = 0; i < meteorCount; i += 1) {
    const meteor = document.createElement("span");
    meteor.className = "meteor";
    meteor.setAttribute("aria-hidden", "true");
    meteor.style.left = (Math.random() * 112 - 6) + "%";
    meteor.style.setProperty("--meteor-duration", (5.5 + Math.random() * 6.5) + "s");
    meteor.style.setProperty("--meteor-delay", (-Math.random() * 14) + "s");
    meteor.style.setProperty("--meteor-length", (34 + Math.random() * 46) + "px");
    meteor.style.setProperty("--meteor-size", (1 + Math.random() * 1.2) + "px");
    meteor.style.setProperty("--meteor-drift", (12 + Math.random() * 25) + "vw");
    meteor.style.setProperty("--meteor-glow", (0.45 + Math.random() * 0.45).toFixed(2));
    fragment.appendChild(meteor);
  }

  meteorField.replaceChildren(fragment);
})();
