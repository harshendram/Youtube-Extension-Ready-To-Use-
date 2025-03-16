import { getActiveTabURL } from "./utils.js";

const addNewBookmark = (bookmarks, bookmark) => {
  const bookmarkTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");

  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";
  controlsElement.className = "bookmark-controls";

  setBookmarkAttributes("play", onPlay, controlsElement);
  setBookmarkAttributes("delete", onDelete, controlsElement);

  newBookmarkElement.id = "bookmark-" + bookmark.time;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlsElement);
  bookmarks.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks = []) => {
  const bookmarksElement = document.getElementById("bookmarks");
  bookmarksElement.innerHTML = "";

  if (currentBookmarks.length > 0) {
    for (let i = 0; i < currentBookmarks.length; i++) {
      const bookmark = currentBookmarks[i];
      addNewBookmark(bookmarksElement, bookmark);
    }
  } else {
    bookmarksElement.innerHTML = '<i class="row">No bookmarks to show</i>';
  }

  return;
};

const onPlay = async (e) => {
  // Use closest to find the nearest parent with the 'bookmark' class
  const bookmarkElement = e.target.closest(".bookmark");

  if (!bookmarkElement) {
    console.error("Bookmark element not found.");
    return;
  }
  const bookmarkTime = bookmarkElement.getAttribute("timestamp"); // Fetch the timestamp attribute

  const activeTab = await getActiveTabURL();

  // Simple error handling callback
  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "PLAY",
      value: bookmarkTime,
    },
    // This empty callback silently catches the error
    () => chrome.runtime.lastError
  );
};

const onDelete = async (e) => {
  // Use closest to find the nearest parent with the 'bookmark' class
  const bookmarkElement = e.target.closest(".bookmark");

  if (!bookmarkElement) {
    console.error("Bookmark element not found.");
    return;
  }

  const bookmarkTime = bookmarkElement.getAttribute("timestamp");

  const activeTab = await getActiveTabURL();

  // Remove the bookmark element from the DOM
  if (bookmarkElement.parentNode) {
    bookmarkElement.parentNode.removeChild(bookmarkElement);
  }

  // Simple error handling callback
  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "DELETE",
      value: bookmarkTime,
    },
    (response) => {
      // Just accessing lastError suppresses the error
      if (chrome.runtime.lastError) {
        return;
      }
      // Only call viewBookmarks if we got a response
      if (response) {
        viewBookmarks(response);
      }
    }
  );
};

const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const activeTab = await getActiveTabURL();

    // Check if we're on a YouTube watch page
    if (activeTab.url && activeTab.url.includes("youtube.com/watch")) {
      try {
        const queryParameters = activeTab.url.split("?")[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const currentVideo = urlParameters.get("v");

        if (currentVideo) {
          chrome.storage.sync.get([currentVideo], (data) => {
            const currentVideoBookmarks = data[currentVideo]
              ? JSON.parse(data[currentVideo])
              : [];

            viewBookmarks(currentVideoBookmarks);
          });
          return;
        }
      } catch (error) {
        console.error("Error parsing URL parameters:", error);
      }
    }

    // If we're not on a YouTube video page or there was an error
    const container = document.getElementsByClassName("container")[0];
    container.innerHTML =
      '<div class="title">This is not a youtube video page.</div>';
  } catch (error) {
    console.error("Error in popup initialization:", error);
    const container = document.getElementsByClassName("container")[0];
    container.innerHTML =
      '<div class="title">An error occurred. Please try again.</div>';
  }
});
