document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) window.location.href = "index.html";

  // Only certain users can create reports
  const allowedUsers = ["Hemal", "Admin"]; 
  const postsKey = "reportsPosts"; // storage key for reports
  const postsList = document.getElementById("postsList");
  const createBox = document.getElementById("createPostBox");

  // Show/hide create post box
  if (!allowedUsers.includes(loggedInUser)) createBox.style.display = "none";

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    try {
      const raw = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updated = (raw || []).filter(item => (typeof item === 'string' ? item !== loggedInUser : item.username !== loggedInUser));
      localStorage.setItem('onlineUsers', JSON.stringify(updated));
    } catch (err) {}
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  // Load posts
  async function loadPosts() {
    const remote = await window.Realtime.readOnce(postsKey);
    const posts = remote || JSON.parse(localStorage.getItem(postsKey)) || [];
    postsList.innerHTML = "";
    posts.forEach((p, index) => {
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <div class="post-header">
          <span class="post-user">${p.user}</span>
          <span class="post-meta">${new Date(p.date).toLocaleString()}</span>
        </div>
        <div class="post-title">${p.title}</div>
        <div class="post-content">${p.content}</div>
        ${p.image ? `<img src="${p.image}" />` : ""}
        <div class="actions">
          <button class="like-btn ${p.likes?.includes(loggedInUser) ? 'liked' : ''}">❤️ ${p.likes?.length||0}</button>
          <button class="comment-btn">💬 ${p.comments?.length||0}</button>
          ${p.user === loggedInUser || loggedInUser==="Hemal" ? '<button class="delete-btn">🗑️ Delete</button>' : ''}
        </div>
        <div class="comments"></div>
      `;
      postsList.appendChild(div);

      // Like/unlike
      const likeBtn = div.querySelector(".like-btn");
      likeBtn.addEventListener("click", async () => {
        p.likes = p.likes || [];
        if (p.likes.includes(loggedInUser)) {
          p.likes = p.likes.filter(u=>u!==loggedInUser);
        } else p.likes.push(loggedInUser);
        localStorage.setItem(postsKey, JSON.stringify(posts));
        try { await window.Realtime.write(postsKey, posts); } catch(e) {}
        loadPosts();
      });

      // Delete
      const deleteBtn = div.querySelector(".delete-btn");
      if(deleteBtn){
        deleteBtn.addEventListener("click", async () => {
          posts.splice(index,1);
          localStorage.setItem(postsKey, JSON.stringify(posts));
          try { await window.Realtime.write(postsKey, posts); } catch(e) {}
          loadPosts();
        });
      }

      // Comments
      const commentDiv = div.querySelector(".comments");
      const commentBtn = div.querySelector(".comment-btn");
      commentBtn.addEventListener("click", async () => {
        const comment = prompt("Write your comment:");
        if(comment){
          p.comments = p.comments || [];
          p.comments.push({user:loggedInUser, text:comment});
          localStorage.setItem(postsKey, JSON.stringify(posts));
          try { await window.Realtime.write(postsKey, posts); } catch(e) {}
          loadPosts();
        }
      });
      if(p.comments){
        p.comments.forEach(c=>{
          const cDiv = document.createElement("div");
          cDiv.className = "comment";
          cDiv.innerHTML = `<strong>${c.user}:</strong> ${c.text}`;
          commentDiv.appendChild(cDiv);
        });
      }
    });
  }

  (async function init(){
    await loadPosts();
    try { window.Realtime.subscribe(postsKey, ()=>loadPosts()); } catch(e) {}
    window.addEventListener('storage', (e) => { if (e.key === postsKey) loadPosts(); });
  })();

  // Create new post
  document.getElementById("postBtn").addEventListener("click", () => {
    const title = document.getElementById("postTitle").value.trim();
    const content = document.getElementById("postContent").value.trim();
    const fileInput = document.getElementById("postImage");

    if(!title || !content) return alert("Title and content required!");

    const reader = new FileReader();
    reader.onload = async function(e){
      const posts = JSON.parse(localStorage.getItem(postsKey)) || [];
      posts.unshift({
        user: loggedInUser,
        title,
        content,
        image: fileInput.files[0] ? e.target.result : null,
        date: new Date(),
        likes: [],
        comments: []
      });
      localStorage.setItem(postsKey, JSON.stringify(posts));
      try { await window.Realtime.write(postsKey, posts); } catch(e) {}
      document.getElementById("postTitle").value = "";
      document.getElementById("postContent").value = "";
      fileInput.value = "";
      loadPosts();
    }

    if(fileInput.files[0]) reader.readAsDataURL(fileInput.files[0]);
    else reader.onload();
  });

});
