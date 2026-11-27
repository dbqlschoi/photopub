// Google Analytics for Firebase: counts visits, app opens and installs only.
// Photos and other content never leave the phone. Loaded after the app starts
// so it doesn't slow down opening, and silently skipped if blocked or offline.
const firebaseConfig = {
  apiKey: "AIzaSyD7Gm1bOPLn28MDVW6AvBINUVSbYYiq6yk",
  authDomain: "photopub-c4878.firebaseapp.com",
  projectId: "photopub-c4878",
  storageBucket: "photopub-c4878.firebasestorage.app",
  messagingSenderId: "508280640159",
  appId: "1:508280640159:web:5e772fb536c6de2b6008aa",
  measurementId: "G-EQNYZ9WWG5"
};

let ready = null;
export function initAnalytics(userProps) {
  if (ready) return ready;
  ready = (async () => {
    try {
      const [{ initializeApp }, an] = await Promise.all([import('firebase/app'), import('firebase/analytics')]);
      if (!(await an.isSupported())) return null;
      const a = an.getAnalytics(initializeApp(firebaseConfig));
      if (userProps) an.setUserProperties(a, userProps);
      return { a, an };
    } catch (e) { return null; }
  })();
  return ready;
}
export function track(name, params) {
  if (!ready) return;
  ready.then(x => { if (x) x.an.logEvent(x.a, name, params || {}); }).catch(() => {});
}
