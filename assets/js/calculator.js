document.addEventListener("DOMContentLoaded", () => {
  const taxRates = {13:23,14:22,15:21,16:20,17:19,18:18,19:17,20:16,21:15,22:14,23:12,24:10,25:8};
  const levelInput = document.getElementById("level");
  const taxDisplay = document.getElementById("tax");
  const inputs = [...document.querySelectorAll(".resource-input")];
  const result = document.getElementById("result");
  if (!levelInput || !taxDisplay || !result) return;

  const names = {food:"FOOD",wood:"WOOD",stone:"STONE",gold:"GOLD"};
  const formatNumber = value => Math.floor(value).toLocaleString("id-ID");
  const parseNumber = value => Number(String(value).replace(/\./g, "").replace(/[^\d]/g, "")) || 0;

  Object.keys(taxRates).forEach(level => {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = "Level " + level;
    levelInput.appendChild(option);
  });
  levelInput.value = "13";

  function updateTax() {
    taxDisplay.textContent = taxRates[levelInput.value] + "%";
    result.style.display = "none";
  }
  levelInput.addEventListener("change", updateTax);

  inputs.forEach(input => input.addEventListener("input", () => {
    const number = parseNumber(input.value);
    input.value = number ? formatNumber(number) : "";
    result.style.display = "none";
  }));

  document.querySelectorAll("[data-target]").forEach(button => button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.target);
    if (!target) return;
    target.value = formatNumber(parseNumber(target.value) + Number(button.dataset.add));
    result.style.display = "none";
  }));

  document.getElementById("clear")?.addEventListener("click", () => {
    inputs.forEach(input => input.value = "");
    result.style.display = "none";
  });

  document.getElementById("calculate")?.addEventListener("click", () => {
    const rate = taxRates[levelInput.value] / 100;
    const resources = inputs.map(input => {
      const gross = parseNumber(input.value);
      const tax = Math.floor(gross * rate);
      return {name:names[input.id] || input.id.toUpperCase(),gross,tax,net:gross-tax};
    });
    const totalGross = resources.reduce((sum,item)=>sum+item.gross,0);
    if (totalGross <= 0) {
      window.alert("Masukkan jumlah resource terlebih dahulu!");
      return;
    }
    const totalTax = resources.reduce((sum,item)=>sum+item.tax,0);
    const totalNet = resources.reduce((sum,item)=>sum+item.net,0);
    const details = document.getElementById("resourceDetails");
    details.replaceChildren();
    resources.forEach(item => {
      const card = document.createElement("div");
      card.className = "detail-card";
      const title = document.createElement("h3");
      title.textContent = item.name;
      card.appendChild(title);
      [["Resource Awal",item.gross,""],["Pajak ("+Math.round(rate*100)+"%)",item.tax,"tax"],["Resource Bersih",item.net,"net"]].forEach(([label,value,kind])=>{
        const row = document.createElement("div"); row.className="detail-row";
        const span = document.createElement("span"); span.textContent=label;
        const strong = document.createElement("strong"); strong.textContent=formatNumber(value); if(kind) strong.className=kind;
        row.append(span,strong); card.appendChild(row);
      });
      details.appendChild(card);
    });
    document.getElementById("grossResult").textContent=formatNumber(totalGross);
    document.getElementById("taxResult").textContent=formatNumber(totalTax);
    document.getElementById("netResult").textContent=formatNumber(totalNet);
    document.getElementById("grossLabel").textContent=formatNumber(totalGross);
    document.getElementById("taxLabel").textContent=formatNumber(totalTax);
    document.getElementById("netLabel").textContent=formatNumber(totalNet);
    document.getElementById("grossBar").style.width="100%";
    document.getElementById("taxBar").style.width=(totalTax/totalGross*100)+"%";
    document.getElementById("netBar").style.width=(totalNet/totalGross*100)+"%";
    result.style.display="block";
    result.scrollIntoView({behavior:"smooth",block:"nearest"});
  });
  updateTax();
});
