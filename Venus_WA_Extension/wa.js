// Runs inside web.whatsapp.com. When the extension has opened a chat for a
// queued message, waits for the text to load, presses Send, confirms it left,
// and reports back to the Venus app.
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const { venusJob: job } = await chrome.storage.local.get('venusJob');
  if (!job || Date.now() - job.createdAt > 180000) return;
  await chrome.storage.local.remove('venusJob'); // one attempt per opened chat

  const report = (status, error) => {
    try { chrome.runtime.sendMessage({ type: 'wa:result', jobId: job.jobId, appTabId: job.appTabId, status, error: error || null }); } catch (_) {}
  };

  const composeBox = () =>
    document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
    document.querySelector('footer div[contenteditable="true"]');

  const sendButton = () => {
    const icon = document.querySelector('footer span[data-icon="send"], footer span[data-icon="wds-ic-send-filled"], span[data-icon="send"], span[data-icon="wds-ic-send-filled"]');
    if (icon) return icon.closest('button') || icon.closest('[role="button"]') || icon;
    return document.querySelector('footer button[aria-label="Send"], footer button[aria-label="إرسال"], footer [role="button"][aria-label="Send"], footer [role="button"][aria-label="إرسال"]');
  };

  const textOf = el => ((el && el.textContent) || '').trim();
  const lastOutgoingPending = () => {
    const outs = document.querySelectorAll('div.message-out');
    const last = outs[outs.length - 1];
    return !!(last && last.querySelector('span[data-icon="msg-time"]'));
  };
  const invalidPopup = () => {
    const dlg = document.querySelector('[data-animate-modal-popup="true"], div[role="dialog"]');
    return dlg && /invalid|isn.t on whatsapp|not on whatsapp|غير صالح|ليس على واتساب|غير موجود/i.test(dlg.textContent || '');
  };
  const loggedOut = () => {
    const qr = document.querySelector('canvas[aria-label], div[data-ref] canvas, [data-testid="qrcode"]');
    return !!qr && !document.querySelector('#side, #pane-side');
  };

  try {
    const t0 = Date.now();
    let qrSince = 0;
    while (Date.now() - t0 < 100000) {
      if (loggedOut()) {
        qrSince = qrSince || Date.now();
        if (Date.now() - qrSince > 15000) return report('not_logged_in');
      } else qrSince = 0;

      if (invalidPopup()) return report('invalid');

      const box = composeBox(), btn = sendButton();
      if (box && btn && textOf(box)) {
        await sleep(800 + Math.random() * 1500); // brief human-like pause
        btn.click();

        // compose box empties once WhatsApp accepts the message
        let cleared = false;
        for (let i = 0; i < 30 && !cleared; i++) { await sleep(500); cleared = !textOf(composeBox()); }
        if (!cleared) {
          const b = composeBox();
          if (b) {
            b.focus();
            b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          }
          await sleep(2500);
          if (textOf(composeBox())) return report('failed', 'send_click_failed');
        }
        // give it time to leave the phone (clock icon → tick)
        for (let i = 0; i < 40 && lastOutgoingPending(); i++) await sleep(750);
        return report('sent');
      }
      await sleep(500);
    }
    report('failed', 'timeout');
  } catch (e) {
    report('failed', String((e && e.message) || e));
  }
})();
