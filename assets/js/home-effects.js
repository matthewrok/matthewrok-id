/* Subtle falling meteor field for the MATTHEW homepage. */
(() => {
  const meteorField = document.getElementById("embers");
  if (!meteorField) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const isSmallScreen = window.matchMedia("(max-width: 600px)").matches;
  const fragment = document.createDocumentFragment();
  // Fewer independently animated layers keep first paint smooth on mid-range phones.
  const meteorCount = isSmallScreen ? 4 : 8;

  for (let i = 0; i < meteorCount; i += 1) {
    const meteor = document.createElement("span");
    meteor.className = "meteor";
    meteor.setAttribute("aria-hidden", "true");
    meteor.style.left = (Math.random() * 112 - 6) + "%";
    meteor.style.setProperty("--meteor-duration", (7 + Math.random() * 5) + "s");
    meteor.style.setProperty("--meteor-delay", (-Math.random() * 14) + "s");
    meteor.style.setProperty("--meteor-length", (34 + Math.random() * 38) + "px");
    meteor.style.setProperty("--meteor-size", (1 + Math.random() * .8) + "px");
    meteor.style.setProperty("--meteor-drift", (12 + Math.random() * 25) + "vw");
    meteor.style.setProperty("--meteor-glow", (0.35 + Math.random() * 0.35).toFixed(2));
    fragment.appendChild(meteor);
  }

  meteorField.replaceChildren(fragment);
  document.addEventListener("visibilitychange", () => {
    meteorField.classList.toggle("is-paused", document.visibilityState !== "visible");
  });
})();