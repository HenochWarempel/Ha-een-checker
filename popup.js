const send = (action) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { action });
  });
};

document.getElementById("btn-toggle").addEventListener("click", () => send("toggle"));
document.getElementById("btn-refresh").addEventListener("click", () => send("refresh"));

const badgeToggle = document.getElementById("toggle-badges");

// Restore persisted preference
chrome.storage.local.get("showBadges", ({ showBadges }) => {
  const show = showBadges !== false; // default true
  badgeToggle.checked = show;
});

badgeToggle.addEventListener("change", () => {
  const show = badgeToggle.checked;
  chrome.storage.local.set({ showBadges: show });
  send(show ? "showBadges" : "hideBadges");
});
