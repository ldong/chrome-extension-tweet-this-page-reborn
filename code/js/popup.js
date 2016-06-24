/*
 * Copyright 2010 Roman Skabichevsky.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * Popup window. Can be in 3 modes - enter pin, enter tweet (if using Twitter
 * API) or simple information message "Shortening" if we want to open Twitter
 * tab. Also, if we use twitter API and user is not yet authorized (we don't
 * have access token), we just show "Authorizing" message and try to get
 * request token from Twitter.
 */
var shorten_ViaAPI = localStorage.bitlyLogin;

var getCurrentMessageId = function() {
  var commonForm = document.getElementById('commonForm');
  var tweetForm = document.getElementById('tweetForm');
  var pinForm = document.getElementById('pinForm');
  if (commonForm.style.display != 'none') {
    return 'commonMessage';
  } else if (tweetForm.style.display != 'none') {
    return 'tweetMessage';
  } else if (pinForm.style.display != 'none') {
    return 'pingMessage';
  }
  return null;
};

var setMessage = function(status) {
  var currentMessageId = getCurrentMessageId();
  if (currentMessageId) {
    document.getElementById(currentMessageId).style.display = '';
    document.getElementById(currentMessageId).innerHTML = status;
  }
};

var standardResponseCallback = function(response) {
  if (response.status == 'SUCCESS') {
    window.close();
  } else {
    setMessage('Error: ' + response.obj.error);
  }
};

var tweetFromTab = function(tab) {
  setMessage('Shortening...');
  chrome.extension.sendRequest(
    {
      method: 'tweetFromTab',
      title: tab.title,
      url: tab.url,
      windowId: tab.windowId
    }, standardResponseCallback);
};

var submitTweet = function() {
  if (!getTweetButtonEnabled()) {
    return;
  }
  trackEvent('popup', 'submitTweet');
  setTweetFormEnabled(false);
  document.getElementById('charsLeft').innerHTML = '';
  setMessage("Tweeting...");
  chrome.extension.sendRequest(
    {
      method: 'tweetFromApi',
      status: document.getElementById('status').value
    }, function(response) {
      if (response.status == 'SUCCESS') {
        var tweeted = parseInt(getStringOption(DATA_TWEETED));
        tweeted++;
        setStringOption(DATA_TWEETED, tweeted);
        if (getStringOption(DATA_NEVER_SHOW_RATE_WINDOW) !== "1" && tweeted % SHOW_RATE_COUNTS === 0) {
          chrome.extension.sendRequest({method: "showRateWindow"});
        }
        setMessage('<font color="green">Done!</font>');
        setTimeout(function() {
          window.close();
        }, 1000);
      } else if (response.obj.status == 401) {
        setMessage('Authorization error. Redirecting to Twitter access page.');
        setTimeout(function() {
          authorize();
        }, 3000);
      } else {
        setMessage('Error: ' + response.obj.error);
        setTweetFormEnabled(true);
      }
    });
};

var isAuthorized = function() {
  return getBooleanOption(DATA_AUTHORIZED);
};

var isPinRequested = function() {
  return getBooleanOption(DATA_PIN_REQUESTED);
};

var setActiveForm = function(formName) {
  var forms = ['commonForm', 'tweetForm', 'pinForm'];
  for (var i in forms) {
    if (forms[i] != formName) {
      document.getElementById(forms[i]).style.display = 'none';
    }
  }
  document.getElementById(formName).style.display = '';
};

var submitPin = function() {
  trackEvent('popup', 'submitPin');
  if (!isPinGood()) {
    return;
  }
  setActiveForm('commonForm');
  setMessage('Authorizing...');
  chrome.extension.sendRequest(
    {method: 'get_access_token', pin: document.getElementById('pin').value},
    function(response) {
      if (response.status == 'SUCCESS') {
        setMessage('Authorized!');
        setTimeout(function() {
          window.close();
        }, 2000);
      } else if (response.obj.status == 401) {
        setMessage('Error: Invalid or expired token.');
        setTimeout(function() {
          setActiveForm('pinForm');
          checkPin();
        }, 3000);
      } else {
        setMessage('Error: ' + response.obj.obj && response.obj.obj.error);
      }
    });
};

var authorize = function() {
  setActiveForm('commonForm');
  setMessage('Authorizing...');
  chrome.extension.sendRequest({method: 'authorize'}, function(response) {
    if (response.status == 'SUCCESS') {
      window.close();
    } else {
      setMessage('Authorization error: ' + response.obj.error);
    }
  });
};

var hideMessage = function() {
  var currentMessageId = getCurrentMessageId();
  if (currentMessageId) {
    document.getElementById(currentMessageId).style.display = 'none';
  }
};

var shorten = function(url, callback) {
  chrome.extension.sendRequest({method: 'shorten', 'url': url}, callback);
};

var setTweetFormEnabled = function(canTweet) {
  var statusEl = document.getElementById('status');
  statusEl.disabled = !canTweet;
  setTweetButtonEnabled(canTweet);
  if (!canTweet) {
    statusEl.focus();
  }
};

var setTweetButtonEnabled = function(value) {
  document.getElementById('tweetButton').className = value ? 'button' : 'button disabled';
};

var getTweetButtonEnabled = function() {
  return document.getElementById('tweetButton').className.indexOf('disabled') == -1;
};

var countCharsLeft = function(doNotShorten) {
  hideMessage();
  setTimeout(function() {
    var canTweet = true;
    if (!shorten_ViaAPI || doNotShorten) {
      var tweets = document.getElementById('status').value;
      var urlRegx = / https?:\/\/[\da-z\.-]+\.[a-z\.]{2,6}[-\/\w\.\?\=\&]*\/?$/, urlLen = 0, sUrlLen = 0;
      if (tweets !== "") {
        var matchedCase = tweets.match(urlRegx);
        if (matchedCase && matchedCase.length > 0) {
          sUrlLen += (24 * matchedCase.length);
          for (var i = 0; i < matchedCase.length; i++) {
            urlLen += matchedCase[i].length;
          }
        }
        var actLen = tweets.length - urlLen;
        var charsLeft = 140 - actLen - sUrlLen;
        document.getElementById('charsLeft').innerHTML = charsLeft;
        document.getElementById('charsLeft').className = charsLeft >= 0 ? '' : 'red';
        canTweet = charsLeft >= 0 && charsLeft < 140;
      } else {
        canTweet = false;
      }
    } else {
      var charsLeft = 140 - document.getElementById('status').value.length;
      document.getElementById('charsLeft').innerHTML = charsLeft;
      document.getElementById('charsLeft').className = charsLeft >= 0 ? '' : 'red';
      canTweet = charsLeft >= 0 && charsLeft < 140;
    }
    setTweetButtonEnabled(canTweet);
  }, 1);

};

var setTweetField = function(value, doNotShorten) {
  var statusEl = document.getElementById('status');
  statusEl.value = value;
  statusEl.setSelectionRange(statusEl.value.length, statusEl.value.length);
  statusEl.focus();
  countCharsLeft(doNotShorten);
};

var isPinGood = function() {
  var pin = document.getElementById('pin').value.trim();
  return pin.match(/^[0-9]+$/);
};

var checkPin = function() {
  setTimeout(function() {
    var pinGood = isPinGood();
    document.getElementById('pinSubmitButton').className = pinGood ? 'button' : 'button disabled';
  }, 1);
};

var prepareAuthorizedTwitterForm = function(tabTitle, url) {
  document.getElementById('tweetForm').style.display = 'block';
  TwitterUtils.getTitleOrSelection(tabTitle, function(statusBody) {
    if (TwitterUtils.needsShorten(statusBody, url) && localStorage.bitlyLogin) {
      setTweetFormEnabled(false);
      setMessage('Shortening...');
      shorten(url, function(shortenResponse) {
        if (shortenResponse.status == 'SUCCESS') {
          setTweetField(TwitterUtils.composeTweet(statusBody, shortenResponse.obj.shortUrl));
          setTweetFormEnabled(true);
          hideMessage();
        } else {
          setTweetField(TwitterUtils.composeTweet(statusBody, url), true);
          setTweetFormEnabled(true);
          setMessage(shortenResponse.obj.error);
        }
      });
    } else {
      setTweetField(TwitterUtils.composeTweet(statusBody, url));
      setTweetFormEnabled(true);
    }
  });
};

var init = function() {
  trackPageView();
  var useTwitterApi = getBooleanOption(OPTION_USE_TWITTER_API);
  if (useTwitterApi) {
    if (isAuthorized()) {
      chrome.tabs.getSelected(null, function(tab) {
        prepareAuthorizedTwitterForm(tab.title, tab.url);
      });
    } else if (isPinRequested()) {
      setActiveForm('pinForm');
      checkPin();
    } else {
      setActiveForm('commonForm');
      setMessage('Authorizing...');
      authorize();
    }
  } else {
    setActiveForm('commonForm');
    chrome.tabs.getSelected(null, tweetFromTab);
  }
};

document.addEventListener('DOMContentLoaded', function() {
  init();
  document.querySelector('#tweetButton').addEventListener('click', submitTweet);
  document.querySelector('#pinSubmitButton').addEventListener('click', submitPin);
  document.querySelector('#authorizeButton').addEventListener('click', authorize);
  document.querySelector('#status').addEventListener('keydown', countCharsLeft);
  document.querySelector('#status').addEventListener('change', countCharsLeft);
  document.querySelector('#pin').addEventListener('keydown', checkPin);
});