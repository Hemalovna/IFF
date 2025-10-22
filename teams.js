document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) return window.location.href = "index.html";

  const adminUsers = ["Hemal", "Admin"]; // Add more admins here if needed
  const isAdmin = adminUsers.includes(loggedInUser);

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    try {
      const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updated = (raw || []).filter(item => (typeof item === 'string' ? item !== loggedInUser : item.username !== loggedInUser));
      localStorage.setItem('onlineUsers', JSON.stringify(updated));
      try { window.Realtime.write('onlineUsers', updated); } catch(e) {}
    } catch (err) {}
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  const seasonsList = document.getElementById("seasonsList");
  const addSeasonBtn = document.getElementById("addSeasonBtn");
  const seasonNameInput = document.getElementById("seasonName");

  const teamsList = document.getElementById("teamsList");
  const addTeamBtn = document.getElementById("addTeamBtn");
  const teamNameInput = document.getElementById("teamName");
  const teamFlagInput = document.getElementById("teamFlag");

  let seasons = JSON.parse(localStorage.getItem("seasons")) || [];
  let teams = JSON.parse(localStorage.getItem("teams")) || [];

  function saveData() {
    localStorage.setItem("seasons", JSON.stringify(seasons));
    localStorage.setItem("teams", JSON.stringify(teams));
    try { window.Realtime.write('seasons', seasons); } catch(e) {}
    try { window.Realtime.write('teams', teams); } catch(e) {}
  }

  function getActiveSeason() {
    return seasons.find(s => s.active);
  }

  // ------------------ Seasons ------------------
  function renderSeasons() {
    seasonsList.innerHTML = "";
    seasons.forEach((s, idx) => {
      const div = document.createElement("div");
      div.className = "seasonItem";

      let actionBtnHTML = "";
      if (isAdmin) {
        actionBtnHTML = `<button class="seasonActionBtn">${s.active ? "End" : "Delete"}</button>`;
      }

      div.innerHTML = `<span>${s.name} ${s.active ? "(Active)" : "(Ended)"}</span> ${actionBtnHTML}`;
      seasonsList.appendChild(div);

      if (isAdmin) {
        const btn = div.querySelector(".seasonActionBtn");
        btn.addEventListener("click", () => {
          if (s.active) {
            s.active = false;
          } else {
            if (!confirm("Delete this season? All teams in this season will also be deleted.")) return;
            teams = teams.filter(t => !s.teams.includes(t.id));
            seasons.splice(idx, 1);
          }
          saveData();
          renderSeasons();
          renderTeams();
        });
      }
    });
  }

  addSeasonBtn.addEventListener("click", async () => {
    if (!isAdmin) return alert("Only Hemal can add seasons!");
    const name = seasonNameInput.value.trim();
    if (!name) return alert("Enter season name!");
    const newSeason = { id: Date.now().toString(), name, active: true, teams: [] };
    seasons.push(newSeason);
    saveData();
    seasonNameInput.value = "";
    renderSeasons();
    renderTeams();
  });

  // ------------------ Teams ------------------
  function renderTeams() {
    teamsList.innerHTML = "";
    const activeSeason = getActiveSeason();
    if (!activeSeason) return;

    const seasonTeams = teams.filter(t => activeSeason.teams.includes(t.id));
    seasonTeams.forEach((t, idx) => {
      const div = document.createElement("div");
      div.className = "teamItem";

      const teamFlagHTML = t.flag ? `<img src="${t.flag}" width="40" height="40"/>` : "";
      let deleteBtnHTML = isAdmin ? `<button class="deleteBtn">Delete</button>` : "";

      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px">
          ${teamFlagHTML} <span>${t.name}</span>
        </div>
        <div class="teamButtons">
          <button class="editBtn">Players</button>
          ${deleteBtnHTML}
        </div>
      `;
      teamsList.appendChild(div);

      // ------------------ Delete team ------------------
      if (isAdmin) {
        const deleteBtn = div.querySelector(".deleteBtn");
        deleteBtn.addEventListener("click", () => {
          if (!confirm("Delete this team?")) return;
          teams = teams.filter(team => team.id !== t.id);
          activeSeason.teams = activeSeason.teams.filter(id => id !== t.id);
          saveData();
          renderTeams();
        });
      }

      // ------------------ Edit players ------------------
      const editBtn = div.querySelector(".editBtn");
      editBtn.addEventListener("click", () => {
        if (!activeSeason.active) return alert("Cannot edit players. Season ended!");
        if (!isAdmin) return alert("Only Hemal can add players!");

        const playerName = prompt("Player name:");
        if (!playerName) return;
        const role = prompt("Role: fielder or goalkeeper?").toLowerCase();
        if (!["fielder", "goalkeeper"].includes(role)) return alert("Invalid role");
        const isCaptain = confirm("Make this player captain?");

        t.players = t.players || [];
        if (isCaptain) t.players.forEach(p => p.captain = false);
        t.players.push({ name: playerName, role, captain: isCaptain });
        saveData();
        renderTeams();
      });

      // ------------------ Show players ------------------
      const playerDiv = document.createElement("div");
      playerDiv.style.paddingLeft = "12px";
      playerDiv.style.marginTop = "4px";

      if (t.players && t.players.length) {
        t.players.forEach((p, pIdx) => {
          const pItem = document.createElement("div");
          pItem.style.display = "flex";
          pItem.style.justifyContent = "space-between";
          pItem.style.alignItems = "center";
          pItem.style.marginTop = "2px";

          let deleteButtonHTML = "";
          if (isAdmin) {
            deleteButtonHTML = `<button style="padding:2px 6px;font-size:0.75rem;">Delete</button>`;
          }

          pItem.innerHTML = `<span>${p.name} (${p.role}) ${p.captain ? "[Captain]" : ""}</span> ${deleteButtonHTML}`;

          if (isAdmin) {
            const delP = pItem.querySelector("button");
            delP.addEventListener("click", () => {
              t.players.splice(pIdx, 1);
              saveData();
              renderTeams();
            });
          }

          playerDiv.appendChild(pItem);
        });
      }

      div.appendChild(playerDiv);
    });
  }

  // ------------------ Add team ------------------
  addTeamBtn.addEventListener("click", async () => {
    if (!isAdmin) return alert("Only Hemal can add teams!");
    const activeSeason = getActiveSeason();
    if (!activeSeason) return alert("No active season. Add one first.");
    const name = teamNameInput.value.trim();
    if (!name) return alert("Enter team name!");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const newTeam = { id: Date.now().toString(), name, flag: e.target.result, players: [] };
      teams.push(newTeam);
      activeSeason.teams.push(newTeam.id);
      saveData();
      teamNameInput.value = "";
      teamFlagInput.value = "";
      renderTeams();
    };

    if (teamFlagInput.files[0]) reader.readAsDataURL(teamFlagInput.files[0]);
    else reader.onload({ target: { result: null } });
  });

  // ------------------ Initial render ------------------
  (async function init(){
    const remoteSeasons = await window.Realtime.readOnce('seasons');
    const remoteTeams = await window.Realtime.readOnce('teams');
    seasons = remoteSeasons || seasons;
    teams = remoteTeams || teams;
    renderSeasons();
    renderTeams();
    try { window.Realtime.subscribe('seasons', ()=>{ seasons = JSON.parse(localStorage.getItem('seasons')||'[]'); renderSeasons(); renderTeams(); }); } catch(e) {}
    try { window.Realtime.subscribe('teams', ()=>{ teams = JSON.parse(localStorage.getItem('teams')||'[]'); renderTeams(); }); } catch(e) {}
    window.addEventListener('storage', (e)=>{ if(e.key==='seasons' || e.key==='teams') { seasons = JSON.parse(localStorage.getItem('seasons')||'[]'); teams = JSON.parse(localStorage.getItem('teams')||'[]'); renderSeasons(); renderTeams(); } });
  })();
});
