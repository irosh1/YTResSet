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
      showFeedback(`Default quality set to ${qualityMap[defaultQuality]}`);
    });
  });

  // Function to show feedback to the user
  function showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 14px;
    `;
    document.body.appendChild(feedback);
    setTimeout(() => {
      feedback.style.transition = 'opacity 0.5s';
      feedback.style.opacity = '0';
      setTimeout(() => feedback.remove(), 500);
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
