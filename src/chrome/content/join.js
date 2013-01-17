//////////////////////////////////////////////////
///
///  Joins partial messages
///
///  Copyright (c) 2007-2010 Munekazu SHINKAI
///  Copyright (c) 2013 Paulius Zaleckas
///			<paulius.zaleckas@gmail.com>
///
///  This software is provided 'as-is', without any express or implied
///  warranty. In no event will the authors be held liable for any damages
///  arising from the use of this software.
///
///  Permission is granted to anyone to use this software for any purpose,
///  including commercial applications, and to alter it and redistribute it
///  freely, subject to the following restrictions:
///
///   1. The origin of this software must not be misrepresented; you must not
///   claim that you wrote the original software. If you use this software
///   in a product, an acknowledgment in the product documentation would be
///   appreciated but is not required.
///
///   2. Altered source versions must be plainly marked as such, and must not be
///   misrepresented as being the original software.
///
///   3. This notice may not be removed or altered from any source
///   distribution.
///
//////////////////////////////////////////////////


//////////////////////////////////////////////////
///  Displays debug info on console.
///  To enable debug you have to set following variables:
///    browser.dom.window.dump.enabled = true
///    extensions.join-ng.debug = true
//////////////////////////////////////////////////
function MyDump( sMsg )
{
	if ( Services.prefs.getBoolPref("extensions.join-ng.debug") == true ) {
		dump(sMsg);
	}
}


var Join = {

	mStatusFeedback: null,

	PartMsgInfo : function ( number, total, id, uri )
	{
		this.id = id;
		this.number = number;
		this.total = total;
		this.uri = uri;
	},

	//////////////////////////////////////////////////
	///  Sort by PartMsgInfo
	///  Return 1 if needs sorting, else -1.
	//////////////////////////////////////////////////
	SortPartMsgInfo : function ( oLeft, oRight )
	{
		if ( Number(oLeft.number) > Number(oRight.number) ) {
			return 1;
		}
		else {
			return -1;
		}
	},

	Main : function ()
	{
		try {
			window.setCursor('wait');
			this.mStatusFeedback = msgWindow.statusFeedback;
			this.mStatusFeedback.startMeteors();
			this.Join();
		}
		catch ( e ) {
			MyDump("!!!! Exception: " + e + "\n");
		}
		finally {
			this.mStatusFeedback.stopMeteors();
			window.setCursor('auto');
		}

		return 0;
	},

	MessagesBasicCheck : function (oMsgInfoLst, nMsgCnt)
	{
		MyDump("------------------------------\n");
		MyDump("## Check messages\n");

		// Check if we have all the messages
		var nTotal = oMsgInfoLst[0].total;
		if (nMsgCnt != nTotal) {
			MyDump("The number of selected messages doesn't match the 'total' ... abort\n");
			MyDump("==============================\n");

			var sErrMsg = document.getElementById('JoinNGBundle').getString('UnmatchTotal');
			var sErrDtl = "nMsgCnt=" + nMsgCnt + "\n" +
			              "nTotal=" + nTotal;
			alert(sErrMsg + "\n\n" + sErrDtl);
			return false;
		}

		// Check if messages numbers are sequential
		for (nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++) {
			if (Number(oMsgInfoLst[nMsgIdx].number) != (nMsgIdx + 1)) {
				MyDump("Message sequence No." + nMsgIdx + " does not match real No." + oMsgInfoLst[nMsgIdx].number + "\n");
				MyDump("==============================\n");

				var sErrMsg = document.getElementById('JoinNGBundle').getString('UnmatchMessageSeq');
				alert(sErrMsg);
				return false;
			}
		}

		// Check if all messages have the same Message-ID
		var sId = oMsgInfoLst[0].id;
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 1; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			if ( oMsgInfoLst[nMsgIdx].id != sId ) {
				MyDump("Message No." + nMsgIdx + ": Invalid Message-ID ... abort\n");
				MyDump("==============================\n");

				var sErrMsg = document.getElementById('JoinNGBundle').getString('UnmatchMessageID');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sId=" + sId + "\n" +
				              "oMsgInfoLst[nMsgIdx].id=" + oMsgInfoLst[nMsgIdx].id;
				alert(sErrMsg + "\n\n" + sErrDtl);
				return false;
			}

			MyDump("Message No." + nMsgIdx + ": OK\n");
		}

		return true;
	},

	ProcessMIME : function (sMsgUriLst, nMsgCnt)
	{
		var oMsgInfoLst = new Array(nMsgCnt);
		var nMsgIdx;

		// Get required info from all selected messages headers
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			var sMsgUri = sMsgUriLst[nMsgIdx];
			var sMsgData = this.GetHeader(sMsgUri);
			var sMsgHead = this.FormHeader(sMsgData);

			// Get Content-Type field (case insensitive)
			var sMsgType = '';
			try {
				sMsgType = sMsgHead.match(/Content-Type: *(.+)/i)[1];
			}
			catch ( e ) {
				MyDump("Message No." + nMsgIdx + ": " + e + " ... abort\n");
				MyDump("==============================\n");

				return null;
			}

			// Check if Content-Type is message/partial (case insensitive)
			if ( ! sMsgType.match(/^message\/partial/i) ) {
				MyDump("Message No." + nMsgIdx + ": Content-Type isn't 'message/partial' ... abort\n");
				MyDump("==============================\n");

				var sErrMsg = document.getElementById('JoinNGBundle').getString('NotPartialMessage');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sMsgType=" + sMsgType;
				alert(sErrMsg + "\n\n" + sErrDtl);
				return null;
			}

			// Get message/partial fields info (case insensitive)
			// support values not only in double quotes
			oMsgInfoLst[nMsgIdx] = new this.PartMsgInfo();
			try {
				oMsgInfoLst[nMsgIdx].number = sMsgType.match(/number=([0-9]+)/i)[1];
				oMsgInfoLst[nMsgIdx].total = sMsgType.match(/total=([0-9]+)/i)[1];

				var oREResLst = sMsgType.match(/id=\"([^\"]+)\"|id=([^ \(\)<>@,;:\\\"\/\[\]\?=]+)(\(null\))?[;$]/i);
				if ( oREResLst[1] ) {
					oMsgInfoLst[nMsgIdx].id = oREResLst[1];
				}
				else {
					oMsgInfoLst[nMsgIdx].id = oREResLst[2];
				}
				oMsgInfoLst[nMsgIdx].uri = sMsgUri;
			}
			catch ( e ) {
				MyDump("Message No." + nMsgIdx + ": " + e + " ... abort\n");
				MyDump("==============================\n");

				var sErrMsg = document.getElementById('JoinNGBundle').getString('MissingParameter');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sMsgType=" + sMsgType;
				alert(sErrMsg + "\n\n" + e + "\n" + sErrDtl);
				return null;
			}

			MyDump("Message No." + nMsgIdx + ": " +
			       "number=" + oMsgInfoLst[nMsgIdx].number + ", " +
			       "total=" + oMsgInfoLst[nMsgIdx].total + ", " +
			       "id=" + oMsgInfoLst[nMsgIdx].id + "\n");
		}


		MyDump("------------------------------\n");
		MyDump("## Sort messages\n");

		oMsgInfoLst.sort(this.SortPartMsgInfo);

		var oMsgSortedUriLst = new Array(nMsgCnt);
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			MyDump("Message No." + nMsgIdx + ": " +
			       "number=" + oMsgInfoLst[nMsgIdx].number + ", " +
			       "total=" + oMsgInfoLst[nMsgIdx].total + ", " +
			       "id=" + oMsgInfoLst[nMsgIdx].id + "\n");
			oMsgSortedUriLst[nMsgIdx] = oMsgInfoLst[nMsgIdx].uri;
		}

		if (!this.MessagesBasicCheck(oMsgInfoLst, nMsgCnt))
			return null;

		return oMsgSortedUriLst;
	},

	ProcessOldOE : function (sMsgUriLst, nMsgCnt)
	{
		var oMsgInfoLst = new Array(nMsgCnt);
		var nMsgIdx;

		// Get required info from all selected messages headers
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			var msgUri = sMsgUriLst[nMsgIdx];
			var msgHdr = messenger.msgHdrFromURI(msgUri);
			oMsgInfoLst[nMsgIdx] = new this.PartMsgInfo();

			oMsgInfoLst[nMsgIdx].uri = msgUri;

			try {
				var msgNumbers = msgHdr.subject.match(/(.*)\[(\d+)\/(\d+)\]$/);
				oMsgInfoLst[nMsgIdx].id = msgNumbers[1];
				oMsgInfoLst[nMsgIdx].number = msgNumbers[2];
				oMsgInfoLst[nMsgIdx].total = msgNumbers[3];
			}
			catch (e) {
				return null;
			}
		}

		MyDump("------------------------------\n");
		MyDump("## Sort messages\n");

		oMsgInfoLst.sort(this.SortPartMsgInfo);

		var oMsgSortedUriLst = new Array(nMsgCnt);
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			MyDump("Message No." + nMsgIdx + ": " +
			       "number=" + oMsgInfoLst[nMsgIdx].number + ", " +
			       "total=" + oMsgInfoLst[nMsgIdx].total + "\n");
			oMsgSortedUriLst[nMsgIdx] = oMsgInfoLst[nMsgIdx].uri;
		}

		if (!this.MessagesBasicCheck(oMsgInfoLst, nMsgCnt))
			return null;

		/*
		 * First message must have "begin" and the last one "end"
		 */
		var sMsgData = this.GetMessage(oMsgInfoLst[0].uri);
		var sMsgBody = this.GetBody(sMsgData);
		if (sMsgBody.match(/^begin \d\d\d /) == -1)
			return null;

		sMsgData = this.GetMessage(oMsgInfoLst[nMsgCnt - 1].uri);
		sMsgBody = this.GetBody(sMsgData);
		if (sMsgBody.match(/^end$/) == -1)
			return null;

		return oMsgSortedUriLst;
	},

	GetLocalFolder : function ()
	{
		// Current folder we are in
		var oMsgFolder = gFolderDisplay.displayedFolder;

		// We can't create messages in IMAP, newsgroup or messanger folders
		if ( (oMsgFolder.server.type == "imap") || (oMsgFolder.server.type == "nntp") || (oMsgFolder.server.type == "im") ) {
			// Get localized folder name
			var sFolderName = Services.prefs.getComplexValue("extensions.join-ng.folder", Components.interfaces.nsIPrefLocalizedString).data;
			// We should be able to store messages in "Local Folders/Joined"
			var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
			let localMsgFolder = acctMgr.localFoldersServer.rootMsgFolder;
			// Create "Joined" folder if there is no such folder yet
			if (!localMsgFolder.containsChildNamed(sFolderName))
				localMsgFolder.createSubfolder(sFolderName, null);
			oMsgFolder = localMsgFolder.getChildNamed(sFolderName);
		}

		return oMsgFolder;
	},

	//////////////////////////////////////////////////
	///  Return 0. On error return -1.
	//////////////////////////////////////////////////
	Join : function ()
	{
		MyDump("==============================\n");
		MyDump("## Start join process\n");

		this.mStatusFeedback.showStatusString(document.getElementById('JoinNGBundle').getString('JoinInProgress'));

		MyDump("------------------------------\n");
		MyDump("## Get selected messages\n");

		// Get URIs of selected messages
		var sMsgUriLst = gFolderDisplay.selectedMessageUris;

		// Abort if less than 2 messages selected
		if ( ( ! sMsgUriLst ) || ( sMsgUriLst.length < 2 ) ) {
			MyDump("Too few messages ... abort\n");
			MyDump("==============================\n");

			var sErrMsg = document.getElementById('JoinNGBundle').getString('TooFewMessages');
			alert(sErrMsg);
			return -1;
		}

		MyDump("------------------------------\n");
		MyDump("## Get message infomation\n");

		var nMsgCnt = sMsgUriLst.length;

		var sMsgSortedUriLst = this.ProcessMIME(sMsgUriLst, nMsgCnt);
		if (sMsgSortedUriLst == null) {
			// Maybe this message is from old OE and has no MIME info?
			sMsgSortedUriLst = this.ProcessOldOE(sMsgUriLst, nMsgCnt);
			if (sMsgSortedUriLst == null) {
				var sErrMsg = document.getElementById('JoinNGBundle').getString('InvalidMessages');
				alert(sErrMsg);
				return -1;
			}
		}

		MyDump("------------------------------\n");
		MyDump("## Join messages\n");

		var sMsgBody = '';

		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			// Get the message URI
			var sMsgUri = sMsgSortedUriLst[nMsgIdx];
			var msgHdr = messenger.msgHdrFromURI(sMsgUri);

			// Get message body by URI
			var sMsgData = this.GetMessage(sMsgUri);
			sMsgBody += this.GetBody(sMsgData);

			// Mark joined messages as read
			msgHdr.markRead(true);

			MyDump("Message No." + nMsgIdx + ": done\n");
		}

		MyDump("------------------------------\n");
		MyDump("## Add new message\n");

		// Current folder we are in
		var oMsgFolder = this.GetLocalFolder();
		var oMsgLocalFolder = oMsgFolder.QueryInterface(Components.interfaces.nsIMsgLocalMailFolder);

		// Thunderbird message header
		var sTbHead = '';
		// From
		var oNow = new Date;
		sTbHead += "From - " + oNow.toString() + "\n";
		// X-Mozilla-Status and X-Mozilla-Status2
		if ( sMsgBody.indexOf("X-Mozilla-Status") < 0 ) {
			sTbHead += "X-Mozilla-Status: 0001\n" +
			           "X-Mozilla-Status2: 00000000\n";
		}
		// X-Account-Key
		if ( sMsgBody.indexOf("X-Account-Key") < 0) {
			var oAccountMng = Components.classes["@mozilla.org/messenger/account-manager;1"].getService()
			                  .QueryInterface(Components.interfaces.nsIMsgAccountManager);
			var oAccount = oAccountMng.FindAccountForServer(oMsgFolder.server);
			sTbHead += "X-Account-Key: " + oAccount.key + "\n";
		}

		// Fill new message header from original messages if enabled
		if ( Services.prefs.getBoolPref("extensions.join-ng.fill") == true ) {
			// Get old message header from the first message
			// Each line is split into sOldMsgHeadLst list
			var sMsgData = this.GetHeader(sMsgSortedUriLst[0]);
			var sMsgHead = this.FormHeader(sMsgData);
			var sOldMsgHead = sMsgHead.replace(/\r\n/g, "\n");
			sOldMsgHead = sOldMsgHead.replace(/\r/g, "\n");
			var sOldMsgHeadLst = sOldMsgHead.split("\n");
			var nOldMsgHeadCnt = sOldMsgHeadLst.length;

			// 新しい (結合後の) メッセージのメッセージヘッダを取得する
			// このメッセージヘッダは FormHeader() によって <CRLF> が挿入されている
			// sNewMsgHeadLst の各要素はヘッダごとに分割されている
			var sNewMsgHead = this.FormHeader(sMsgBody);
			sNewMsgHead = sNewMsgHead.replace(/\r\n/g, "\n");
			sNewMsgHead = sNewMsgHead.replace(/\r/g, "\n");
			var sNewMsgHeadLst = sNewMsgHead.split("\n");
			var nNewMsgHeadCnt = sNewMsgHeadLst.length;

			// メッセージヘッダをマージする
			var nOldMsgHeadIdx = 0;
			var nNewMsgHeadIdx = 0;
			var oMatchs = 0;
			var sOldHeadName = '';
			var sNewHeadName = '';
			for ( nOldMsgHeadIdx = 0; nOldMsgHeadIdx < nOldMsgHeadCnt; nOldMsgHeadIdx++ ) {
				// ヘッダでない場合、次へ
				// 空行の場合もここではじかれる
				if ( ! ( oMatchs = sOldMsgHeadLst[nOldMsgHeadIdx].match(/^([a-zA-Z0-9-]+?): *(.+)\n?$/) ) ) {
					continue;
				}

				// ヘッダの値がない場合、そのヘッダを無効にして次へ
				if ( this.Trim(oMatchs[2]) == "" ) {
					sOldMsgHeadLst[nOldMsgHeadIdx] = "";
					continue;
				}

				// 比較のため、ヘッダの名前を保持しておく
				sOldHeadName = oMatchs[1];

				for ( nNewMsgHeadIdx = 0; nNewMsgHeadIdx < nNewMsgHeadCnt; nNewMsgHeadIdx++ ) {
					// ヘッダでない場合、次へ
					// 空行の場合もここではじかれる
					if ( ! ( oMatchs = sNewMsgHeadLst[nNewMsgHeadIdx].match(/^([a-zA-Z0-9-]+?): *(.+)\n?$/) ) ) {
						continue;
					}

					// ヘッダの値がない場合、そのヘッダを無効にして次へ
					if ( this.Trim(oMatchs[2]) == "" ) {
						sNewMsgHeadLst[nNewMsgHeadIdx] = "";
						continue;
					}

					// 比較のため、ヘッダの名前を保持しておく
					sNewHeadName = oMatchs[1];

					// 重複したヘッダの場合、新しいヘッダを使用する
					// ただし、以後その新しいヘッダは無効にする
					if ( sOldHeadName == sNewHeadName ) {
						sTbHead += ( this.DecodeCrlf(sNewMsgHeadLst[nNewMsgHeadIdx]) + "\n" );
						sNewMsgHeadLst[nNewMsgHeadIdx] = "";
						break;
					}
				}

				// 重複がない場合、旧いヘッダを使用する
				if ( nNewMsgHeadIdx == nNewMsgHeadCnt ) {
					sTbHead += ( this.DecodeCrlf(sOldMsgHeadLst[nOldMsgHeadIdx]) + "\n" );
				}
			}

			// 重複していない新しいヘッダをくっつける
			for ( nNewMsgHeadIdx = 0; nNewMsgHeadIdx < nNewMsgHeadCnt; nNewMsgHeadIdx++ ) {
				if ( sNewMsgHeadLst[nNewMsgHeadIdx] != "" ) {
					sTbHead += ( this.DecodeCrlf(sNewMsgHeadLst[nNewMsgHeadIdx]) + "\n" );
				}
			}
		}

		// add Thunderbird header to the message body
		sMsgBody = sTbHead + "\n" + this.GetBody(sMsgBody) + "\n";

		var oMsgHead = oMsgLocalFolder.addMessage(sMsgBody);

		// Mark new joined message as unread
		oMsgHead.markRead(false);

		MyDump("------------------------------\n");

		MyDump("## It's done, Hooray!\n");
		MyDump("==============================\n");

		return 0;
	},


	//////////////////////////////////////////////////
	///  Returns empty string on failure
	//////////////////////////////////////////////////
	GetBody : function ( sMsgData )
	{
		// Conver new-line characters
		sMsgData = sMsgData.replace(/\r\n/g, "\n");
		sMsgData = sMsgData.replace(/\r/g, "\n");

		// Get location of first empty line
		var nMsgSplitter = sMsgData.indexOf("\n\n");

		// Abort if no empty line
		if ( nMsgSplitter == -1 ) {
			return '';
		}

		// Get string below this empty line
		var sMsgBody = sMsgData.substr(nMsgSplitter + "\n\n".length);

		return sMsgBody;
	},


	FormHeader : function ( sMsgData )
	{
		// Conver new-line characters
		sMsgData = sMsgData.replace(/\r\n/g, "\n");
		sMsgData = sMsgData.replace(/\r/g, "\n");

		// Split data at each new-line
		var sLineDataLst = sMsgData.split("\n");

		var sLineIdx = 0;
		var sLineCnt = sLineDataLst.length;
		var sMsgHead = '';
		for ( sLineIdx = 0; sLineIdx < sLineCnt; sLineIdx++ ) {
			var sLineData = sLineDataLst[sLineIdx];
			// if it is empty line - end of header
			if ( sLineData == '' ) {
				break;
			}

			// don't add new-line at the first line
			if ( sMsgHead != '' ) {
				// if parameter one-line add new-line, if multi-line add <CRLF>
				if ( sLineData.match("^[a-zA-Z0-9-]+: *.+") ) {
					sMsgHead += "\n";
				}
				else {
					sMsgHead += '<CRLF>';
				}
			}

			sMsgHead += sLineData;
		}
		sMsgHead += "\n";

		return sMsgHead;
	},


	//////////////////////////////////////////////////
	///  メッセージ URI からメッセージヘッダを取得する
	///  (引数)
	///  sMsgUri:String メッセージ URI
	///  (戻り値)
	///  :String メッセージヘッダ。エラーにより中断した場合、空文字列。
	//////////////////////////////////////////////////
	GetHeader : function ( sMsgUri )
	{
		// おまじない
		var oMsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
		var oInStream = oMsgStream.QueryInterface(Components.interfaces.nsIInputStream);

		// おまじない
		var oScrIn = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
		var oScrInStream = oScrIn.QueryInterface(Components.interfaces.nsIScriptableInputStream);
		oScrInStream.init(oInStream);

		// おまじない
		var oMsgServ = messenger.messageServiceFromURI(sMsgUri);
		try {
			oMsgServ.streamMessage(sMsgUri, oMsgStream, msgWindow, null, false, null);
		}
		catch ( e ) {
			return '';
		}

		// メッセージデータを取得する
		var sMsgHead = '';
		oScrInStream.available();
		while ( oScrInStream.available() ) {
			sMsgHead += oScrInStream.read(1000);

			// 最初の空行までの文字列を返す
			var nSpilitter = sMsgHead.indexOf("\r\n\r\n");
			if ( nSpilitter != -1 ) {
				sMsgHead = sMsgHead.substr(0, nSpilitter);
				break;
			}
		}

		return sMsgHead;
	},

	GetMessage : function ( sMsgUri )
	{
		// おまじない
		var oMsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
		var oInStream = oMsgStream.QueryInterface(Components.interfaces.nsIInputStream);

		// おまじない
		var oScrIn = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
		var oScrInStream = oScrIn.QueryInterface(Components.interfaces.nsIScriptableInputStream);
		oScrInStream.init(oInStream);

		// おまじない
		var oMsgServ = messenger.messageServiceFromURI(sMsgUri);
		try {
			oMsgServ.streamMessage(sMsgUri, oMsgStream, msgWindow, null, false, null);
		}
		catch ( e ) {
			return '';
		}

		// メッセージデータを取得する
		var sMsgData = '';
		oScrInStream.available();

		while ( oScrInStream.available() ) {
			sMsgData += oScrInStream.read(1000);
		}

		return sMsgData;
	},

	Trim : function ( sText )
	{
		return sText.match(/^\s*(.*?)\s*$/)[1];
	},

	DecodeCrlf : function ( sText )
	{
		return sText.replace(/<CRLF>/g, "\n");
	},

}
