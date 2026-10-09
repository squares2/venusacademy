// Runs inside the Venus app pages. Relays messages between the page and the extension.
(() => {
  const VERSION = chrome.runtime.getManifest().version;
  document.documentElement.dataset.venusWa = VERSION; // lets the app know the extension is installed

  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || e.data.source !== 'venus-app') return;
    const { id, payload } = e.data;
    try {
      chrome.runtime.sendMessage(payload, resp => {
        const err = chrome.runtime.lastError;
        window.postMessage({ source: 'venus-ext', replyTo: id, resp: err ? { ok: false, error: 'no_extension' } : resp }, '*');
      });
    } catch (_) {
      // extension was reloaded/updated — this page needs a refresh
      window.postMessage({ source: 'venus-ext', replyTo: id, resp: { ok: false, error: 'no_extension' } }, '*');
    }
  });

  chrome.runtime.onMessage.addListener(msg => {
    window.postMessage({ source: 'venus-ext', event: msg }, '*');
  });
})();
