document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    window.location.href = "index.html";
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(u => u.username === loggedInUser);

  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const profilePicInput = document.getElementById("profilePicInput");
  const profileImage = document.getElementById("profileImage");

  // prefill form
  usernameInput.value = user.username;
  emailInput.value = user.email || "";
  if(user.avatar) profileImage.src = user.avatar;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    try {
      const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updated = (raw || []).filter(item => (typeof item === 'string' ? item !== loggedInUser : item.username !== loggedInUser));
      localStorage.setItem('onlineUsers', JSON.stringify(updated));
      try { window.Realtime.write('onlineUsers', updated); } catch(e) {}
    } catch (err) {}
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  // preview uploaded avatar
  profilePicInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      profileImage.src = reader.result; // show preview
    };
    reader.readAsDataURL(file);
  });

  // save profile changes
  document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const newUsername = usernameInput.value.trim();
    const newEmail = emailInput.value.trim();
    const newPassword = passwordInput.value;

    if (!newUsername) return alert("Username cannot be empty");

    if (newUsername !== loggedInUser && users.some(u => u.username === newUsername)) {
      return alert("Username already taken!");
    }

    user.username = newUsername;
    user.email = newEmail;
    if (newPassword) user.password = newPassword;
    if (profileImage.src) user.avatar = profileImage.src; // save avatar

  localStorage.setItem("users", JSON.stringify(users));
  try { window.Realtime.write('users', users); } catch(e) {}
    localStorage.setItem("loggedInUser", newUsername);

    alert("Profile updated successfully!");
    passwordInput.value = "";
  });
});
