const API_BASE = 'https://hatchmark-frontend.vercel.app';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'hatchmark-check',
    title: 'Check with Hatchmark',
    contexts: ['image'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'hatchmark-check' || !info.srcUrl || !tab?.id) return;

  try {
    // Fetch the image from background (bypasses CORS)
    const response = await fetch(info.srcUrl);
    const blob = await response.blob();

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      // Send the image data to the content script for hashing + verification
      chrome.tabs.sendMessage(tab.id, {
        type: 'HATCHMARK_CHECK',
        imageDataUrl: dataUrl,
        apiBase: API_BASE,
      });
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    // If fetch fails (e.g. data: URL), send the srcUrl directly
    chrome.tabs.sendMessage(tab.id, {
      type: 'HATCHMARK_CHECK',
      imageDataUrl: info.srcUrl,
      apiBase: API_BASE,
    });
  }
});
