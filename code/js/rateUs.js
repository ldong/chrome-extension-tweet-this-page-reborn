/**
 * Created by yrst on 3/24/2016.
 */
var tweets = getStringOption(DATA_TWEETED);
if (tweets) {
  tweets = parseInt(tweets);
}

$(".tweetsCount").text(tweets);

$("button.remindLater").click(function() {
  window.close();
});

$("button.doNotAsk").click(function() {
  setStringOption(DATA_NEVER_SHOW_RATE_WINDOW, "1");
  window.close();
});

$("a").click(function() {
  setStringOption(DATA_NEVER_SHOW_RATE_WINDOW, "1");
  window.close();
});