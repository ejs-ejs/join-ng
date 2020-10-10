console.log('Loading join.js');
Services.scriptloader.loadSubScript("chrome://join-ng/content/join.js", window, "UTF-8");

//Services.scriptloader.loadSubScript("chrome://messenger/content/addressbook/abMailListDialog.js", this, "UTF-8");


function onLoad(isAddonActivation) {
    // Inject a XUL fragment (providing the needed DTD files as well)
    // using the injectElements helper function. The added elements
    // will be automatically removed on window unload.
	console.log('Injecting menu button');
	
//    WL.injectElements(`
//<menuitem id="join-ng" 
//    label="__MSG_join-ng.label__"
//    tag="JoinProcess"
//    class="menuitem-iconic"
//	insertafter="downloadSelected"
//    oncommand="window.Join.Main();"/>
//	<menuitem id="join-ng-test" 
//    label="Join-ng Test button"
//    tag="JoinTest"
//    class="menuitem-iconic"
//	insertafter="join-ng"
//    oncommand="console.log('Join-NG test button pressed');"/>
//	`);
//

WL.injectElements(`
<menuitem id="join-ng" 
    label="__MSG_join-ng.label__"
    tag="JoinProcess"
    class="menuitem-iconic"
	insertafter="downloadSelected"
    oncommand="window.Join.Main();"/>`);	
	


//insertafter="folderPaneContext-properties"
// insertafter="messagePaneContext-print"
// activityManager



    // Add a CSS file using the injectCSS helper function. The added CSS
    // will be automatically removed on window unload.
   // WL.injectCSS("chrome://quicktext/content/style.css");

    // Call a function provided by a JavaScript file loaded into the
    // global window object.
  //  window.Quicktext.init();
}