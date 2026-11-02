document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector("#cityHallSearch");
    const cityHallItems = document.querySelectorAll(".city-hall-item");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase();

        cityHallItems.forEach((item) => {
            const content = item.textContent.toLowerCase();

            item.style.display = content.includes(keyword)
                ? ""
                : "none";
        });
    });
});
