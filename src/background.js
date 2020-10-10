async function main() {

  messenger.WindowListener.registerDefaultPrefs("defaults/preferences/prefs.js")
 
  messenger.WindowListener.registerChromeUrl([ 
  ["content",  "join-ng",           "chrome/content/"],
  ["resource", "join-ng-shared",    "chrome/skin/shared/"],
  //["resource", "join-ng",            osResourcePath ],
  ["locale",   "join-ng", "en-US",  "chrome/locale/en-US/"],
  ["locale",   "join-ng", "ja-JP",     "chrome/locale/ja-JP/"],
  ["locale",   "join-ng", "lt-LT",     "chrome/locale/lt-LT/"]
  ]
  );

   messenger.WindowListener.registerOptionsPage("chrome://join-ng/content/options.xhtml");
 console.log("Registering messenger.js to messenger.xhtml");
   messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messenger.xhtml", 
	"chrome://join-ng/content/scripts/loader.js");

	// chrome://join-ng/content/joinOverlay.xul
    // "chrome://quicktext/content/scripts/messenger.js"	

	console.log("Start listening to " + self.uniqueRandomID);
  messenger.WindowListener.startListening();

}

main()