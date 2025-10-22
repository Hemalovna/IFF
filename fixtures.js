document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) return window.location.href = "index.html";

  const allowedUsers = ["Hemal"]; // Admin users
  const isAdmin = allowedUsers.includes(loggedInUser);

  let teams = JSON.parse(localStorage.getItem("teams")) || [];
  let seasons = JSON.parse(localStorage.getItem("seasons")) || [];
  let matches = JSON.parse(localStorage.getItem("matches")) || [];

  const seasonSelect = document.getElementById("seasonSelect");
  const teamASelect = document.getElementById("teamASelect");
  const teamBSelect = document.getElementById("teamBSelect");
  const matchDateTime = document.getElementById("matchDateTime");
  const addMatchBtn = document.getElementById("addMatchBtn");
  const matchesContainer = document.getElementById("matchesContainer");
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    try {
      const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updated = (raw || []).filter(item => (typeof item === 'string' ? item !== loggedInUser : item.username !== loggedInUser));
      localStorage.setItem('onlineUsers', JSON.stringify(updated));
      try { window.Realtime.write('onlineUsers', updated); } catch(e) {}
    } catch (err) {}
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  async function saveMatches() {
    try { await window.Realtime.write('matches', matches); } catch(e) {}
    localStorage.setItem("matches", JSON.stringify(matches));
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'matches', newValue: JSON.stringify(matches) })); } catch(e) {}
  }

  function loadSeasons() {
    seasonSelect.innerHTML = "";
    seasons.filter(s => s.active).forEach(s => {
      const option = document.createElement("option");
      option.value = s.id;
      option.textContent = s.name;
      seasonSelect.appendChild(option);
    });
  }

  function loadTeams() {
    teamASelect.innerHTML = "";
    teamBSelect.innerHTML = "";
    teams.forEach(t => {
      teamASelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
      teamBSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
  }

  function renderMatches() {
    matchesContainer.innerHTML = "";
    matches.forEach(match => {
      const teamA = teams.find(t => t.id == match.teamAId);
      const teamB = teams.find(t => t.id == match.teamBId);

      const div = document.createElement("div");
      div.className = "matchCard";

      div.innerHTML = `
        <div style="display:flex;gap:20px;align-items:center;">
          <div style="text-align:center;">
            <img src="${teamA?.flag||''}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
            <div>${match.teamAName}</div>
          </div>
          <span style="font-weight:bold;">VS</span>
          <div style="text-align:center;">
            <img src="${teamB?.flag||''}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
            <div>${match.teamBName}</div>
          </div>
        </div>
        <div>Date: ${new Date(match.datetime).toLocaleString()}</div>
        <div>Status: ${match.active ? "Live" : "Ended"}</div>
        <div class="matchActions" style="margin-top:8px;"></div>
      `;

      const actions = div.querySelector(".matchActions");

      if (isAdmin && !match.active) {
        const startBtn = document.createElement("button");
        startBtn.textContent = "Start Match";
        startBtn.addEventListener("click", () => {
          match.active = true;
          saveMatches();
          updateLiveMatches(match, true);
          renderMatches();
        });
        actions.appendChild(startBtn);
      }

      if (isAdmin && match.active) {
        const endBtn = document.createElement("button");
        endBtn.textContent = "End Match";
        endBtn.addEventListener("click", async () => {
          match.active = false;

          match.scoreA = parseInt(prompt(`Goals scored by ${match.teamAName}:`)) || 0;
          match.scoreB = parseInt(prompt(`Goals scored by ${match.teamBName}:`)) || 0;

          match.goals = { [match.teamAName]: [], [match.teamBName]: [] };
          match.assists = { [match.teamAName]: [], [match.teamBName]: [] };

          for (let i = 0; i < match.scoreA; i++) {
            const scorer = prompt(`Goal scorer #${i+1} for ${match.teamAName}:`);
            const assist = prompt("Assist by? (leave blank if none)");
            if (scorer) match.goals[match.teamAName].push(scorer);
            if (assist) match.assists[match.teamAName].push(assist);
          }
          for (let i = 0; i < match.scoreB; i++) {
            const scorer = prompt(`Goal scorer #${i+1} for ${match.teamBName}:`);
            const assist = prompt("Assist by? (leave blank if none)");
            if (scorer) match.goals[match.teamBName].push(scorer);
            if (assist) match.assists[match.teamBName].push(assist);
          }

          // --- Goalkeeper selection via dropdown ---
          match.gkStats = { [match.teamAName]: {}, [match.teamBName]: {} };

          [[match.teamAId, match.teamAName, match.scoreB], [match.teamBId, match.teamBName, match.scoreA]].forEach(([teamId, teamName, concededGoals]) => {
            const team = teams.find(t => t.id == teamId);
            const gks = (team.players || []).filter(p => p.role === "goalkeeper");

            if (gks.length === 0) return;

            let selectedGK = prompt(`Select GK for ${teamName}:\n${gks.map((g, i) => `${i+1}: ${g.name}`).join("\n")}`);
            selectedGK = parseInt(selectedGK);
            if (!selectedGK || selectedGK < 1 || selectedGK > gks.length) selectedGK = 1;
            const gkName = gks[selectedGK - 1].name;

            const saves = parseInt(prompt(`Enter saves for GK ${gkName}:`)) || 0;
            match.gkStats[teamName][gkName] = { saved: saves, conceded: concededGoals };
          });

          // Penalties
          match.penalties = [];
          let addPenalty = confirm("Add a penalty?");
          while (addPenalty) {
            const team = prompt("Team of player?");
            const player = prompt("Player name?");
            const minute = prompt("Minute?");
            const reason = prompt("Reason?");
            if (team && player && minute && reason) match.penalties.push({ team, player, min: minute, reason });
            addPenalty = confirm("Add another penalty?");
          }

          saveMatches();
          updateLiveMatches(match, false);
          renderMatches();
        });
        actions.appendChild(endBtn);
      }

      matchesContainer.appendChild(div);
    });
  }

  async function updateLiveMatches(match, add = true) {
    let liveMatches = JSON.parse(localStorage.getItem("liveMatches")) || [];
    if (add) {
      liveMatches.push({ matchId: match.id, teamA: match.teamAName, teamB: match.teamBName, datetime: match.datetime });
    } else {
      liveMatches = liveMatches.filter(m => m.matchId !== match.id);
    }
    try { await window.Realtime.write('liveMatches', liveMatches); } catch(e) {}
    localStorage.setItem("liveMatches", JSON.stringify(liveMatches));
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'liveMatches', newValue: JSON.stringify(liveMatches) })); } catch(e) {}
  }

  if (addMatchBtn) addMatchBtn.addEventListener("click", () => {
    if (!isAdmin) return alert("Only Hemal can add matches!");

    const seasonId = seasonSelect.value;
    const teamAId = teamASelect.value;
    const teamBId = teamBSelect.value;
    const datetime = matchDateTime.value;

    if (!seasonId || !teamAId || !teamBId || !datetime) return alert("Fill all fields!");

    const teamAName = teams.find(t => t.id == teamAId)?.name;
    const teamBName = teams.find(t => t.id == teamBId)?.name;

    matches.push({
      id: Date.now(),
      seasonId,
      teamAId, teamBId,
      teamAName, teamBName,
      datetime,
      active: false,
      scoreA: 0, scoreB: 0,
      goals: {}, assists: {},
      gkStats: {}, penalties: []
    });

    saveMatches();
    renderMatches();
  });

  (async function init() {
    // try to load from realtime backend first
    try {
      const [rMatches, rTeams, rSeasons] = await Promise.all([
        window.Realtime.readOnce('matches'),
        window.Realtime.readOnce('teams'),
        window.Realtime.readOnce('seasons')
      ]);
      matches = rMatches || matches;
      teams = rTeams || teams;
      seasons = rSeasons || seasons;
    } catch (err) {}

    loadSeasons();
    loadTeams();
    renderMatches();

    // subscribe to remote changes
    window.Realtime.subscribe('matches', (val) => { matches = val || []; renderMatches(); });
    window.Realtime.subscribe('liveMatches', (val) => { /* can update live UI if needed */ });
    window.Realtime.subscribe('teams', (val) => { teams = val || teams; loadTeams(); renderMatches(); });
    window.Realtime.subscribe('seasons', (val) => { seasons = val || seasons; loadSeasons(); renderMatches(); });

    // local storage fallback listener for other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'matches' || e.key === 'liveMatches' || e.key === 'teams' || e.key === 'seasons') {
        matches = JSON.parse(localStorage.getItem('matches')) || matches;
        teams = JSON.parse(localStorage.getItem('teams')) || teams;
        seasons = JSON.parse(localStorage.getItem('seasons')) || seasons;
        renderMatches();
      }
    });
  })();
});
