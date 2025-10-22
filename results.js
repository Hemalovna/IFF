document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if(!loggedInUser) return window.location.href="index.html";

  const allowedUsers = ["Hemal", "Admin"];
  const isAdmin = allowedUsers.includes(loggedInUser);

  document.getElementById("topbarName").textContent = loggedInUser;

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    try {
      const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updated = (raw || []).filter(item => (typeof item === 'string' ? item !== loggedInUser : item.username !== loggedInUser));
      localStorage.setItem('onlineUsers', JSON.stringify(updated));
    } catch (err) {}
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  const resultsContainer = document.getElementById("resultsContainer");
  const teams = JSON.parse(localStorage.getItem("teams")) || [];

  async function loadResults() {
    const remote = await window.Realtime.readOnce('matches');
    const matches = remote || JSON.parse(localStorage.getItem("matches")) || [];
    resultsContainer.innerHTML = "";

    const endedMatches = matches.filter(m => !m.active);
    endedMatches.forEach(m => {
      const div = document.createElement("div");
      div.className = "resultCard";

      // Get team logos
      const teamA = teams.find(t => t.id == m.teamAId);
      const teamB = teams.find(t => t.id == m.teamBId);

      let goalsHTML = '';
      for(const team in m.goals){
        goalsHTML += `<h3>${team} Goals: ${m.goals[team].join(", ") || "None"}</h3>`;
        goalsHTML += `<h3>${team} Assists: ${m.assists[team]?.join(", ") || "None"}</h3>`;
      }

      let gkHTML = '';
      for(const team in m.gkStats){
        gkHTML += `<h3>${team} GK Stats:</h3>`;
        for(const gk in m.gkStats[team]){
          const s = m.gkStats[team][gk];
          gkHTML += `<p>${gk}: Saved ${s.saved}, Conceded ${s.conceded}</p>`;
        }
      }

      let penHTML = '';
      if(m.penalties?.length){
        penHTML = '<h3>Penalties:</h3>';
        m.penalties.forEach(p=>{
          penHTML += `<p>${p.team} - ${p.player} @ ${p.min} min (${p.reason})</p>`;
        });
      }

      div.innerHTML = `
        <div class="matchHeader" style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:8px;">
          <div style="text-align:center;">
            ${teamA?.flag ? `<img src="${teamA.flag}" style="width:50px;height:50px;border-radius:8px;"/>` : ''}
            <div>${m.teamAName}</div>
          </div>
          <div style="font-size:1.2rem;font-weight:bold;">${m.scoreA} - ${m.scoreB}</div>
          <div style="text-align:center;">
            ${teamB?.flag ? `<img src="${teamB.flag}" style="width:50px;height:50px;border-radius:8px;"/>` : ''}
            <div>${m.teamBName}</div>
          </div>
        </div>

        <div class="statsSection" style="margin-top:6px;">${goalsHTML}${gkHTML}${penHTML}</div>

        <div class="likesComments" style="margin-top:6px;">
          <button class="likeBtn" style="cursor:pointer;font-size:1.1rem;">${m.likes?.includes(loggedInUser)?"❤️":"🤍"}</button>
          <input class="commentInput" placeholder="Comment..." style="width:80%;padding:4px;margin-left:8px;border-radius:4px;">
          <button class="commentBtn" style="padding:4px 8px;margin-left:4px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">Add</button>
          <div class="commentsList" style="margin-top:4px;"></div>
          ${isAdmin?'<button class="deleteBtn" style="margin-top:6px;background:red;padding:4px 6px;border:none;border-radius:4px;color:white;cursor:pointer;">Delete Match</button>':''}
        </div>
      `;
      resultsContainer.appendChild(div);

      // Likes
      const likeBtn = div.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async ()=>{
        m.likes = m.likes || [];
        if(m.likes.includes(loggedInUser)) m.likes = m.likes.filter(u=>u!==loggedInUser);
        else m.likes.push(loggedInUser);
        localStorage.setItem("matches", JSON.stringify(matches));
        try { await window.Realtime.write('matches', matches); } catch(e) {}
        loadResults();
      });

      // Comments
      const commentBtn = div.querySelector(".commentBtn");
      const commentInput = div.querySelector(".commentInput");
      const commentsList = div.querySelector(".commentsList");
      commentsList.innerHTML = "";
      if(m.comments){
        m.comments.forEach(c=>{
          const p = document.createElement("div");
          p.className = "commentItem";
          p.textContent = `${c.user}: ${c.text}`;
          commentsList.appendChild(p);
        });
      }
      commentBtn.addEventListener("click", async ()=>{
        const text = commentInput.value.trim();
        if(!text) return;
        m.comments = m.comments || [];
        m.comments.push({user:loggedInUser,text});
        commentInput.value = "";
        localStorage.setItem("matches", JSON.stringify(matches));
        try { await window.Realtime.write('matches', matches); } catch(e) {}
        loadResults();
      });

      // Delete match
      const deleteBtn = div.querySelector(".deleteBtn");
      if(deleteBtn) deleteBtn.addEventListener("click", async ()=>{
        if(!confirm("Delete this match?")) return;
        const idx = matches.findIndex(match=>match.id===m.id);
        if(idx!==-1) matches.splice(idx,1);
        localStorage.setItem("matches", JSON.stringify(matches));
        try { await window.Realtime.write('matches', matches); } catch(e) {}
        loadResults();
      });
    });
  }
  (async function init() {
    await loadResults();
    window.Realtime.subscribe('matches', () => loadResults());
    window.addEventListener('storage', (e) => { if (e.key === 'matches') loadResults(); });
  })();
});
