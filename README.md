Short notes for 'Realistic floorball' project

What I changed:
- Enforced single-account signup: the first created account is the only account stored in localStorage (`users` array). Subsequent visits to `signup.html` will show a message to log in.
- Fan posts (`fanPosts`) are stored in localStorage and fan-posts UI now listens for `storage` events so posts appear live across open tabs/windows on the same device.
- "Online users" is tracked in localStorage under `onlineUsers` as an array of objects { username, lastSeen }. Each logged-in tab updates lastSeen periodically so other tabs on the same device see who is online.

Limitations:
- Everything is local to the browser's storage. That means "live" updates only work across tabs and windows on the same device and same browser profile. They do NOT propagate across different machines or different browsers.
- To get real cross-device live updates you need a server or a realtime backend (WebSocket server, Firebase Realtime Database / Firestore, or similar).

Optional: Firebase (quick guide)
1) Create a Firebase project and enable Realtime Database or Firestore.
2) Add the Firebase SDK to your pages and initialize with your project's config.
3) Replace localStorage writes/reads for `fanPosts` and `onlineUsers` with database reads/writes and listeners. Example (Realtime Database):

  // pseudo-code example
  import { getDatabase, ref, onValue, set, push } from 'firebase/database';
  const db = getDatabase(app);

  // listen for posts
  onValue(ref(db, 'fanPosts'), snapshot => {
    const posts = snapshot.val() || [];
    // render posts
  });

  // add a post
  const newPostRef = push(ref(db, 'fanPosts'));
  set(newPostRef, { author, title, content, date: Date.now(), likes: [], comments: [] });

If you'd like, I can:
- Add Firebase wiring to this project as an optional feature (I can create a minimal config file and example code), or
- Keep the current local-only live updates but improve UI/notifications.

Next steps I took in code:
- Updated `auth.js` to prevent additional signups and to mark successful login/signup as online.
- Updated `protect.js` to keep the current logged-in user alive in the `onlineUsers` list and remove them on logout/unload.
- Updated `users.js` to interpret `onlineUsers` timestamps and show online/offline accordingly.

How to test (same-device):
1) Clear localStorage for the site.
2) Open `signup.html` in a browser tab and create the first account.
3) Open `users.html` and `fan-posts.html` in two tabs. When you create posts or the online list changes, the other tab should update automatically.

If you want me to implement Firebase or another server to make this truly cross-device, tell me and I will scaffold the minimal code and instructions.
