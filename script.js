const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7mqmWLc3NZ2PuKyxKeVXMqlGS0UJyKzkB-UeaToD4ikfA55xCOGZ-iqqHGt1PMdPc6haf3r0sOeVl/pub?gid=174964900&single=true&output=csv";

async function getData() {
  const res = await fetch(SHEET_URL + "&t=" + Date.now(), {
    cache: "no-store"
  });

  const text = await res.text();

  const rows = text.trim().split("\n").map(r => r.split(","));

    let headers = rows[0].map(h =>
    h.replace(/[\r\n]/g, "").trim()
  );
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
      <th>Status</th>
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
<td class="paddle-row">
  ${p.golfers.map(g => getPaddle(g.status)).join("")}
</td>
     <td>${p.totalRaw}</td>
    `;

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
}

function renderMobile() {
  console.log("MOBILE DATA:", window.currentData);
  const container = document.getElementById("mobileLeaderboard");
  container.innerHTML = "";

  const players = window.currentData;

  const leaderScore = players[0]?.total ?? 0;

  players.forEach((p, i) => {
    const diff = p.total - leaderScore;

    const card = document.createElement("div");
    card.classList.add("mobile-card");
    card.style.cursor = "pointer";

    card.innerHTML = `
      <div class="mobile-left">
<div class="mobile-top">
  <span class="mobile-rank">${i + 1}</span>
  <span class="mobile-name">${p.name}</span>
</div>

<div class="mobile-paddles">
  ${p.golfers.map(g => getPaddle(g.status)).join("")}
</div>
      </div>

      <div class="mobile-right">
        <div class="mobile-score">${p.totalRaw}</div>
        <div class="mobile-behind">
          ${diff === 0 ? "E" : diff > 0 ? "+" + diff : diff}
        </div>
      </div>
    `;

 card.addEventListener("click", () => {
  openModal(p);
});

    container.appendChild(card);
  });
}

async function refreshLeaderboard() {
  const { headers, data } = await getData();

  const idx = (name) => headers.indexOf(name);

  const processed = data.map(row => ({
    name: row[idx("Entrant")],

    golfers: [
      {
        name: row[idx("USA Pick")],
        score: normaliseScore(row[idx("USA Score")]),
        status: parseInt(row[idx("USA toCut")]) || 0
      },
      {
        name: row[idx("EU Pick")],
        score: normaliseScore(row[idx("EU Score")]),
        status: parseInt(row[idx("EU toCut")]) || 0
      },
      {
        name: row[idx("ROW Pick")],
        score: normaliseScore(row[idx("ROW Score")]),
        status: parseInt(row[idx("ROW toCut")]) || 0  
      },
      {
        name: row[idx("Over50 Pick")],
        score: normaliseScore(row[idx("Over50 Score")]),
        status: parseInt(row[idx("Over50 toCut")]) || 0
      }
    ],

    totalRaw: row[idx("Total Score")],
    total: normaliseScore(row[idx("Total Score")])
  }));

  window.currentData = processed;

  processed.sort((a, b) => a.total - b.total);

  renderDesktop(processed);
  renderMobile(processed);
console.log(headers.map(h => ({
  raw: h,
  json: JSON.stringify(h)
})));

  document.getElementById("updated").textContent =
    "Updated: " + new Date().toLocaleTimeString();
}
document.addEventListener("DOMContentLoaded", () => {
  refreshLeaderboard();

  // auto refresh every 30 seconds
  setInterval(refreshLeaderboard, 30000);
});

function openModal(player) {
  document.getElementById("modalName").textContent = player.name;

  const body = document.getElementById("modalBody");
  body.innerHTML = "";

  player.golfers.forEach(g => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
      ${getPaddle(g.status)}
      ${g.name}</td>
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
    const i = parseInt(e.target.dataset.index);
    openModal(window.currentData[i]); // look up by index here instead
  }

  if (e.target.classList.contains("close")) {
    document.getElementById("playerModal").classList.add("hidden");
  }
});

function getPaddle(status) {
  if (status > 0) {
    return '<span class="paddle green"></span>';
  }

  if (status < 0) {
    return '<span class="paddle red"></span>';
  }

  return '<span class="paddle yellow"></span>';
}