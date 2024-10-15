let qualitySet = false;
let attemptCount = 0;
let defaultQuality = 'auto';
let maxAttempts = 3;
let lastPopupTime = 0;
const popupCooldown = 5000;

// Initialize default quality from storage
chrome.storage.local.get('defaultQuality', function(data) {
  defaultQuality = data.defaultQuality || 'auto';
});

// Listen for changes in storage
chrome.storage.onChanged.addListener(function(changes, namespace) {
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
  return new Promise((resolve) => {
    chrome.storage.local.get(['channelQualities', 'defaultQuality'], (result) => {
      resolve({
        channelQualities: result.channelQualities || {},
        defaultQuality: result.defaultQuality || 'auto'
      });
    });
  });
}

// Function to inject script into the page
function injectScript(file) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(file);
    script.onload = function() {
      this.remove();
      resolve();
    };
    script.onerror = reject;
    (document.head || document.documentElement).appendChild(script);
  });
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
  
  // Inject the script file
  await injectScript('inject.js');
  
  // Send the necessary data to the injected script
  window.postMessage({
    type: "YOUTUBE_QUALITY_INIT",
    channelQualities: channelQualities,
    currentChannel: currentChannel,
    defaultQuality: defaultQuality
  }, "*");
}

// Function to run quality control
async function runQualityControl(lastUrl) {
  const url = new URL(lastUrl);
  if(url.pathname === '/watch' && url.searchParams.has('v')){
    if (!qualitySet && attemptCount < maxAttempts) {
      await initializeQualityControl(lastUrl);
      attemptCount++;
      setTimeout(() => runQualityControl(lastUrl), 3000);
    }
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