// Capture the PWA install prompt as early as possible.
//
// Chrome fires `beforeinstallprompt` very soon after load — often BEFORE the
// React bundle has parsed and attached its own listener, so a React-only
// listener silently misses it and the in-app "Install app" button never shows.
// This tiny first-party script (loaded synchronously in <head>) stashes the
// event on `window` so the React hook can pick it up whenever it mounts.
//
// It lives in /public (a same-origin file) instead of an inline <script> so it
// satisfies the `script-src 'self'` Content-Security-Policy.
(function () {
  window.__cvaurumInstall = window.__cvaurumInstall || { event: null, installed: false };
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__cvaurumInstall.event = e;
    // Notify any already-mounted React hook that a prompt is now available.
    window.dispatchEvent(new Event('cvaurum:installable'));
  });
  window.addEventListener('appinstalled', function () {
    window.__cvaurumInstall.event = null;
    window.__cvaurumInstall.installed = true;
    window.dispatchEvent(new Event('cvaurum:installed'));
  });
})();
