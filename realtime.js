// Simple realtime adapter: uses Firebase Realtime Database if window.FIREBASE_CONFIG is present.
// Otherwise it falls back to localStorage + storage events (already used in the app).

const Realtime = (function(){
  let enabled = false;
  let db = null;

  async function initFirebase() {
    if (!window.FIREBASE_CONFIG) return false;
    // load firebase scripts dynamically
    if (!window.firebase) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
        s.onload = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
          s2.onload = res;
          s2.onerror = rej;
          document.head.appendChild(s2);
        };
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.database();
      enabled = true;
      console.info('Realtime: Firebase enabled');
      return true;
    } catch (err) {
      console.warn('Realtime: Firebase init failed', err);
      return false;
    }
  }

  // Pub/sub: for now we expose simple methods for reading/writing JSON data under a key
  function localWrite(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    try { window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(value) })); } catch(e) {}
  }

  async function write(key, value) {
    if (enabled && db) {
      try {
        await db.ref(key).set(value);
        return;
      } catch (err) {
        console.warn('Realtime write failed, falling back to localWrite', err);
      }
    }
    localWrite(key, value);
  }

  async function readOnce(key) {
    if (enabled && db) {
      try {
        const snap = await db.ref(key).get();
        return snap.exists() ? snap.val() : null;
      } catch (err) {
        console.warn('Realtime readOnce failed', err);
      }
    }
    try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; }
  }

  function subscribe(key, cb) {
    // cb receives (value)
    if (enabled && db) {
      const ref = db.ref(key);
      ref.on('value', snapshot => cb(snapshot.exists() ? snapshot.val() : null));
      return () => ref.off();
    }

    const handler = (e) => {
      if (e.key === key) cb(e.newValue ? JSON.parse(e.newValue) : null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  return { initFirebase, write, readOnce, subscribe, isEnabled: () => enabled };
})();

// Expose globally
window.Realtime = Realtime;

export default Realtime;
