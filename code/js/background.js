/**
 * Created by yrst on 3/30/2016.
 */
var uninstallUrl = "https://sites.google.com/site/tweetthispagefeedback/";
chrome.runtime.setUninstallURL(uninstallUrl, function() {
  console.log("Please do not uninstall me...");
});