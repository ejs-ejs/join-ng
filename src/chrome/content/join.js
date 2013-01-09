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
///    join-ng.debug = true
//////////////////////////////////////////////////
function MyDump( sMsg )
{
	if ( Services.prefs.getBoolPref("join-ng.debug") == true ) {
		dump(sMsg);
	}
}


var Join = {

	PartMsgInfo : function ( number, total, id, uri )
	{
		this.id = id;
		this.number = number;
		this.total = total;
		this.uri = uri;
	},

	
	//////////////////////////////////////////////////
	///  分割メッセージの並び替え用関数
	///    (1) ID の昇順に並び替える
	///    (2) ID が同じ場合、メッセージ番号の昇順に並び替える
	///  (引数)
	///  oLeft:PartMsgInfo  分割メッセージ情報
	///  oRight:PartMsgInfo 分割メッセージ情報
	///  (戻り値)
	///  :Number 並び替えが必要な場合、正の数(1)。
	//////////////////////////////////////////////////
	SortPartMsgInfo : function ( oLeft, oRight )
	{
		if ( oLeft.id > oRight.id ) {
			return 1;
		}
		else if ( oLeft.id < oRight.id ) {
			return -1;
		}
		
		if ( Number(oLeft.number) > Number(oRight.number) ) {
			return 1;
		}
		else {
			return -1;
		}
	},
	
	
	//////////////////////////////////////////////////
	///  メイン
	///  (戻り値)
	///  :Number 0。
	//////////////////////////////////////////////////
	Main : function ()
	{
		try {
			window.setCursor('wait');
			this.Join();
		}
		catch ( e ) {
			MyDump("!!!! Exception: " + e + "\n");
		}
		finally {
			window.setCursor('auto');
		}
		
		return 0;
	},
	
	
	//////////////////////////////////////////////////
	///  結合する
	///  (戻り値)
	///  :Number 0。エラーにより中断した場合、 -1。
	//////////////////////////////////////////////////
	Join : function ()
	{
		// 結合処理を開始する
		MyDump("==============================\n");
		MyDump("## Start join process\n");
		
		// スレッドペインで選択されているメッセージを取得する
		MyDump("------------------------------\n");
		MyDump("## Get selected messages\n");
		
		// 選択されているメッセージの、メッセージ URI のリストを取得する
		var sMsgUriLst = gFolderDisplay.selectedMessageUris;
		
		// メッセージが複数選択されていない場合、中断する
		if ( ( ! sMsgUriLst ) || ( sMsgUriLst.length < 2 ) ) {
			MyDump("Too few messages ... abort\n");
			MyDump("==============================\n");
			
			// エラーメッセージを表示して中断する
			var sErrMsg = document.getElementById('JoinNGBundle').getString('TooFewMessages');
			alert(sErrMsg);
			return -1;
		}
		
		
		// 分割メッセージの情報を取得する
		MyDump("------------------------------\n");
		MyDump("## Get message infomation\n");
		
		// メッセージ URI リストの要素数を取得する
		var nMsgCnt = sMsgUriLst.length;
		// 分割メッセージ情報のリストを生成する
		var oMsgInfoLst = new Array(nMsgCnt);
		// メッセージ URI リストのインデクス
		var nMsgIdx = 0;
		
		// メッセージ情報の取得と判別をおこなう
		// この処理は、選択されているメッセージの数だけ繰り返す
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			
			// メッセージ URI を取得する
			var sMsgUri = sMsgUriLst[nMsgIdx];
			
			// メッセージ URI からメッセージヘッダを取得する
			var sMsgData = this.GetHeader(sMsgUri);
			var sMsgHead = this.FormHeader(sMsgData);
			
			// Content-Type を取得できない場合、中断する
			// ただし、フィールド名の大文字小文字を区別しない
			var sMsgType = '';
			try {
				sMsgType = sMsgHead.match(/Content-Type: *(.+)/i)[1];
			}
			catch ( e ) {
				MyDump("Message No." + nMsgIdx + ": " + e + " ... abort\n");
				MyDump("==============================\n");
				
				// エラーメッセージを表示して中断する
				var sErrMsg = document.getElementById('JoinNGBundle').getString('MissingContentType');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sMsgHead=" + sMsgHead;
				alert(sErrMsg + "\n\n" + e + "\n" + sErrDtl);
				return -1;
			}
			
			// Content-Type が message/partial でない場合、中断する
			// ただし、フィールド値の大文字小文字を区別しない
			if ( ! sMsgType.match(/^message\/partial/i) ) {
				MyDump("Message No." + nMsgIdx + ": Content-Type isn't 'message/partial' ... abort\n");
				MyDump("==============================\n");
				
				// エラーメッセージを表示して中断する
				var sErrMsg = document.getElementById('JoinNGBundle').getString('NotPartialMessage');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sMsgType=" + sMsgType;
				alert(sErrMsg + "\n\n" + sErrDtl);
				return -1;
			}
			
			// message/partial メッセージのパラメータを取得できない場合、中断する
			// ただし、フィールド値の大文字小文字を区別しない
			// また、二重引用符に囲まれた文字列以外のパターンにも対応する
			oMsgInfoLst[nMsgIdx] = new this.PartMsgInfo();
			try {
				oMsgInfoLst[nMsgIdx].number = sMsgType.match(/number=([0-9]+)/i)[1];
				oMsgInfoLst[nMsgIdx].total = sMsgType.match(/total=([0-9]+)/i)[1];
				// Winbiff による、id が二重引用符に囲まれていないパターンにも対応する
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
				
				// エラーメッセージを表示して中断する
				var sErrMsg = document.getElementById('JoinNGBundle').getString('MissingParameter');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sMsgType=" + sMsgType;
				alert(sErrMsg + "\n\n" + e + "\n" + sErrDtl);
				return -1;
			}
			
			MyDump("Message No." + nMsgIdx + ": " +
			       "number=" + oMsgInfoLst[nMsgIdx].number + ", " +
			       "total=" + oMsgInfoLst[nMsgIdx].total + ", " +
			       "id=" + oMsgInfoLst[nMsgIdx].id + "\n");
		}
		
		
		MyDump("------------------------------\n");
		MyDump("## Sort messages\n");
		
		// メッセージを並び替える
		oMsgInfoLst.sort(this.SortPartMsgInfo);
		
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			MyDump("Message No." + nMsgIdx + ": " +
			       "number=" + oMsgInfoLst[nMsgIdx].number + ", " +
			       "total=" + oMsgInfoLst[nMsgIdx].total + ", " +
			       "id=" + oMsgInfoLst[nMsgIdx].id + "\n");
		}
		
		MyDump("------------------------------\n");
		MyDump("## Check messages\n");
		
		// Check if we have all the messages
		var nTotal = oMsgInfoLst[0].total;
		if ( nMsgCnt != nTotal ) {
			MyDump("The number of selected messages doesn't match the 'total' of the parameter for 'message/partial' ... abort\n");
			MyDump("==============================\n");
			
			var sErrMsg = document.getElementById('JoinNGBundle').getString('UnmatchTotal');
			var sErrDtl = "nMsgCnt=" + nMsgCnt + "\n" +
			              "nTotal=" + nTotal;
			alert(sErrMsg + "\n\n" + sErrDtl);
			return -1;
		}
		
		// 分割メールがすべて揃っていない場合、中断する
		var sId = oMsgInfoLst[0].id;
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			if ( oMsgInfoLst[nMsgIdx].id != sId ) {
				MyDump("Message No." + nMsgIdx + ": Invalid Message-ID ... abort\n");
				MyDump("==============================\n");
				
				// エラーメッセージを表示して中断する
				var sErrMsg = document.getElementById('JoinNGBundle').getString('UnmatchMessageID');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sId=" + sId + "\n" +
				              "oMsgInfoLst[nMsgIdx].id=" + oMsgInfoLst[nMsgIdx].id;
				alert(sErrMsg + "\n\n" + sErrDtl);
				return -1;
			}
			
			MyDump("Message No." + nMsgIdx + ": OK\n");
		}
		
		
		// 結合する
		MyDump("------------------------------\n");
		MyDump("## Join messages\n");
		
		// 結合メッセージデータ
		var sMsgBody = '';
		
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			
			// メッセージ URI を取得する
			var sMsgUri = oMsgInfoLst[nMsgIdx].uri;
			
			// メッセージ URI からメッセージ本文を取得し結合する
			var sMsgData = this.GetMessage(sMsgUri);
			sMsgBody += this.GetBody(sMsgData);
			
			MyDump("Message No." + nMsgIdx + ": done\n");
		}
		
		
		// 現在のフォルダへ追加する
		MyDump("------------------------------\n");
		MyDump("## Add new message\n");
		
		// おまじない
		var oMsgFolder = gFolderDisplay.displayedFolder;
		
		// IMAP アカウント、またはニュースグループアカウントのフォルダの場合、中断する
		if ( (oMsgFolder.server.type == "imap") || (oMsgFolder.server.type == "nntp") ) {
			// Create folder where we can store joined messages
			let rootMsgFolder = GetDefaultAccountRootFolder();
			if (!rootMsgFolder.containsChildNamed("Joined"))
				rootMsgFolder.createSubfolder("Joined", null);
			oMsgFolder = rootMsgFolder.getChildNamed("Joined");
		}
		
		var oMsgLocalFolder = oMsgFolder.QueryInterface(Components.interfaces.nsIMsgLocalMailFolder);
		
		// Thunderbird のメッセージヘッダを生成する
		var sTbHead = '';
		// From
		var oNow = new Date;
		sTbHead += "From - " + oNow.toString() + "\n";
		// X-Mozilla-Status と X-Mozilla-Status2
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
		if ( Services.prefs.getBoolPref("join-ng.fill") == true ) {
			// 旧い (結合前の) メッセージのメッセージヘッダを取得する
			// このメッセージヘッダは最後に結合されたメッセージ、
			// すなわち number と total とが一致しているメッセージのメッセージヘッダとなる
			// また、FormHeader() によって <CRLF> が挿入されている
			// sOldMsgHeadLst の各要素はヘッダごとに分割されている
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
		
		// Thunderbirdのメッセージヘッダをメッセージ本文に結合する
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
	///  メッセージデータからメッセージ本文を取得する
	///  (引数)
	///  sMsgData:String メッセージデータ(メッセージヘッダ+本文)
	///  (戻り値)
	///  :String メッセージ本文。エラーにより中断した場合、空文字列。
	//////////////////////////////////////////////////
	GetBody : function ( sMsgData )
	{
		// 改行文字を変換する
		sMsgData = sMsgData.replace(/\r\n/g, "\n");
		sMsgData = sMsgData.replace(/\r/g, "\n");
		
		// 最初の空行の位置を取得する
		var nMsgSplitter = sMsgData.indexOf("\n\n");
		
		// 空行がない場合、空白文字列を返す
		if ( nMsgSplitter == -1 ) {
			return '';
		}
		
		// 最初の空行より後ろの文字列を取得する
		var sMsgBody = sMsgData.substr(nMsgSplitter + "\n\n".length);
		
		return sMsgBody;
	},
	
	
	//////////////////////////////////////////////////
	///  メッセージヘッダを整形する
	///  (引数)
	///  sMsgData:String メッセージデータ(メッセージヘッダ[+本文])
	///  (戻り値)
	///  :String 整形されたメッセージヘッダ。
	//////////////////////////////////////////////////
	FormHeader : function ( sMsgData )
	{
		// 改行文字を変換 (統一) する
		sMsgData = sMsgData.replace(/\r\n/g, "\n");
		sMsgData = sMsgData.replace(/\r/g, "\n");
		
		// 文字列を行ごとに分割する
		var sLineDataLst = sMsgData.split("\n");
		
		// すべての行に対して処理を繰り返す
		var sLineIdx = 0;                    //行番号
		var sLineCnt = sLineDataLst.length;  //行数
		var sMsgHead = '';                   //メッセージヘッダ
		for ( sLineIdx = 0; sLineIdx < sLineCnt; sLineIdx++ ) {
			var sLineData = sLineDataLst[sLineIdx];
			// 空行があったら、ヘッダの取得を終わる
			if ( sLineData == '' ) {
				break;
			}
			
			// 戻り値の先頭へ余分な改行や <CRLF> を追加しない
			// あっても問題ないがエレガントじゃない
			if ( sMsgHead != '' ) {
				// 複数行のパラメータを１行にまとめる
				// パラメータの先頭の場合、直前に改行を置く
				if ( sLineData.match("^[a-zA-Z0-9-]+: *.+") ) {
					sMsgHead += "\n";
				}
				else {
					sMsgHead += '<CRLF>';
				}
			}
			
			// 水平タブを空白文字に変換する
			// エラーメッセージ表示時の見栄えを考慮しての処理
			//sMsgHead = sMsgHead.replace(/\t/g, " ");
			
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
	
	//////////////////////////////////////////////////
	///  メッセージ URI からメッセージデータを取得する
	///  (引数)
	///  sMsgUri:String  メッセージ URI
	///  nDataCnt:Number データ量 (Optional)
	///  (戻り値)
	///  :String メッセージデータ。エラーにより中断した場合、空文字列。
	//////////////////////////////////////////////////
	GetMessage : function ( sMsgUri, nDataCnt )
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
		
		// データ量が指定されていない場合、全データを取得する
		if ( ( nDataCnt == null ) || ( nDataCnt == 0 )) {
			while ( oScrInStream.available() ) {
				sMsgData += oScrInStream.read(1000);
			}
		}
		else {
			sMsgData += oScrInStream.read(nDataCnt);
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
