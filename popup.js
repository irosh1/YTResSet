document.addEventListener('DOMContentLoaded', function() {
  const channelInput = document.getElementById('channelInput');
  const qualitySelect = document.getElementById('qualitySelect');
  const addButton = document.getElementById('addButton');
  const channelList = document.getElementById('channelList');
  const defaultQualitySelect = document.getElementById('defaultQualitySelect');

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

  function updateChannelList() {
    browser.storage.sync.get(['channelQualities', 'defaultQuality'], function(data) {
      const channelQualities = data.channelQualities || {};
      channelList.innerHTML = '';
      for (const [channel, quality] of Object.entries(channelQualities)) {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        channelItem.textContent = channel;

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

        deleteButton.appendChild(deleteIcon);

        deleteButton.onclick = function() {
          delete channelQualities[channel];
          browser.storage.sync.set({channelQualities}, function() {
            updateChannelList();
            refreshCurrentPage();
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

  addButton.addEventListener('click', function() {
    const channel = channelInput.value.trim();
    const quality = qualitySelect.value;
    if (channel) {
      browser.storage.sync.get('channelQualities', function(data) {
        const channelQualities = data.channelQualities || {};
        channelQualities[channel] = quality;
        browser.storage.sync.set({channelQualities}, function() {
          channelInput.value = '';
          updateChannelList();           
          refreshCurrentPage();
        });
      });
    }
  });

  defaultQualitySelect.addEventListener('change', function() {
    const defaultQuality = defaultQualitySelect.value;
    browser.storage.sync.set({defaultQuality}, function() {
      console.log('Default quality set to:', defaultQuality);
      // Add a visual feedback for the user
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

  function refreshCurrentPage() {
    browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        browser.tabs.reload(tabs[0].id, {bypassCache: true});
      }
    });
  }

  updateChannelList();
});
