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
 * Accesser/setter of user options that may be set in options screen.
 * Also used as a quick access to local storage.
 */

var DATA_OAUTH_TOKEN = "oauth_token";
var DATA_OAUTH_TOKEN_SECRET = "oauth_token_secret";
var DATA_AUTHORIZED = "authorized";
var DATA_PIN_REQUESTED = "pin_requested";
var DATA_TWEETED = "tweeted";
var DATA_NEVER_SHOW_RATE_WINDOW = "neverShowRateWindow";

var SHOW_RATE_COUNTS = 15;

var OPTION_FIRST_RUN = "firstRun";
var OPTION_SHORTEN_LINKS = "alwaysShortenLinks";
var OPTION_USE_TWITTER_TAB = "useExistingTwitterTab";
var OPTION_USE_TWITTER_API = "useTwitterApi";
var OPTION_TWEET_SELECTION = "tweetSelection";
var OPTION_BITLY_LOGIN = "bitlyLogin";
var OPTION_BITLY_KEY = "bitlyKey";

var defaults = {};
defaults[OPTION_FIRST_RUN] = "true";
defaults[OPTION_SHORTEN_LINKS] = "false";
defaults[OPTION_USE_TWITTER_TAB] = "true";
defaults[OPTION_USE_TWITTER_API] = "false";
defaults[OPTION_TWEET_SELECTION] = "true";
defaults[OPTION_BITLY_LOGIN] = "";
defaults[OPTION_BITLY_KEY] = "";
defaults[DATA_TWEETED] = 0;
defaults[DATA_NEVER_SHOW_RATE_WINDOW] = "0";

function setStringOption(name, value) {
  localStorage[name] = value;
}

function getStringOption(name) {
  var value = localStorage[name];
  if (value === undefined) {
    value = defaults[name];
  }
  return value;
}

function clearOption(name) {
  localStorage.removeItem(name);
}

function setBooleanOption(name, value) {
  setStringOption(name, value);
}

function getBooleanOption(name) {
  var value = getStringOption(name);
  return value === 'true';
}

function updateCheckboxOption(optionName) {
  document.getElementById(optionName).checked = getBooleanOption(optionName) ? 'checked' : '';
}

function updateStringOption(optionName) {
  document.getElementById(optionName).value = getStringOption(optionName);
}

