const cityHallData = [
{level:1,req:"Mulai permainan",food:"—",wood:"—",stone:"—",time:"—",troops:"2.000"},
{level:2,req:"Tidak ada",food:"3,5 rb",wood:"3,5 rb",stone:"—",time:"2 detik",troops:"3.000"},
{level:3,req:"Wall level 2",food:"6,5 rb",wood:"6,5 rb",stone:"—",time:"5 menit",troops:"4.000"},
{level:4,req:"Wall level 3",food:"11,8 rb",wood:"11,8 rb",stone:"—",time:"20 menit",troops:"5.000"},
{level:5,req:"Wall level 4; Hospital level 4",food:"21,3 rb",wood:"21,3 rb",stone:"—",time:"1 jam",troops:"7.000"},
{level:6,req:"Wall level 5; Scout Camp level 5",food:"36,3 rb",wood:"36,3 rb",stone:"12 rb",time:"2 jam",troops:"9.000"},
{level:7,req:"Wall level 6; Storehouse level 6",food:"54,4 rb",wood:"54,4 rb",stone:"19,2 rb",time:"5 jam",troops:"12.000"},
{level:8,req:"Wall level 7; Barracks level 7",food:"81,8 rb",wood:"81,8 rb",stone:"30,8 rb",time:"10 jam",troops:"15.000"},
{level:9,req:"Wall level 8; Alliance Center level 8",food:"122,8 rb",wood:"122,8 rb",stone:"49,2 rb",time:"15 jam",troops:"19.000"},
{level:10,req:"Wall level 9; Academy level 9",food:"184,3 rb",wood:"184,3 rb",stone:"78,7 rb",time:"1 hari",troops:"23.000"},
{level:11,req:"Wall level 10; Hospital level 10",food:"277,5 rb",wood:"277,5 rb",stone:"120 rb",time:"1 hari 6 jam",troops:"28.000"},
{level:12,req:"Wall level 11; Storehouse level 11",food:"417,5 rb",wood:"417,5 rb",stone:"180 rb",time:"1 hari 16 jam",troops:"33.000"},
{level:13,req:"Wall level 12; Archery Range level 12",food:"627,5 rb",wood:"627,5 rb",stone:"270 rb",time:"2 hari 2 jam",troops:"38.000"},
{level:14,req:"Wall level 13; Alliance Center level 13; Trading Post level 13",food:"942,5 rb",wood:"942,5 rb",stone:"405 rb",time:"2 hari 12 jam",troops:"44.000"},
{level:15,req:"Wall level 14; Scout Camp level 14",food:"1,415 jt",wood:"1,415 jt",stone:"607,5 rb",time:"2 hari 22 jam",troops:"50.000"},
{level:16,req:"Wall level 15; Academy level 15",food:"2,1225 jt",wood:"2,1225 jt",stone:"912,5 rb",time:"4 hari",troops:"57.000"},
{level:17,req:"Wall level 16; Hospital level 16",food:"3,185 jt",wood:"3,185 jt",stone:"1,37 jt",time:"4 hari 20 jam",troops:"64.000"},
{level:18,req:"Wall level 17; Storehouse level 17",food:"4,8 jt",wood:"4,8 jt",stone:"2,075 jt",time:"5 hari 20 jam",troops:"72.000"},
{level:19,req:"Wall level 18; Stable level 18",food:"7,2 jt",wood:"7,2 jt",stone:"3,125 jt",time:"7 hari",troops:"80.000"},
{level:20,req:"Wall level 19; Alliance Center level 19",food:"10,8 jt",wood:"10,8 jt",stone:"4,7 jt",time:"8 hari 6 jam",troops:"90.000"},
{level:21,req:"Wall level 20; Academy level 20",food:"16,2 jt",wood:"16,2 jt",stone:"7,05 jt",time:"11 hari",troops:"100.000"},
{level:22,req:"Wall level 21; Hospital level 21",food:"24,3 jt",wood:"24,3 jt",stone:"10,575 jt",time:"17 hari 3 jam",troops:"110.000"},
{level:23,req:"Wall level 22; Storehouse level 22",food:"36,45 jt",wood:"36,45 jt",stone:"15,875 jt",time:"23 hari 23 jam",troops:"120.000"},
{level:24,req:"Wall level 23; Siege Workshop level 23",food:"54,75 jt",wood:"54,75 jt",stone:"24 jt",time:"sekitar 36 hari",troops:"130.000"},
{level:25,req:"Wall level 24; Trading Post level 24; 1 Master's Blueprint",food:"82,25 jt",wood:"82,25 jt",stone:"36 jt",time:"126 hari 3 jam",troops:"150.000"}
];


document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("requirementsRows");
  const search = document.getElementById("searchInput");
  const filter = document.getElementById("levelFilter");
  const empty = document.getElementById("emptyState");
  const esc = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  function render() {
    const term = search.value.trim().toLowerCase();
    const bucket = filter.value;
    const visible = cityHallData.filter(item => {
      const range = bucket === "early" ? item.level <= 10 : bucket === "mid" ? item.level >= 11 && item.level <= 20 : bucket === "late" ? item.level >= 21 : true;
      return range && (!term || String(item.level).includes(term) || item.req.toLowerCase().includes(term) || ("city hall level " + item.level).includes(term));
    });
    tbody.innerHTML = visible.map(item => `<tr>
      <td><span class="level-badge">CH ${item.level}</span></td>
      <td>${esc(item.req)}</td>
      <td class="cost"><span>🍖 Food: ${esc(item.food)}</span><span>🪵 Wood: ${esc(item.wood)}</span><span>🪨 Stone: ${esc(item.stone)}</span></td>
      <td>${esc(item.time)}</td><td>${esc(item.troops)}</td>
    </tr>`).join("");
    empty.classList.toggle("hidden", visible.length !== 0);
  }
  search.addEventListener("input", render);
  filter.addEventListener("change", render);
  document.querySelectorAll("[data-current-year]").forEach(el => el.textContent = new Date().getFullYear());
  render();
});
