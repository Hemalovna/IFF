document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("loggedInUser");
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("userDisplay").textContent = user;

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    try {
      const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updated = (raw || []).filter(item => (typeof item === 'string' ? item !== user : item.username !== user));
      localStorage.setItem('onlineUsers', JSON.stringify(updated));
      try { window.Realtime.write('onlineUsers', updated); } catch(e) {}
    } catch (err) {}
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  const postsList = document.getElementById("postsList");
  const addPostBtn = document.getElementById("addPostBtn");

  async function loadPosts() {
    const val = await window.Realtime.readOnce('fanPosts');
    return val || JSON.parse(localStorage.getItem("fanPosts")) || [];
  }

  async function savePosts(posts) {
    try { await window.Realtime.write('fanPosts', posts); } catch(e) {}
    localStorage.setItem("fanPosts", JSON.stringify(posts));
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'fanPosts', newValue: JSON.stringify(posts) })); } catch(e) {}
  }

  async function renderPosts() {
    const posts = (await loadPosts()).sort((a, b) => b.id - a.id);
    postsList.innerHTML = "";

    posts.forEach(post => {
      const postDiv = document.createElement("div");
      postDiv.className = "post";

      const userLiked = post.likes?.includes(user);
      const canDelete = post.author === user || user === "Hemal";

      postDiv.innerHTML = `
        <div class="post-header">
          <h3>${post.title}</h3>
          <small>by ${post.author} • ${post.date}</small>
        </div>
        <p>${post.content}</p>
        ${post.image ? `<img src="${post.image}" alt="Post image" />` : ""}
        <div class="actions">
          <button class="likeBtn" data-id="${post.id}">
            ${userLiked ? "💖" : "🤍"} ${post.likes?.length || 0}
          </button>
          <button class="commentBtn" data-id="${post.id}">💬 ${post.comments?.length || 0}</button>
          ${canDelete ? `<button class="deleteBtn" data-id="${post.id}">🗑️ Delete</button>` : ""}
        </div>
        <div class="comments" id="comments-${post.id}">
          ${(post.comments || [])
            .map(c => `<div class="comment"><b>${c.user}:</b> ${c.text}</div>`)
            .join("")}
        </div>
      `;

      postsList.appendChild(postDiv);
    });
  }

  // Subscribe to realtime (falls back to StorageEvent)
  const unsub = window.Realtime.subscribe('fanPosts', () => renderPosts());
  window.addEventListener("storage", (e) => {
    if (e.key === "loggedInUser") {
      const current = localStorage.getItem("loggedInUser");
      if (!current) window.location.href = "index.html";
    }
  });

  // Add new post
  addPostBtn.addEventListener("click", async () => {
    const title = document.getElementById("postTitle").value.trim();
    const content = document.getElementById("postContent").value.trim();
    const imageInput = document.getElementById("postImage");
    if (!title || !content) return alert("Please fill in title and content.");
    const posts = await loadPosts();
    const newPost = {
      id: Date.now(),
      author: user,
      title,
      content,
      date: new Date().toLocaleString(),
      likes: [],
      comments: [],
      image: ""
    };

    // If image uploaded
    if (imageInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = async e => {
        newPost.image = e.target.result;
        posts.push(newPost);
        await savePosts(posts);
        await renderPosts();
      };
      reader.readAsDataURL(imageInput.files[0]);
    } else {
      posts.push(newPost);
      await savePosts(posts);
      await renderPosts();
    }

    document.getElementById("postTitle").value = "";
    document.getElementById("postContent").value = "";
    imageInput.value = "";
  });

  // Handle post actions
  postsList.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    const posts = await loadPosts();
    const post = posts.find(p => p.id == id);

    if (e.target.classList.contains("likeBtn")) {
      post.likes = post.likes || [];
      if (post.likes.includes(user)) {
        post.likes = post.likes.filter(u => u !== user);
      } else {
        post.likes.push(user);
      }
      await savePosts(posts);
      await renderPosts();
    }

    if (e.target.classList.contains("commentBtn")) {
      const text = prompt("Write a comment:");
      if (text) {
        post.comments.push({ user, text });
        await savePosts(posts);
        await renderPosts();
      }
    }

    if (e.target.classList.contains("deleteBtn")) {
      if (user === post.author || user === "Hemal") {
          if (confirm("Delete this post?")) {
          const updated = posts.filter(p => p.id != id);
          await savePosts(updated);
          await renderPosts();
        }
      }
    }
  });

  renderPosts();
});
