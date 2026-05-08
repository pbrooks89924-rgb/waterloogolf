const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7mqmWLc3NZ2PuKyxKeVXMqlGS0UJyKzkB-UeaToD4ikfA55xCOGZ-iqqHGt1PMdPc6haf3r0sOeVl/pub?gid=174964900&single=true&output=csv";

async function getData() {
  const res = await fetch(SHEET_URL + "&t=" + Date.now(), {
    cache: "no-store"
  });

  const text = await res.text();

  const rows = text.trim().split("\n").map(r => r.split(","));

  const headers = rows[0];
  const data = rows.slice(1);

  return { headers, data };
}

function normaliseScore(v) {
  if (v === "E") return 0;
  if (v === "CUT") return 999;
  if (v === "WD") return 999;

  const n = parseFloat(v);
  return isNaN(n) ? 999 : n;
}

function renderDesktop(players) {
  const table = document.getElementById("leaderboard");

  table.innerHTML = "";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Name</th>
      <th>Score</th>
    </tr>
  `;

  const tbody = document.createElement("tbody");

  players.forEach((p, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i + 1}</td>
     <td class="entrant-name" data-index="${i}">
  ${p.name}
</td>
      <td>${p.scoreRaw}</td>
    `;

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
}

function renderMobile(players) {
  const container = document.getElementById("mobileLeaderboard");
  container.innerHTML = "";

  const leaderScore = players[0]?.score ?? 0;

  players.forEach((p, i) => {
    const diff = p.score - leaderScore;

    const card = document.createElement("div");
    card.className = "mobile-card";

    card.innerHTML = `
      <div class="mobile-left">
        <div class="mobile-top">
          <span class="mobile-rank">${i + 1}</span>
          <span class="mobile-name">${p.name}</span>
        </div>
      </div>

      <div class="mobile-right">
        <div class="mobile-score">${p.scoreRaw}</div>
        <div class="mobile-behind">
          ${diff === 0 ? "E" : diff > 0 ? "+" + diff : diff}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

async function refreshLeaderboard() {
  const { data } = await getData();

  // First row = headers
  const headers = data[0];
  const rows = data.slice(1);

  // helper: get column index by name
  const idx = (name) => headers.indexOf(name);

  const processed = rows.map(row => ({
    name: row[idx("Entrant")],

    golfers: [
      {
        name: row[idx("USA Pick")],
        score: normaliseScore(row[idx("USA Score")])
      },
      {
        name: row[idx("EU Pick")],
        score: normaliseScore(row[idx("EU Score")])
      },
      {
        name: row[idx("ROW Pick")],
        score: normaliseScore(row[idx("ROW Score")])
      },
      {
        name: row[idx("Over50 Pick")],
        score: normaliseScore(row[idx("Over50 Score")])
      }
    ],

    totalRaw: row[idx("Total Score")],
    total: normaliseScore(row[idx("Total Score")])
  }));

  window.currentData = processed;

  // sort by total score
  processed.sort((a, b) => a.total - b.total);

  renderDesktop(processed);
  renderMobile(processed);

  document.getElementById("updated").textContent =
    "Updated: " + new Date().toLocaleTimeString();
}

document.addEventListener("DOMContentLoaded", () => {
  refreshLeaderboard();

  // auto refresh every 30 seconds
  setInterval(refreshLeaderboard, 30000);
});

function openModal(index) {
  const player = window.currentData[index];

  document.getElementById("modalName").textContent = player.name;

  const body = document.getElementById("modalBody");
  body.innerHTML = "";

  player.golfers.forEach(g => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${g.name}</td>
      <td>${g.scoreRaw ?? g.score}</td>
    `;

    body.appendChild(tr);
  });

  document.getElementById("modalTotal").textContent =
    "Total: " + player.totalRaw;

  document.getElementById("playerModal").classList.remove("hidden");
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("entrant-name")) {
    openModal(e.target.dataset.index);
  }

  if (e.target.classList.contains("close")) {
    document.getElementById("playerModal").classList.add("hidden");
  }
});