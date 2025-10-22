document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) return window.location.href = "index.html";

  const topbarName = document.getElementById("topbarName");
  const userDisplay = document.getElementById("userDisplay");
  if (topbarName) topbarName.textContent = loggedInUser;
  if (userDisplay) userDisplay.textContent = loggedInUser;

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

  const liveItemsDiv = document.getElementById("liveItems");

  function loadLiveMatches() {
    const liveMatches = JSON.parse(localStorage.getItem("liveMatches")) || [];
    liveItemsDiv.innerHTML = "";

    if (liveMatches.length === 0) {
      liveItemsDiv.innerHTML = '<p class="muted">No live items currently</p>';
      return;
    }

    liveMatches.forEach((match, idx) => {
      const div = document.createElement("div");
      div.className = "liveMatchCard";
      div.innerHTML = `
        <div class="teams">
          <div class="team">
            ${match.logoA ? `<img src="${match.logoA}" />` : `<div class="placeholderLogo"></div>`}
            <span>${match.teamA}</span>
          </div>
          <span class="vsText">VS</span>
          <div class="team">
            ${match.logoB ? `<img src="${match.logoB}" />` : `<div class="placeholderLogo"></div>`}
            <span>${match.teamB}</span>
          </div>
        </div>
        <div class="matchTime">Start: ${new Date(match.datetime).toLocaleString()}</div>
        <div class="liveBadge">LIVE</div>
      `;

      // Only Hemal sees the delete button
      if (loggedInUser === "Hemal") {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "deleteLiveBtn";
        deleteBtn.style.marginTop = "6px";
        deleteBtn.addEventListener("click", () => {
          if (!confirm("Delete this live match from storage?")) return;
          const liveMatches = JSON.parse(localStorage.getItem('liveMatches') || '[]');
          liveMatches.splice(idx, 1);
          localStorage.setItem("liveMatches", JSON.stringify(liveMatches));
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'liveMatches', newValue: JSON.stringify(liveMatches) })); } catch(e) {}
          try { window.Realtime.write('liveMatches', liveMatches); } catch(e) {}
          loadLiveMatches();
        });
        div.appendChild(deleteBtn);
      }

      liveItemsDiv.appendChild(div);
    });
  }

  (async function init(){
    try {
      const remote = await window.Realtime.readOnce('liveMatches');
      if(remote) localStorage.setItem('liveMatches', JSON.stringify(remote));
    } catch(e) {}
    loadLiveMatches();

    try { window.Realtime.subscribe('liveMatches', (val)=>{ localStorage.setItem('liveMatches', JSON.stringify(val || [])); loadLiveMatches(); }); } catch(e) {}

    // Optional: refresh every 10s to update live matches dynamically
    setInterval(loadLiveMatches, 10000);
    // Update when liveMatches change in other tabs (fallback)
    window.addEventListener('storage', (e) => { if (e.key === 'liveMatches') loadLiveMatches(); });
  })();

  // Show Admin button only for Hemal (ensure element exists)
  const adminBtn = document.getElementById("adminBtn");
  if (adminBtn && loggedInUser === "Hemal") {
    adminBtn.style.display = "inline-block";
    adminBtn.addEventListener("click", () => { window.location.href = "admin.html"; });
  }
});
