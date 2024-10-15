document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('agreeButton').addEventListener('click', function() {
        chrome.storage.local.set({userConsent: true}).then(() => {
            window.close();
        }).catch((error) => {
            console.error('Error setting user consent:', error);
        });
    });
});