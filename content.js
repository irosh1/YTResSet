let qualitySet = false;
let attemptCount = 0;
let defaultQuality = 'auto';
let maxAttempts = 3;
let lastPopupTime = 0;
const popupCooldown = 5000;

// Initialize default quality from storage
browser.storage.local.get('defaultQuality', function(data) {
  defaultQuality = data.defaultQuality || 'auto';
});

// Listen for changes in storage
browser.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.defaultQuality) {
    defaultQuality = changes.defaultQuality.newValue;
    qualitySet = false;
    attemptCount = 0;
    runQualityControl(location.href);
  }
});

// Map of quality values to human-readable labels
const qualityMap = {
  'auto': 'Auto', 'tiny': '144p', 'small': '240p', 'medium': '360p',
  'large': '480p', 'hd720': '720p', 'hd1080': '1080p', 'hd1440': '1440p',
  'hd2160': '2160p (4K)', 'highres': 'High Resolution'
};

// Function to get channel handle from video URL
async function getChannelHandleFromVideoUrl(videoUrl) {
  try {
    const cacheBustUrl = `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const response = await fetch(cacheBustUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    const text = await response.text();
    const match = text.match(/"canonicalBaseUrl":"(?:\/+)?@?([\w-]+)"/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

// Function to get current channel handle
async function getCurrentChannelHandle(lastUrl) {
  return await getChannelHandleFromVideoUrl(lastUrl);
}

// Function to get channel qualities from storage
async function getChannelQualities() {
  const result = await browser.storage.local.get(['channelQualities', 'defaultQuality']);
  return {
    channelQualities: result.channelQualities || {},
    defaultQuality: result.defaultQuality || 'auto'
  };
}

// Function to inject script into the page
function injectScript(content) {
  const script = document.createElement('script');
  script.textContent = content;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Function to show success popup
function showSuccessPopup(quality) {
  const currentTime = Date.now();
  if (currentTime - lastPopupTime < popupCooldown) {
    return; // Don't show popup if cooldown hasn't elapsed
  }
  lastPopupTime = currentTime;

  const displayQuality = qualityMap[quality] || quality;
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #4CAF50;
    color: white;
    padding: 16px;
    border-radius: 4px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  popup.textContent = `Quality set to ${displayQuality}`;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.transition = 'opacity 0.5s';
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 500);
  }, 3000);
}

// Function to initialize quality control
async function initializeQualityControl(lastUrl) {
  const { channelQualities } = await getChannelQualities();
  const currentChannel = await getCurrentChannelHandle(lastUrl);
  
  const scriptContent = `
    let qualitySetSuccess = false;
    const channelQualities = ${JSON.stringify(channelQualities)};
    const currentChannel = "${currentChannel}";
    let defaultQuality = "${defaultQuality}";

    function setCustomQuality() {
      const player = document.querySelector('#movie_player');
      if (!player || typeof player.getAvailableQualityLevels !== 'function') {
        return false;
      }
      
      const availableQualities = player.getAvailableQualityLevels();
      let targetQuality = channelQualities.hasOwnProperty(currentChannel) 
        ? channelQualities[currentChannel] 
        : defaultQuality;

      function getBestQuality(target, available) {
        const qualityOrder = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny', 'auto'];
        const targetIndex = qualityOrder.indexOf(target);
        
        if (targetIndex === -1) {
          return available[0];
        }

        for (let i = targetIndex; i < qualityOrder.length; i++) {
          if (available.includes(qualityOrder[i])) {
            return qualityOrder[i];
          }
        }

        return available[0];
      }

      const bestQuality = getBestQuality(targetQuality, availableQualities);
      player.setPlaybackQualityRange(bestQuality, bestQuality);

      if (player.getPlayerState() === 2) {
        player.playVideo();
      }

      window.postMessage({ type: "QUALITY_SET_SUCCESS", quality: bestQuality }, "*");
      return true;
    }

    function ytQualityControl() {
      if (!qualitySetSuccess) {
        qualitySetSuccess = setCustomQuality();
      }
    }

    ytQualityControl();
  
    const events = ['yt-navigate-start', 'yt-navigate-finish'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        qualitySetSuccess = false;
        setTimeout(ytQualityControl, 2000);
      });
    });

    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      qualitySetSuccess = false;
      setTimeout(ytQualityControl, 2000);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      qualitySetSuccess = false;
      setTimeout(ytQualityControl, 2000);
    };
  `;

  injectScript(scriptContent);
}

// Function to run quality control
async function runQualityControl(lastUrl) {
  if (!qualitySet && attemptCount < maxAttempts) {
    await initializeQualityControl(lastUrl);
    attemptCount++;
    setTimeout(() => runQualityControl(lastUrl), 3000);
  }
}

runQualityControl(location.href);

// Listen for success message from injected script
window.addEventListener("message", (event) => {
  if (event.data.type === "QUALITY_SET_SUCCESS") {
    qualitySet = true;
    showSuccessPopup(event.data.quality);
  }
});

// Check for URL changes
let lastUrl = location.href;
new MutationObserver(async () => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    qualitySet = false;
    attemptCount = 0;
    await runQualityControl(lastUrl);
  }
}).observe(document, { subtree: true, childList: true });