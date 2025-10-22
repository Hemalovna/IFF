// Save user
function saveUser(username, password) {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  users.push({ username, password });
  localStorage.setItem("users", JSON.stringify(users));
  try { window.Realtime.write('users', users); } catch(e) {}
  return true;
}

// SIGNUP
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("signupUsername").value.trim();
    const password = document.getElementById("signupPassword").value;

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const exists = users.some((u) => u.username === username);

    if (exists) {
      alert("Username not available! Choose another one.");
    } else {
      saveUser(username, password);
      localStorage.setItem("loggedInUser", username);
      // mark online
      try {
        const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
        const normalized = Array.isArray(raw) ? raw : [];
        const now = Date.now();
        const updated = normalized.map(i => (typeof i === 'string' ? { username: i, lastSeen: 0 } : i));
        updated.push({ username, lastSeen: now });
        localStorage.setItem('onlineUsers', JSON.stringify(updated));
        try { window.Realtime.write('onlineUsers', updated); } catch(e) {}
      } catch (err) {}
      window.location.href = "home.html";
    }
  });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      localStorage.setItem("loggedInUser", username);
      // mark online with timestamp
      try {
        const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
        const normalized = Array.isArray(raw) ? raw : [];
        const now = Date.now();
        const updated = normalized.map(i => (typeof i === 'string' ? { username: i, lastSeen: 0 } : i));
        // remove existing entry for username
        const filtered = updated.filter(i => i.username !== username);
        filtered.push({ username, lastSeen: now });
        localStorage.setItem('onlineUsers', JSON.stringify(filtered));
        try { window.Realtime.write('onlineUsers', filtered); } catch(e) {}
      } catch (err) {}
      window.location.href = "home.html";
    } else {
      alert("Invalid username or password!");
    }
  });
}
