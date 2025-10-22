document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("loggedInUser");
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Display username
  const userDisplay = document.getElementById("userDisplay");
  const topbarName = document.getElementById("topbarName");
  if (userDisplay) userDisplay.textContent = user;
  if (topbarName) topbarName.textContent = user;

  // Display profile avatar if exists
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const currentUser = users.find(u => u.username === user);
  const profileAvatar = document.querySelector(".profile .avatar");

  if (profileAvatar && currentUser && currentUser.avatar) {
    profileAvatar.innerHTML = `<img src="${currentUser.avatar}" 
      alt="Avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.5);" />`;
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // remove from online list
      try {
        const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
        const updated = (raw || []).filter(item => {
          if (typeof item === 'string') return item !== user;
          return item.username !== user;
        });
        localStorage.setItem('onlineUsers', JSON.stringify(updated));
        try { window.Realtime.write('onlineUsers', updated); } catch(e) {}
      } catch (err) {
        // ignore
      }
      localStorage.removeItem("loggedInUser");
      window.location.href = "index.html";
    });
  }

  // Keep alive: update lastSeen timestamp every 20s so other tabs can see this user as online
  const keepAlive = () => {
    const now = Date.now();
    const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
    let normalized = Array.isArray(raw) ? raw : [];

    // convert legacy strings to objects
    normalized = normalized.map(i => (typeof i === 'string' ? { username: i, lastSeen: 0 } : i));

    const found = normalized.find(i => i.username === user);
    if (found) found.lastSeen = now; else normalized.push({ username: user, lastSeen: now });

    localStorage.setItem('onlineUsers', JSON.stringify(normalized));
    try { window.Realtime.write('onlineUsers', normalized); } catch(e) {}
  };

  keepAlive();
  const kaInterval = setInterval(keepAlive, 20 * 1000);

  // Clear presence on unload
  window.addEventListener('beforeunload', () => {
    try {
      const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updated = (raw || []).filter(item => (typeof item === 'string' ? item !== user : item.username !== user));
      localStorage.setItem('onlineUsers', JSON.stringify(updated));
      try { window.Realtime.write('onlineUsers', updated); } catch(e) {}
    } catch (err) {}
    clearInterval(kaInterval);
  });
});
