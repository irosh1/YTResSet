(function() {
    let qualitySetSuccess = false;
    let channelQualities = {};
    let currentChannel = "";
    let defaultQuality = "auto";
  
    // Listen for the initialization message from content.js
    window.addEventListener("message", (event) => {
      if (event.data.type === "YOUTUBE_QUALITY_INIT") {
        channelQualities = event.data.channelQualities;
        currentChannel = event.data.currentChannel;
        defaultQuality = event.data.defaultQuality;
        ytQualityControl();
      }
    });
  
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
  })();