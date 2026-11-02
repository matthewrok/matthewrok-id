document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#resourceCalculator");

    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const food = Number(document.querySelector("#food")?.value || 0);
        const wood = Number(document.querySelector("#wood")?.value || 0);
        const stone = Number(document.querySelector("#stone")?.value || 0);
        const gold = Number(document.querySelector("#gold")?.value || 0);

        const result = document.querySelector("#calculatorResult");

        if (!result) return;

        result.innerHTML = `
            <h2>Total Resource</h2>
            <p>Food: ${food.toLocaleString("id-ID")}</p>
            <p>Wood: ${wood.toLocaleString("id-ID")}</p>
            <p>Stone: ${stone.toLocaleString("id-ID")}</p>
            <p>Gold: ${gold.toLocaleString("id-ID")}</p>
        `;
    });
});
