(function() {
  if (window.__waInjectedLoaded) return;
  try {
    window.__waInjectedLoaded = true;

    // Minimal bridge API placeholder
    window.waInjectedBridge = {
      ping() { return 'pong'; }
    };

    // Post a ready message to the content script/page
    window.postMessage({ type: 'WA_INJECTED_READY' }, '*');
  } catch (e) {
    // Swallow errors to avoid breaking the page context
  }
})(); 