document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const channelInput = document.getElementById('channelInput');
  const qualitySelect = document.getElementById('qualitySelect');
  const addButton = document.getElementById('addButton');
  const channelList = document.getElementById('channelList');
  const defaultQualitySelect = document.getElementById('defaultQualitySelect');
  const refreshButton = document.getElementById('refreshButton');
  const helpButton = document.getElementById('helpIcon');

  // Map of quality values to human-readable labels
  const qualityMap = {
    'auto': 'Auto',
    'tiny': '144p',
    'small': '240p',
    'medium': '360p',
    'large': '480p',
    'hd720': '720p',
    'hd1080': '1080p',
    'hd1440': '1440p',
    'hd2160': '2160p (4K)'
  };

  // Function to update the list of channels and their quality settings
  function updateChannelList() {
    browser.storage.local.get(['channelQualities', 'defaultQuality'], function(data) {
      const channelQualities = data.channelQualities || {};
      channelList.innerHTML = '';
      for (const [channel, { quality, iconUrl }] of Object.entries(channelQualities)) {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        //channelItem.textContent = channel;

        // Create channel icon element
        const channelIcon = document.createElement('img');
        channelIcon.className = 'channel-icon';
        channelIcon.src = `https://www.youtube.com/s/desktop/f506bd45/img/favicon_32.png`; // Default YouTube icon
        channelIcon.alt = '';
        channelIcon.width = 24;
        channelIcon.height = 24;

        // Create channel name element
        const channelName = document.createElement('span');
        channelName.textContent = channel;
        channelName.className = 'channel-name';

        // Append icon and name to channelItem
        channelItem.appendChild(channelIcon);
        channelItem.appendChild(channelName);

        const qualityItem = document.createElement('div');
        qualityItem.className = 'quality-item';
        qualityItem.textContent = qualityMap[quality] || quality;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        
        const deleteIcon = document.createElement('img');
        deleteIcon.src = 'delete.svg';
        deleteIcon.alt = 'Delete';
        deleteIcon.width = 16;
        deleteIcon.height = 16;

        // Fetch actual channel icon
        fetchChannelIcon(channel).then(iconUrl => {
          if (iconUrl) {
            channelIcon.src = iconUrl;
          }
        });

        deleteButton.appendChild(deleteIcon);

        deleteButton.onclick = function() {
          delete channelQualities[channel];
          browser.storage.local.set({channelQualities}, function() {
            showSuccessPopup("Channel deleted");
            updateChannelList();
          });
        };

        channelList.appendChild(channelItem);
        channelList.appendChild(qualityItem);
        channelList.appendChild(deleteButton);
      }

      // Set the default quality select value
      defaultQualitySelect.value = data.defaultQuality || 'auto';
    });
  }

  // Event listener for adding a new channel
  addButton.addEventListener('click', function() {
    const channel = channelInput.value.trim();
    const quality = qualitySelect.value;
    if (channel) {
      browser.storage.local.get('channelQualities', function(data) {
        const channelQualities = data.channelQualities || {};
        fetchChannelIcon(channel).then(iconUrl => {
          channelQualities[channel] = { quality, iconUrl };
          browser.storage.local.set({channelQualities}, function() {
            channelInput.value = '';
            showSuccessPopup(`Channel added with ${qualityMap[quality]} quality`);
            updateChannelList();      
          });
        });
      });
    }
  });

  // Event listener for changing the default quality
  defaultQualitySelect.addEventListener('change', function() {
    const defaultQuality = defaultQualitySelect.value;
    browser.storage.local.set({defaultQuality}, function() {
      showSuccessPopup(`Default quality set to ${qualityMap[defaultQuality]}`);
    });
  });

  // Function to show feedback to the user
  function showSuccessPopup(message) { 
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
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.style.transition = 'opacity 0.5s';
      popup.style.opacity = '0';
      setTimeout(() => popup.remove(), 500);
    }, 1000);
  }

  // Function to refresh the current YouTube page after settings change
  function refreshCurrentPage() {
    browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('youtube.com')) {
        browser.tabs.reload(tabs[0].id, {bypassCache: true});
        window.close(); // Close the popup after refreshing
      } else {
        showSuccessPopup("No active YouTube tab found");
      }
    });
  }

  // Event listener for the refresh button
  refreshButton.addEventListener('click', refreshCurrentPage);
  
  helpButton.addEventListener('click', function(e) {
    e.preventDefault();
    browser.tabs.create({ url: 'https://addons.mozilla.org/en-US/firefox/addon/ytresset_w35uf' });
  });

  // Function to fetch channel icon
  async function fetchChannelIcon(channelName) {
    try {
      const response = await fetch(`https://www.youtube.com/c/${channelName}`);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const ogImage = doc.querySelector('meta[property="og:image"]');
      return ogImage ? ogImage.content : null;
    } catch (error) {
      console.error('Error fetching channel icon:', error);
      return null;
    }
  }

  // Initialize the channel list
  updateChannelList();
});

// Function to request user consent
function requestUserConsent() {
  return browser.tabs.create({
    url: "consent.html"
  });
}

// Event listener for addon installation
browser.runtime.onInstalled.addListener(function(details) {
  if (details.reason === "install") {
    requestUserConsent();
  }
});
