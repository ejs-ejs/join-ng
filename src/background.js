async function main() {

  messenger.WindowListener.registerDefaultPrefs("defaults/preferences/preferences.js")
 
  messenger.WindowListener.registerChromeUrl([ 
  ["content",  "join-ng",           "chrome/content/"],
  ["resource", "join-ng-shared",    "chrome/skin/shared/"],
  ["resource", "join-ng",            osResourcePath ],
  ["locale",   "join-ng", "en-US",  "chrome/locale/en-US/"],
  ["locale",   "join-ng", "ja-JP",     "chrome/locale/ja-JP/"],
  ["locale",   "join-ng", "lt-LT",     "chrome/locale/lt-LT/"]
  );

   messenger.WindowListener.registerOptionsPage("chrome://join-ng/content/options.xul")
 
   messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messenger.xul", 
	// chrome://join-ng/content/joinOverlay.xul
    // "chrome://quicktext/content/scripts/messenger.js"
	chrome://join-ng/content/scripts/messenger.js);
	
  messenger.WindowListener.startListening();

}

main()