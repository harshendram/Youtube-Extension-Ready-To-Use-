// Function to check if a tab is a YouTube video and send a message
const checkForYouTubeVideo = (tabId, tabUrl) => {
  if (tabUrl && tabUrl.includes("youtube.com/watch")) {
    const queryParameters = tabUrl.split("?")[1];
    const urlParameters = new URLSearchParams(queryParameters);

    chrome.tabs.sendMessage(
      tabId,
      {
        type: "NEW",
        videoId: urlParameters.get("v"),
      },
      () => chrome.runtime.lastError
    ); // Suppress any connection errors
  }
};

// Listen for tab updates (when a user navigates to a new page or refreshes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process if the URL has changed or the page has completed loading
  if ((changeInfo.url || changeInfo.status === "complete") && tab.url) {
    checkForYouTubeVideo(tabId, tab.url);
  }
});

// Listen for tab activation (when a user switches to a different tab)
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Get the active tab's information
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      checkForYouTubeVideo(tab.id, tab.url);
    }
  });
});
