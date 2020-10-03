function initJoinNGPanel()
			{
				var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
				var branch = prefs.getBranch("extensions.join-ng.");
				document.getElementById("JoinNGFolder").value = branch.getComplexValue("folder", Components.interfaces.nsIPrefLocalizedString).data;
			}

function updateJoinNGPrefs()
			{
				var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
				var branch = prefs.getBranch("extensions.join-ng.");
				var pls = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
				pls.data = document.getElementById("JoinNGFolder").value;
				branch.setComplexValue("folder", Components.interfaces.nsIPrefLocalizedString, pls);
			}
			