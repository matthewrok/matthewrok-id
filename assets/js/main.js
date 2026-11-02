document.addEventListener("DOMContentLoaded", () => {
    // Tahun otomatis untuk footer
    const yearElements = document.querySelectorAll("[data-current-year]");

    yearElements.forEach((element) => {
        element.textContent = new Date().getFullYear();
    });

    // Menu navigasi mobile
    const menuButton = document.querySelector("[data-menu-button]");
    const navigation = document.querySelector("[data-navigation]");

    if (menuButton && navigation) {
        menuButton.addEventListener("click", () => {
            navigation.classList.toggle("active");
        });
    }
});
