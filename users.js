document.addEventListener('DOMContentLoaded', () => {
  const usersList = document.getElementById('usersList');
  const search = document.getElementById('userSearch');

  const loggedInUser = localStorage.getItem('loggedInUser');
  if (!loggedInUser) return window.location.href = 'index.html';

  const adminUsers = ["Hemal"]; // Only these users can delete accounts
  const isAdmin = adminUsers.includes(loggedInUser);

  function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
  }

  function getOnline() {
    // Online users may be stored as array of usernames (legacy) or
    // as array of { username, lastSeen } objects.
    const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
    const now = Date.now();
    const threshold = 45 * 1000; // consider online if seen within last 45s

    if (!Array.isArray(raw)) return [];
    // convert legacy array of strings
    const normalized = raw.map(item => {
      if (typeof item === 'string') return { username: item, lastSeen: 0 };
      return item;
    });

    // return usernames that have recent lastSeen or have 0 (treat as online)
    return normalized
      .filter(u => u.lastSeen === 0 || (now - (u.lastSeen || 0) < threshold))
      .map(u => u.username);
  }

  function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
    try { window.Realtime.write('users', users); } catch(e) {}
  }

  function render(filter = '') {
    usersList.innerHTML = '';
    const allUsers = getUsers();
    const online = getOnline();

    allUsers
      .filter(u => u.username.toLowerCase().includes(filter.toLowerCase()))
      .forEach(u => {
        const div = document.createElement('div');
        div.className = 'team-card';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '8px';
        div.style.marginBottom = '8px';

        div.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${u.avatar || 'default-avatar.png'}" style="width:56px;height:56px;border-radius:50%;object-fit:cover">
            <div>
              <strong>${u.username}</strong><br>
              <span style="color:#ccc;font-size:0.85rem;">${u.email || ''}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.85rem;color:${online.includes(u.username) ? 'lightgreen' : '#ccc'};">
              ${online.includes(u.username) ? 'Online' : 'Offline'}
            </span>
            ${isAdmin && u.username !== loggedInUser ? '<button class="delete-btn">Delete</button>' : ''}
          </div>
        `;

        // Delete user button
        if (isAdmin && u.username !== loggedInUser) {
          const deleteBtn = div.querySelector('.delete-btn');
          deleteBtn.addEventListener('click', () => {
            if (!confirm(`Delete user ${u.username}? This cannot be undone.`)) return;
            // Remove user from users list
            const updatedUsers = getUsers().filter(user => user.username !== u.username);
            saveUsers(updatedUsers);
            // Remove user from online list
                  const onlineUsers = getOnline().filter(user => user !== u.username);
                  localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
                  try { window.Realtime.write('onlineUsers', onlineUsers); } catch(e) {}
            alert(`${u.username} has been deleted. They can no longer log in.`);
            render(search.value);
          });
        }

        usersList.appendChild(div);
      });
  }

  search.addEventListener('input', (e) => render(e.target.value));

  (async function init(){
    const remoteUsers = await window.Realtime.readOnce('users');
    const remoteOnline = await window.Realtime.readOnce('onlineUsers');
    if(remoteUsers) localStorage.setItem('users', JSON.stringify(remoteUsers));
    if(remoteOnline) localStorage.setItem('onlineUsers', JSON.stringify(remoteOnline));
    render();
    try { window.Realtime.subscribe('users', ()=>{ const u = JSON.parse(localStorage.getItem('users')||'[]'); render(search.value); }); } catch(e) {}
    try { window.Realtime.subscribe('onlineUsers', ()=>{ render(search.value); }); } catch(e) {}
    window.addEventListener('storage', (e)=>{ if(e.key==='users' || e.key==='onlineUsers') render(search.value); });
  })();

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    try {
      const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updated = (raw || []).filter(item => (typeof item === 'string' ? item !== loggedInUser : item.username !== loggedInUser));
      localStorage.setItem('onlineUsers', JSON.stringify(updated));
      try { window.Realtime.write('onlineUsers', updated); } catch(e) {}
    } catch (err) {}
    localStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
  });

  // Listen to storage changes to update users/online list live
  window.addEventListener('storage', (e) => {
    if (e.key === 'users' || e.key === 'onlineUsers') render(search.value);
  });
});
