/* Decorative background effects for the homepage. */
(() => {
  const emberBox = document.getElementById("embers");
  if (!emberBox) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 35; i += 1) {
    const ember = document.createElement("span");
    ember.className = "ember";
    ember.style.left = Math.random() * 100 + "%";
    ember.style.animationDelay = Math.random() * 12 + "s";
    ember.style.animationDuration = 7 + Math.random() * 10 + "s";
    fragment.appendChild(ember);
  }
  emberBox.appendChild(fragment);
})();
