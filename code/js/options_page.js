document.addEventListener('DOMContentLoaded', function () {
  // Report pageview to Google Analytics.
  trackPageView();

  updateCheckboxOption(OPTION_SHORTEN_LINKS);
  updateCheckboxOption(OPTION_USE_TWITTER_TAB);
  updateCheckboxOption(OPTION_TWEET_SELECTION);
  updateCheckboxOption(OPTION_USE_TWITTER_API);
  updateStringOption(OPTION_BITLY_LOGIN);
  updateStringOption(OPTION_BITLY_KEY);
  useTwitterApiChanged();

  document.querySelector('#cancelButton').addEventListener('click', cancel);
  document.querySelector('#saveButton').addEventListener('click', saveAndClose);
  document.querySelector('#useTwitterApi').addEventListener('click', useTwitterApiChanged);
/*  
  if (localStorage["ads_status"] && (localStorage["ads_status"] == "disabled")) {
    document.getElementById('ads_status').checked = "checked";
  }      
  document.querySelector('#ads_status').addEventListener('click', adsStatusChanged);
*/  
});

function saveAndClose() {
  var bitlyLogin = document.getElementById(OPTION_BITLY_LOGIN).value.trim();
  var bitlyKey = document.getElementById(OPTION_BITLY_KEY).value.trim();
  if (!!bitlyLogin ^ !!bitlyKey) {
    alert('Both bit.ly login and key must be set or both cleared');
    return;
  }
  setBooleanOption(OPTION_SHORTEN_LINKS, document.getElementById(OPTION_SHORTEN_LINKS).checked);
  setBooleanOption(OPTION_USE_TWITTER_TAB, document.getElementById(OPTION_USE_TWITTER_TAB).checked);
  setBooleanOption(OPTION_TWEET_SELECTION, document.getElementById(OPTION_TWEET_SELECTION).checked);
  setBooleanOption(OPTION_USE_TWITTER_API, document.getElementById(OPTION_USE_TWITTER_API).checked);
  setStringOption(OPTION_BITLY_LOGIN, bitlyLogin);
  setStringOption(OPTION_BITLY_KEY, bitlyKey);
  window.close();
}

function cancel() {
  window.close();
}

function useTwitterApiChanged() {
  document.getElementById(OPTION_USE_TWITTER_TAB).disabled = document.getElementById(OPTION_USE_TWITTER_API).checked;
}
/*
function adsStatusChanged(){
  if (localStorage["ads_status"] && (localStorage["ads_status"] == "disabled")) {
    localStorage["ads_status"] = "enabled";
  } else {
    localStorage["ads_status"] = "disabled";
  }  
}
*/