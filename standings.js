document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) return window.location.href = "index.html";

  const users = JSON.parse(localStorage.getItem("users")) || [];
  let matches = JSON.parse(localStorage.getItem("matches")) || [];
  let seasons = JSON.parse(localStorage.getItem("seasons")) || [];
  let teams = JSON.parse(localStorage.getItem("teams")) || [];

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

  const seasonSelect = document.getElementById("seasonSelect");
  const teamTableBody = document.querySelector("#teamStandingsTable tbody");
  const fielderTableBody = document.querySelector("#fielderTable tbody");
  const goalkeeperTableBody = document.querySelector("#goalkeeperTable tbody");

  function populateSeasons() {
    seasonSelect.innerHTML = "";
    seasons.forEach(season => {
      const option = document.createElement("option");
      option.value = season.id;
      option.textContent = season.name;
      seasonSelect.appendChild(option);
    });
    if (seasons.length > 0) renderStandings(seasons[0].id);
  }

  function renderStandings(seasonId) {
    const seasonMatches = matches.filter(m => m.seasonId === seasonId);

    const teamsStats = {};
    const fieldersStats = {};
    const gkStats = {};

    seasonMatches.forEach(match => {
      const { teamAName, teamBName, scoreA, scoreB, goals = {}, assists = {}, gkStats: matchGK = {}, penalties = [] } = match;

      // ----- Teams Stats -----
      [[teamAName, scoreA, scoreB], [teamBName, scoreB, scoreA]].forEach(([team, gf, ga]) => {
        if (!teamsStats[team]) teamsStats[team] = { MP:0, W:0, D:0, L:0, GF:0, GA:0, Pts:0 };
        teamsStats[team].MP++;
        teamsStats[team].GF += gf;
        teamsStats[team].GA += ga;
      });

      // Match result
      if (scoreA > scoreB) {
        teamsStats[teamAName].W++; teamsStats[teamAName].Pts += 3; teamsStats[teamBName].L++;
      } else if (scoreB > scoreA) {
        teamsStats[teamBName].W++; teamsStats[teamBName].Pts += 3; teamsStats[teamAName].L++;
      } else {
        teamsStats[teamAName].D++; teamsStats[teamBName].D++;
        teamsStats[teamAName].Pts++; teamsStats[teamBName].Pts++;
      }

      // ----- Fielders Stats -----
      for (const team in goals) {
        goals[team].forEach(p => {
          if (!fieldersStats[p]) fieldersStats[p] = { Team: team, G:0, A:0, P:0 };
          fieldersStats[p].G++;
        });
        if (assists[team]) assists[team].forEach(p => {
          if (!fieldersStats[p]) fieldersStats[p] = { Team: team, G:0, A:0, P:0 };
          fieldersStats[p].A++;
        });
      }

      // Penalties
      penalties.forEach(p => {
        if (!fieldersStats[p.player]) fieldersStats[p.player] = { Team: p.team, G:0, A:0, P:0 };
        fieldersStats[p.player].P++;
      });

      // ----- Goalkeepers Stats -----
      [[teamAName, teamBName, scoreB], [teamBName, teamAName, scoreA]].forEach(([team, oppTeam, oppScore]) => {
        const teamGKs = matchGK[team] || {};
        const gkNames = Object.keys(teamGKs);

        if (gkNames.length > 0) {
          // GK stats exist
          gkNames.forEach(gk => {
            if (!gkStats[gk]) gkStats[gk] = { Team: team, Saves: 0, Conceded: 0 };
            gkStats[gk].Saves += teamGKs[gk].saved || 0;
            gkStats[gk].Conceded += teamGKs[gk].conceded || 0;
          });
        } else {
          // No GK stats entered, assume all goals conceded go to team GK(s)
          const teamData = teams.find(t => t.name === team);
          const gks = (teamData?.players || []).filter(p => p.role === "goalkeeper");
          if (gks.length > 0) {
            const perGk = Math.floor(oppScore / gks.length);
            gks.forEach(gk => {
              if (!gkStats[gk.name]) gkStats[gk.name] = { Team: team, Saves: 0, Conceded: 0 };
              gkStats[gk.name].Conceded += perGk;
            });
          } else {
            // No GK data, fallback to team name
            if (!gkStats[team]) gkStats[team] = { Team: team, Saves: 0, Conceded: 0 };
            gkStats[team].Conceded += oppScore;
          }
        }
      });
    });

    // ----- Render Team Standings -----
    teamTableBody.innerHTML = "";
    Object.keys(teamsStats)
      .sort((a, b) => teamsStats[b].Pts - teamsStats[a].Pts || teamsStats[b].GF - teamsStats[a].GF)
      .forEach(team => {
        const t = teamsStats[team];
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${team}</td><td>${t.MP}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td><td>${t.GF}</td><td>${t.GA}</td><td>${t.Pts}</td>`;
        teamTableBody.appendChild(tr);
      });

    // ----- Render Fielders -----
    fielderTableBody.innerHTML = "";
    Object.keys(fieldersStats).forEach(p => {
      const f = fieldersStats[p];
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${p}</td><td>${f.Team}</td><td>${f.G}</td><td>${f.A}</td><td>${f.P}</td>`;
      fielderTableBody.appendChild(tr);
    });

    // ----- Render Goalkeepers -----
    goalkeeperTableBody.innerHTML = "";
    Object.keys(gkStats).forEach(gk => {
      const g = gkStats[gk];
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${gk}</td><td>${g.Team}</td><td>${g.Saves}</td><td>${g.Conceded}</td>`;
      goalkeeperTableBody.appendChild(tr);
    });
  }

  seasonSelect.addEventListener("change", () => renderStandings(seasonSelect.value));

  (async function init(){
    try {
      const [rMatches, rTeams, rSeasons] = await Promise.all([
        window.Realtime.readOnce('matches'),
        window.Realtime.readOnce('teams'),
        window.Realtime.readOnce('seasons')
      ]);
      matches = rMatches || matches;
      teams = rTeams || teams;
      seasons = rSeasons || seasons;
    } catch(e) {}

    populateSeasons();
    // subscribe to remote changes
    try { window.Realtime.subscribe('matches', (val)=>{ matches = val || JSON.parse(localStorage.getItem('matches')||'[]'); renderStandings(seasonSelect.value || (seasons[0] && seasons[0].id)); }); } catch(e) {}
    try { window.Realtime.subscribe('teams', (val)=>{ teams = val || JSON.parse(localStorage.getItem('teams')||'[]'); renderStandings(seasonSelect.value || (seasons[0] && seasons[0].id)); }); } catch(e) {}
    try { window.Realtime.subscribe('seasons', (val)=>{ seasons = val || JSON.parse(localStorage.getItem('seasons')||'[]'); populateSeasons(); }); } catch(e) {}

    // refresh when shared data changes (localStorage fallback)
    window.addEventListener('storage', (e) => {
      if (['matches','teams','seasons'].includes(e.key)) {
        matches = JSON.parse(localStorage.getItem('matches')) || matches;
        teams = JSON.parse(localStorage.getItem('teams')) || teams;
        seasons = JSON.parse(localStorage.getItem('seasons')) || seasons;
        renderStandings(seasonSelect.value || (seasons[0] && seasons[0].id));
      }
    });
  })();
});
