(() => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (obj) => {
        resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
      });
    });
  };

  // Create notification element
  const createNotification = (message) => {
    //console.log("Creating notification with message:", message);

    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll(
      ".yt-bookmark-notification"
    );
    existingNotifications.forEach((notification) => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });

    // Create new notification
    const notification = document.createElement("div");
    notification.className = "yt-bookmark-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    //console.log("Notification element created and appended to body");

    // Show notification with animation
    setTimeout(() => {
      notification.classList.add("show");
      //console.log("Added 'show' class to notification");
    }, 10);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      notification.classList.add("fade-out");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 3000);
  };

  // Add styles for the notification and enhanced bookmark button
  const addCustomStyles = () => {
    //console.log("Adding custom styles");

    // Check if styles already exist
    if (document.getElementById("yt-bookmark-styles")) {
      // console.log("Styles already exist");
      return;
    }

    const styleElement = document.createElement("style");
    styleElement.id = "yt-bookmark-styles";
    styleElement.textContent = `
      .bookmark-btn {
        width: 45px !important;
        height: 35px !important;
        cursor: pointer !important;
        transition: transform 0.2s !important;
        margin: 0 8px !important;
        padding: 5px !important;
        background-color: rgba(255, 255, 255, 0.1) !important;
        border-radius: 20px !important;
        object-fit: contain !important;
        filter: brightness(1.5) !important;
      }
      .bookmark-btn:hover {
        transform: scale(1.1) !important;
        background-color: rgba(255, 255, 255, 0.2) !important;
        filter: brightness(2) !important;
      }
      .bookmark-btn:active {
        transform: scale(0.9) !important;
      }
      .yt-bookmark-notification {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%) scale(0.8);
        background-color: #4285f4;
        color: white;
        padding: 15px 30px;
        border-radius: 8px;
        z-index: 99999;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        opacity: 0;
        transition: all 0.3s ease-in-out;
        pointer-events: none;
      }
      .yt-bookmark-notification.show {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }
      .fade-out {
        opacity: 0;
        transform: translateX(-50%) scale(0.8);
      }
    `;
    document.head.appendChild(styleElement);
    //console.log("Custom styles added to head");
  };

  const addNewBookmarkEventHandler = async () => {
    const currentTime = youtubePlayer.currentTime;
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime),
    };

    currentVideoBookmarks = await fetchBookmarks();

    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify(
        [...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time)
      ),
    });

    //console.log("Bookmark added, showing notification");
    // Show prominent confirmation message
    createNotification(
      "✓ Bookmark successfully added at " + getTime(currentTime)
    );
  };

  const newVideoLoaded = async () => {
    // Add custom styles as soon as possible
    addCustomStyles();

    const bookmarkBtnExists =
      document.getElementsByClassName("bookmark-btn")[0];

    currentVideoBookmarks = await fetchBookmarks();

    if (!bookmarkBtnExists) {
      const bookmarkBtn = document.createElement("img");

      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp";
      bookmarkBtn.style.width = "100%";
      bookmarkBtn.style.height = "100%";
      bookmarkBtn.style.objectFit = "contain";

      youtubeLeftControls =
        document.getElementsByClassName("ytp-left-controls")[0];
      youtubePlayer = document.getElementsByClassName("video-stream")[0];

      // Only append the button if we found the controls
      if (youtubeLeftControls && youtubePlayer) {
        youtubeLeftControls.appendChild(bookmarkBtn);
        bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
      }
    }
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    if (type === "NEW") {
      currentVideo = videoId;
      newVideoLoaded();
    } else if (type === "PLAY") {
      if (youtubePlayer) {
        youtubePlayer.currentTime = value;
      }
    } else if (type === "DELETE") {
      currentVideoBookmarks = currentVideoBookmarks.filter(
        (b) => b.time != value
      );
      chrome.storage.sync.set({
        [currentVideo]: JSON.stringify(currentVideoBookmarks),
      });

      //console.log("Bookmark deleted, showing notification");
      // Show notification for bookmark deletion
      createNotification("✓ Bookmark successfully deleted");

      response(currentVideoBookmarks);
    }
  });

  // Add styles immediately when content script loads
  addCustomStyles();

  // Initial setup - wait for YouTube to be fully loaded
  const initExtension = () => {
    // Check if YouTube player elements exist
    youtubeLeftControls =
      document.getElementsByClassName("ytp-left-controls")[0];
    youtubePlayer = document.getElementsByClassName("video-stream")[0];

    if (youtubeLeftControls && youtubePlayer) {
      // YouTube player is ready, load the extension
      newVideoLoaded();
    } else {
      // YouTube player is not ready yet, try again in a moment
      setTimeout(initExtension, 1000);
    }
  };

  // Start initialization
  initExtension();
})();

const getTime = (t) => {
  var date = new Date(0);
  date.setSeconds(t);

  return date.toISOString().substring(11, 19);
};
