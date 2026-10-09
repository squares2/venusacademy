// Venus Gym – WhatsApp Sender (service worker)
// Never waits long itself: it only opens the chat URL and relays results,
// so Chrome can suspend it between messages without breaking anything.
const WA_ORIGIN = 'https://web.whatsapp.com/';

async function getWaTab() {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  if (tabs.length) return tabs[0];
  return chrome.tabs.create({ url: WA_ORIGIN, active: false, pinned: true });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'wa:ping') {
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
      .then(t => sendResponse({ ok: true, version: chrome.runtime.getManifest().version, waTab: t.length > 0 }));
    return true;
  }

  if (msg.type === 'wa:send') {
    (async () => {
      try {
        const tab = await getWaTab();
        await chrome.storage.local.set({
          venusJob: { jobId: msg.jobId, phone: msg.phone, appTabId: sender.tab && sender.tab.id, createdAt: Date.now() },
        });
        const url = `${WA_ORIGIN}send?phone=${encodeURIComponent(msg.phone)}&text=${encodeURIComponent(msg.text || '')}`;
        await chrome.tabs.update(tab.id, { url });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String((e && e.message) || e) });
      }
    })();
    return true;
  }

  if (msg.type === 'wa:result') {
    if (msg.appTabId != null) chrome.tabs.sendMessage(msg.appTabId, msg).catch(() => {});
    return;
  }

  if (msg.type === 'wa:focus') {
    getWaTab().then(t => {
      chrome.tabs.update(t.id, { active: true });
      chrome.windows.update(t.windowId, { focused: true });
      sendResponse({ ok: true });
    });
    return true;
  }
});
