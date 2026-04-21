(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const statusEl  = document.getElementById('status');
  const toggleBtn = document.getElementById('btn-toggle');
  const rerunBtn  = document.getElementById('btn-rerun');

  async function isPanelActive() {
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => !!document.getElementById('hsc-shadow-host'),
      });
      return res?.result ?? false;
    } catch {
      return null;
    }
  }

  async function inject() {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  }

  async function eject() {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        document.getElementById('hsc-shadow-host')?.remove();
        document.querySelectorAll('.hsc-badge').forEach(b => b.remove());
      },
    });
  }

  function setUI(active) {
    if (active === null) {
      statusEl.textContent = 'Niet beschikbaar (bijv. chrome:// pagina’s).';
      statusEl.className = 'status status-restricted';
      toggleBtn.disabled = true;
      rerunBtn.style.display = 'none';
      return;
    }
    statusEl.textContent = active ? 'Overlay is actief op deze pagina.' : 'Overlay is niet actief.';
    statusEl.className = 'status status-' + (active ? 'active' : 'inactive');
    toggleBtn.disabled = false;
    toggleBtn.textContent = active ? '✕ Overlay verbergen' : '▶ Overlay tonen';
    toggleBtn.className = 'btn ' + (active ? 'btn-secondary' : 'btn-primary');
    rerunBtn.style.display = active ? '' : 'none';
  }

  let active = await isPanelActive();
  setUI(active);

  toggleBtn.addEventListener('click', async () => {
    toggleBtn.disabled = true;
    if (active) {
      await eject();
      active = false;
    } else {
      await inject();
      active = true;
    }
    setUI(active);
  });

  rerunBtn.addEventListener('click', async () => {
    rerunBtn.disabled = true;
    await eject();
    await inject();
    rerunBtn.disabled = false;
  });
})();
