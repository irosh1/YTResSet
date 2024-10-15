browser.browserAction.onClicked.addListener(() => {
  browser.browserAction.setPopup({popup: "popup.html"});
});