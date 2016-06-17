"use strict";

/**
 * Global shortcuts to fields.
 */
var htmlBody;

// Upload context.
var isAdvancedUpload = false;
var droppedFiles = false;
var updForm;
var lastUploadedFileId;
var currentFileLink;
var driveShareDialog;
var uploadSha1;
var uploadSha256;

// Translations map
var translationsMap = {};
var translationsDefault = {
	'CLICK_TO_CHANGE': "click to change",
	'GOOGLE_AUTH_EXPIRED_REFRESH': "GoogleDrive authorization expired. Please, refresh the page",
	'GENERATING_ENC_KEY': "Generating encryption key at EnigmaBridge",
	'ENC_COMPUTATION_FAILED': "Encryption key computation failed",
	'GENERATING_ENC_KEY_IN': "Generating encryption key at EnigmaBridge in ",
	'UPLOAD_FAILED': "Upload failed: ",
	'SETTING_UP_SHARING': "Setting up your link",
	'UPLOAD_FINISHED': "Upload finished",
	'SIGNIN_FAILED': "Google Sign In failed",
	'DRIVE_NOT_CONNECTED': "Cloud drive is not yet connected",
	'ERROR_ONLY_ONE_FILE_SUPPORTED': "Only one file is supported (more coming soon)",
	'ERROR_FILE_TOO_BIG': "The maximum file size is 128 MB (more coming soon)",
	'STATE_ENCRYPTING': "Encrypting... ",
	'STATE_UPLOADING': "Uploading... ",
	'QR_SCAN_TO_EMAIL': "This QR will open an email",
	'QR_SCAN_TO_TEXT': "This QR will open a text/sms",
	'QR_SCAN_TO_TWEET': "This QR will open a tweet",
	'QR_SCAN_TO_DOWNLOAD': "This QR will start download"
};

// We have only one upload form.
var $fldInput;
var $fldLabel;
var $fldErrorMsg;
var $fldRestart;
var svgUpload;
var divButtons;
var divUploadInput;
var divUploadLogin;
var divBoxProgress;
var oldLabelData;
var divShareInfo;
var fldLink;
var fldSha256;
var fldSha1;
var divProgressBar;
var divQrInfo;
var ahrefGoogleDrive;

// Google Drive access token.
var accessToken = null;
var accessTokenExpiresAt = null;
var accessTokenRefreshAhead = 60 * 15;
var storageLoaded = false;

// Share folder drive ID where to put uploaded files in the Google Drive.
var shareFolderId;

// Uploader object.
var uploader;

// Upload progress monitoring state.
var progressData = {
	lastProgress: -1.0
};

// Other fields.
var fldMsg;
var fldFname;
var fldFnameOrig;
var fldPassword;
var fldPasswordCheck;
var chkMask;
var chkSizeConceal;
var chkPng;

var spnUploadPcnt;
var fldShareLink;
var divQrCode;
var spnBtnShare;
var btnUpload;
var btnTextNow;

var uaParser;
// ---------------------------------------------------------------------------------------------------------------------
// Functions & handlers
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Simple logging method used in this script, passed to request objects for logging.
 * @param msg
 */
function log(msg){
	console.log(formatDate(new Date()) + " " + msg);
}

/**
 * Helper method to format current date for the logging.
 * @param date
 * @returns {string}
 */
function formatDate(date) {
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var sec = date.getSeconds();
	var milli = date.getMilliseconds();
	var strTime = sprintf("%02d:%02d:%02d.%03d", hours, minutes, sec, milli);
	return date.getMonth()+1 + "/" + date.getDate() + "/" + date.getFullYear() + " " + strTime;
}

/**
 * Appends message to log element
 * @param msg
 */
function append_message(msg) {
	var newMsg = formatDate(new Date()) + " - " + msg;
	logElem.val((logElem.val() + "\n" + newMsg).trim());
}

/**
 * Sets element its success class / background color. Used for status fields.
 * @param x
 * @param success if true, success is set, if false failed is set. If undefined, none is set (both classes removed), reset.
 */
function successBg(x, success){
	if (success === undefined){
		x.removeClass('successBg');
		x.removeClass('failedBg');
	} else if (success){
		x.addClass('successBg');
		x.removeClass('failedBg');
	} else {
		x.removeClass('successBg');
		x.addClass('failedBg');
	}
}

/**
 * Sets message to the status field together by setting its success class / background color.
 * @param x
 * @param msg
 * @param success
 */
function statusFieldSet(x, msg, success){
	x.val(msg);
	successBg(x, success);
}

/**
 * Returns true if given radio button / checkbox is checked.
 * @param elem
 * @returns {*}
 */
function isChecked(elem){
	return elem.is(':checked');
}

/**
 * Returns if given element is completelly visible on the screen.
 * @param elem
 * @param partially if true partially visibility is OK -> no scrolling
 */
function isVisibleOnScreen(elem, partially){
	return elem.visible(partially === undefined ? false : partially, false, "both");
}

/**
 * Scrolls given element in such a way it is visible on the bottom.
 * @param D
 */
function scrollToElementBottom(D) {
	var top = D.offset().top - 200;
	if($('.sticky-nav').length) // Sticky Nav in use
	{
		D = D-100;
	}

	$('html,body').animate({scrollTop:top}, 'slow');
}

/**
 * Scrolls to element if not visible
 * @param elem
 * @param partially if true partially visibility is OK -> no scrolling
 */
function scrollToIfNotVisible(elem, partially){
	if (!isVisibleOnScreen(elem, partially)){
		scrollToElementBottom(elem);
	}
}

/**
 * Sets given element as disabled.
 * @param elem
 * @param disabled
 */
function setDisabled(elem, disabled){
	elem.prop('disabled', disabled);
}

/**
 * Switches main loading overlay.
 * @param started if true overlay is displayed. Hidden otherwise.
 */
function bodyProgress(started){
	if (started){
		htmlBody.addClass("loading");
	} else {
		htmlBody.removeClass("loading");
	}
}

// ---------------------------------------------------------------------------------------------------------------------
// Logic
// ---------------------------------------------------------------------------------------------------------------------

function genRandomName(){
	return eb.misc.genAlphaNonce(12);
}

function logFiles(files){
	$.each( files, function( i, file )
	{
		log(sprintf("File: [%s], size: %s B, type: %s", file.name, file.size, file.type));
	});
}

function showFiles(files, $input, $label){
	logFiles(files);
	if (files.length > 1){
		$label.text(( $input.attr( 'data-multiple-caption' ) || '' ).replace( '{count}', files.length ));

	} else {
		var fileLbl = files[ 0 ].name;
		if (!jQuery.browser.mobile) {
			$label.text( fileLbl );

		} else {
			var strongTag = document.createElement( "strong" );
			$(strongTag).text(fileLbl);
			$label.html("");
			$label.append(strongTag);
			$label.append(" (" + getTranslation('CLICK_TO_CHANGE') + ")");
		}
	}

	// Set default file name.
	if (files.length == 1) {
		var settings = getShareSettings();
		fldFname.val(settings.maskFile ? genRandomName() : files[0].name);
		fldFnameOrig.val(files[0].name);
	}

	// Hide upload icon
	svgUpload.hide();
	divButtons.show();
}

function formatSeconds(s){
	if (s < 60){
		return sprintf("%d s", s);
	} else {
		return sprintf("%d:%d s", Math.floor(s/60), s%60);
	}
}

function getShareSettings(){
	var settings = $.extend({}, shareConfig.defaultShareSettings);
	if (chkMask && chkMask.is(':input')){
		settings.maskFile = isChecked(chkMask);
	}
	if (chkPng && chkPng.is(':input')){
		settings.pngWrap = isChecked(chkPng);
	}
	if (chkSizeConceal && chkSizeConceal.is(':input')){
		settings.sizeConceal = isChecked(chkSizeConceal);
	}

	return settings;
}

// ---------------------------------------------------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------------------------------------------------

function uploadClicked(){
	var $form = $(updForm);

	// preventing the duplicate submissions if the current one is in progress
	if( $form.hasClass( 'is-uploading' ) ){
		return false;

	} else if (gapiTokenExpired()){
		resetExpiredToken();
		onUploadError( getTranslation('GOOGLE_AUTH_EXPIRED_REFRESH') );
		return false;
	}

	$form.addClass( 'is-uploading' ).removeClass( 'is-error is-success is-ready' );
	divShareInfo.hide('slow');
	onUploadStateChange(true, {val:0.0, msg: getTranslation('GENERATING_ENC_KEY')});

	if (!isAdvancedUpload){
		alert("Unsupported browser");
		return
	}

	// Setup the encryption scheme.
	var encScheme = new EnigmaShareScheme({
		eb: shareConfig.ebConfigUpload,
		logger: log,
		onComplete: function(data){
			bodyProgress(false);
			onUploadKeyCreated(encScheme);
		},
		onError: function(data){
			bodyProgress(false);

			log("Critical error: " + (data.reason ? data.reason : JSON.stringify(data)));
			onUploadError(getTranslation('ENC_COMPUTATION_FAILED'));
		},
		onRetry: function(data){
			log("EB operation retry in: " + data.interval + " ms");
			onUploadStateChange(false, getTranslation('GENERATING_ENC_KEY_IN') + formatSeconds(data.interval/1000));
		}
	});

	// Generate the file encryption key.
	bodyProgress(true);
	encScheme.build(fldPassword.val());
}

function onUploadKeyCreated(encScheme){
	var $form = $(updForm);

	// Extract file encryption key & lnonce.
	var encKey = encScheme.fKey;
	var lnonce = encScheme.lnonce;
	var secCtx = encScheme.secCtx;
	log(sprintf("fKey:   %s", eb.misc.inputToHex(encKey)));
	log(sprintf("lnonce: %s", eb.misc.inputToHex(lnonce)));
	log(sprintf("secCtx: %s", eb.misc.inputToHex(secCtx)));

	// Encrypt file in the browser, upload to drive, first file.
	var fFile = droppedFiles && droppedFiles.length > 0 ? droppedFiles[0] : undefined;
	var extraMessage = undefined;
	// If file is not provided, use text message.
	if (fFile === undefined){
		log("File not provided, using text message only");
		fFile = new Blob(["" + fldMsg.val()], {"type": "text/plain"});
	} else {
		extraMessage = fldMsg.val();
	}

	var settings = getShareSettings();
	uploader = new EnigmaUploader({
		token: accessToken,
		file: fFile,
		encKey: encKey,
		secCtx: secCtx,
		lnonceHash: sjcl.hash.sha256.hash(lnonce),

		chunkSizeMax: jQuery.browser.mobile ? 1024*1024*2 : 1024*1024*4, // 4MB chunk size
		chunkSizeAdaptive: true,

		fname: fldFname.val(),
		fnameOrig: fldFnameOrig.val(),
		extraMessage: extraMessage,
		parents: [shareFolderId],
		contentType: settings.maskFile ? 'application/octet-stream' : undefined,
		padFnc: settings.sizeConceal ? EnigmaSharingUpload.sizeConcealPadFnc : undefined,

		png: settings.sizeConceal ? pngImg : undefined,

		onProgress: function(oEvent, aux){
			if (oEvent.lengthComputable) {
				var totalPercent = (aux.offset+oEvent.loaded) / aux.total;
				onUploadStateChange(true, totalPercent);
				//statusFieldSet(fldStatus, sprintf("Uploading: %02.2f%%", totalPercent*100));
			}
		},
		onComplete: function(data) {
			log("Upload complete: " + data);
			onFileUploaded($.extend(JSON.parse(data), {
				secCtx: secCtx,
				lnonce: lnonce,
				uploader: uploader,
				encScheme: encScheme
			}));
		},
		onError: function(data) {
			//statusFieldSet(fldStatus, "Upload failed", false);
			log("Critical error: " + JSON.stringify(data));
			onUploadError(getTranslation('UPLOAD_FAILED') + data);
		},
		onStateChange: function(state){
			onUploadStateChange(true, {state:state});
		}
	});

	onUploadStateChange(true, 0);
	uploader.upload();
}

function onFileUploaded(data){
	lastUploadedFileId = data.id;

	// Initialize sharing dialog if user wants to change sharing settings.
	driveShareDialog = new gapi.drive.share.ShareClient();
	driveShareDialog.setOAuthToken(accessToken);
	driveShareDialog.setItemIds([data.id]);

	// Share with general public by default.
	shareUploadedFile(data);
	onUploadStateChange(false, getTranslation('SETTING_UP_SHARING'));
	//statusFieldSet(fldStatus, "Setting up the sharing");
}

function shareUploadedFile(data){
	log("Sharing file with public");
	var request = gapi.client.drive.permissions.create({
		resource: {
			'type': 'anyone',
			'role': 'reader'
		},
		fileId: data.id,
		fields: 'id'
	});

	request.execute(function(resp) {
		var permId;
		if (resp && resp.id) {
			permId = resp.id;
			log("File shared with public, permissionId:" + permId + ", resp:" + JSON.stringify(resp));
		} else {
			log("Error: Could not share file with public! Resp: " + JSON.stringify(resp));
		}

		data.permId = permId;
		onFileShared(data);
	});
}

function onFileShared(data){
	var $form = $(updForm);
	var linkConfig = {
		u: eb.sh.misc.inputToLinkBase64(eb.misc.inputToBits(shareConfig.ebConfigDownload.userObjectId))
	};

	var linkKeys = eb.sh.misc.getLinkKeys(shareConfig.ebConfigDownload);
	linkConfig = $.extend(linkConfig, linkKeys);
	linkConfig = $.extend(linkConfig, {
		f: data.id,
		n: eb.sh.misc.inputToLinkBase64(data.lnonce)
	});

	var link = eb.sh.misc.buildUrl(shareConfig.downloadHandler, linkConfig, shareConfig.baseUrl, true);
	if (data.uploader.sha1){
		log(sprintf("SHA1:   %s", sjcl.codec.hex.fromBits(data.uploader.sha1)));
		uploadSha1 = sjcl.codec.hex.fromBits(data.uploader.sha1);
		fldSha1.val(uploadSha1);
	}
	if (data.uploader.sha256){
		log(sprintf("SHA256: %s", sjcl.codec.hex.fromBits(data.uploader.sha256)));
		uploadSha256 = sjcl.codec.hex.fromBits(data.uploader.sha256);
		fldSha256.val(uploadSha256);
	}

	currentFileLink = link;

	log(link);
	fldLink.val(link);
	onUploadStateChange(false, getTranslation('UPLOAD_FINISHED'));
	$form.removeClass( 'is-uploading is-ready').addClass( 'is-success');
	regenerateQrCode();

	divShareInfo.show();
	setFillScreenBlocHeight();
	eb.sh.misc.async(setFillScreenBlocHeight);

	//statusFieldSet(fldStatus, "Upload finished", true);
	//setDisabled(btnUpload, false);
}

// ---------------------------------------------------------------------------------------------------------------------
// Google Drive
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Callback for G+ Sign-in. Swaps views if login successful.
 * https://developers.google.com/identity/sign-in/web/reference
 * https://developers.google.com/identity/sign-in/web/quick-migration-guide#migrate_an_html_sign-in_button
 * https://developers.google.com/identity/sign-in/web/sign-in#specify_your_apps_client_id
 */
function signinCallback(result) {
	var originalResult = result;
	if(result.access_token === undefined && result.hg) {
		result = result.hg;
	}

	if(result.access_token === undefined) {
		log("Undefined token");
		return;
	}

	accessToken = result.access_token;
	accessTokenExpiresAt = jsonGetNumber(result.expires_at);
	$('.signinWrapper').hide();
	$('#signedin').show();
	log(sprintf("Google Drive auth successful, token: %s", accessToken));

	// Token watcher
	if (result.expires_in){
		var watcherTrigger = Math.max(10, jsonGetNumber(result.expires_in) - accessTokenRefreshAhead);
		setTimeout(gapiTokenWatcher, watcherTrigger*1000);
	}

	// Load google drive lib.
	loadDrive();
}

function signinCallbackFailure(){
	onUploadError(getTranslation('SIGNIN_FAILED'));
}

/**
 * Loads Google Drive library, after load fetches share folder.
 */
function loadDrive(){
	// Google drive API
	gapi.client.load('drive', 'v3', driveLoaded);

	// Load share logic
	gapi.load('drive-share');
}

/**
 * Called when Drive library is loaded.
 */
function driveLoaded(){
	fetchShareFolder();
}

/**
 * Find share folder ID, if does not exist, create it.
 */
function fetchShareFolder() {
	//spnBtnShare.text("Please wait until Google Drive is loaded");

	// Search the share folder.
	var request = gapi.client.drive.files.list(shareConfig.sharedFolderQuery);

	// Request for creating a new one should share folder not be found.
	var requestCreate = gapi.client.drive.files.create(shareConfig.shareFolderCreate);

	request.execute(function(resp) {
		var files = resp.files;
		if (files && files.length > 0) {
			var file = files[0];
			shareFolderId = file.id;
			log(sprintf("Share folder found [%s], ID: %s, matches: %d", file.name, shareFolderId, files.length));
			onShareFolderFetched();

		} else {
			log('Share folder not found, creating a new one');
			requestCreate.execute(function(resp) {
				if(resp.id === undefined) {
					log("Creating share folder failed: " + err);
					onShareFolderFetched(err);
				} else {
					shareFolderId = resp.id;
					log(sprintf("Share folder created, ID: %s", shareFolderId));
					onShareFolderFetched();
				}
			});
		}
	});
}

/**
 * Share folder fetching finished.
 * @param err
 */
function onShareFolderFetched(err){
	if (err){
		log("Creating share folder failed. Please, try again later.");
		return;
	}

	storageLoaded = true;
	log("Share folder fetched");

	// Setup href to point to user's share folder.
	if (ahrefGoogleDrive){
		ahrefGoogleDrive.attr("href", eb.sh.misc.getDriveFolderLink(shareFolderId));
	}

	// Now sharing can be enabled.
	$(updForm).addClass('is-ready');

	// Page rescaling
	setFillScreenBlocHeight();
}

/**
 * Parses number from the givne parameter.
 * @param x
 * @returns {*}
 */
function jsonGetNumber(x){
	if (typeof x === 'string'){
		return parseInt(x);
	} else {
		return x;
	}
}

/**
 * Returns true if Google auth token has expired.
 * @param {Number} [offset=0] Number of seconds. If 60, the function returns yes 1 minute before expiration.
 * @returns {boolean}
 */
function gapiTokenExpired(offset){
	return accessTokenExpiresAt <= ((Date.now()/1000)+(offset || 0));
}

/**
 * Function watching token expiration.
 */
function gapiTokenWatcher(){
	var $form = $(updForm);
	var isUploading = $form.hasClass( 'is-uploading' );
	var wasSuccess = $form.hasClass( 'is-success' );
	log(sprintf("Token watcher check. Uploading: %s, token expires in %s s", isUploading, accessTokenExpiresAt-Date.now()/1000));

	if (!isUploading && !wasSuccess){
		log("Refreshing the page");
		resetExpiredToken();
		$form.removeClass( 'is-ready' );

		// Refresh the page here to get a new token.
		// TODO: For token refresh, try signIn() again
		// https://developers.google.com/identity/sign-in/web/reference
		document.location.reload();

	} else {
		log(sprintf("Download in progress = %d, success = %d, plan for later", isUploading, wasSuccess));
		setTimeout(gapiTokenWatcher, isUploading ? 1000*10 : 1000*60*5);
	}
}

// ---------------------------------------------------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------------------------------------------------

function initUploadDiv(form){
	var $form = $(form);
	$fldInput		 = $form.find( 'input[type="file"]' );
	$fldLabel		 = $form.find( 'label' );
	$fldErrorMsg	 = $form.find( '.box__error span' );
	$fldRestart	 	 = $form.find( '.box__restart' );
	oldLabelData     = $fldLabel.html();

	// On file change show file info.
	$fldInput.on( 'change', function( e )
	{
		onFilesDropped(e.target.files);
	});

	// drag&drop files if the feature is available
	if (!isAdvancedUpload){
		alert("Unsupported browser");
		return
	}

	$form.addClass( 'has-advanced-upload' ); // letting the CSS part to know drag&drop is supported by the browser

	// restart the form if has a state of error/success
	$fldRestart.on( 'click', function( e )
	{
		e.preventDefault();
		$form.removeClass( 'is-error is-success');
		svgUpload.show();
		divShareInfo.hide();
		divButtons.hide();
		$fldLabel.html(oldLabelData);
		droppedFiles = false;
		if (!storageLoaded || gapiTokenExpired()){
			$(updForm).removeClass('is-ready');
			// Page pretends it is logged in to the drive but is not.
			// Refresh the page if token is expired.
			if (gapiTokenExpired()){
				gapiTokenWatcher();
			}

		} else {
			$(updForm).addClass('is-ready');
		}
		setFillScreenBlocHeight();
	});

	// Firefox focus bug fix for file input
	$fldInput
		.on( 'focus', function(){ $fldInput.addClass( 'has-focus' ); })
		.on( 'blur', function(){ $fldInput.removeClass( 'has-focus' ); });

	// Upload behavior.
	$form
		.on( 'drag dragstart dragend dragover dragenter dragleave drop', function( e )
		{
			// preventing the unwanted behaviours
			e.preventDefault();
			e.stopPropagation();
		})
		.on( 'dragover dragenter', function() //
		{
			$form.addClass( 'is-dragover' );
		})
		.on( 'dragleave dragend drop', function()
		{
			$form.removeClass( 'is-dragover' );
		})
		.on( 'drop', function( e )
		{
			var newFiles = e.originalEvent.dataTransfer.files; // the files that were dropped
			onFilesDropped(newFiles);
		});
}

function onFilesDropped(newFiles){
	var $form = $(updForm);
	logFiles(newFiles);
	divShareInfo.hide();

	if (!storageLoaded){
		onUploadError( getTranslation('DRIVE_NOT_CONNECTED') );
		return;

	} else if (gapiTokenExpired()){
		resetExpiredToken();
		onUploadError( getTranslation('GOOGLE_AUTH_EXPIRED_REFRESH') );
		return;

	} else if (newFiles.length > 1){
		onUploadError( getTranslation('ERROR_ONLY_ONE_FILE_SUPPORTED') );
		return;

	} else if (newFiles[0].size > 1024*1024*128){
		onUploadError( getTranslation('ERROR_FILE_TOO_BIG') );
		return;
	}

	$form.removeClass( 'is-error is-success' );
	if (storageLoaded){
		$form.addClass( 'is-ready' );
	}
	droppedFiles = newFiles;
	showFiles( droppedFiles, $fldInput, $fldLabel );
	setFillScreenBlocHeight();
}

function onUploadStateChange(progress, data){
	if (progress){
		var pcnt0, lblSet = false;
		if (typeof data === 'number'){
			data = {val:data};
		}
		if (data.val === undefined){
			data.val = progressData.lastProgress/1000;
 		}

		if (data.state !== undefined){
			if (data.state.state === EnigmaUploader.STATE_PROCESSING){
				spnUploadPcnt.text(getTranslation('STATE_ENCRYPTING'));
				lblSet = true;
			}
		}

		if (data.msg !== undefined){
			spnUploadPcnt.text(data.msg);
			lblSet = true;
		}

		if (!lblSet){
			spnUploadPcnt.text(getTranslation('STATE_UPLOADING'));
		}

		if (progressData.lastProgress != Math.round(data.val*1000)) {
			progressData.lastProgress = Math.round(data.val*1000);
			pcnt0 = sprintf("%1.1f", Math.round(data.val*1000)/10);
			divProgressBar.css('width', pcnt0+'%').attr('aria-valuenow', pcnt0).text(pcnt0+"%");
		}
	} else {
		spnUploadPcnt.text(data);
	}
}

function onUploadError(data){
	var $form = $(updForm);
	$form.removeClass( 'is-uploading is-success is-ready' ).addClass( 'is-error' );
	$fldErrorMsg.text( data );
}

/**
 * Saves current link as a file.
 */
function onDownloadShareLinkClicked(){
	var link = fldLink.val();
	if (!link || link.length == 0 || !uploader || !uploader.fname){
		log("Empty link, cannot save as a file");
		return;
	}

	var linkBlob = new Blob(["" + link], {"type": "text/plain"});
	saveAs(linkBlob, "enigmalink-" + uploader.fname + ".link.txt");
}

/**
 * Saves generated QR code as a file.
 */
function onDownloadQRCodeLinkClicked(){
	var children = divQrCode.children("canvas");
	if (!children || children.length == 0 || !children[0] || !uploader || !uploader.fname){
		log("No QRcode to save");
		return;
	}

	var canvas = children[0];
	canvas.toBlob(function(blob) {
		saveAs(blob, ("enigmalink-" + uploader.fname + ".qr.png"));
	}, "image/png");
}

/**
 * Change GoogleDrive sharing permissions
 */
function changeSharingPermissions(){
	if (!driveShareDialog){
		alert("No file has been uploaded yet");
		return;
	}
	driveShareDialog.showSettingsDialog();
}

function resetExpiredToken(){
	storageLoaded = false;
	accessToken = null;
}

function onOpenInGoogleDriveClicked(){
	var fileLink = eb.sh.misc.getDriveDownloadLink(lastUploadedFileId);
	window.open(fileLink,'_blank');
}

function onOpenFolderInGoogleDriveClicked(){
	var folderLink = eb.sh.misc.getDriveFolderLink(shareFolderId);
	window.open(folderLink,'_blank');
}

function onQrRegenerateClicked(type){
	regenerateQrCode(type);
}

function regenerateQrCode(type){
	type = type || 'link';
	var qrCodeSettings = {
		"render": "canvas",
		"text": currentFileLink,
		"size": 300
	};

	var callToAction = "";
	switch(type){
		case 'email':
			qrCodeSettings.text = sprintf("MATMSG:TO:set@whom.to;SUB:EnigmaLink;BODY:%s;;", (currentFileLink));
			callToAction = getTranslation('QR_SCAN_TO_EMAIL');
			break;
		case 'text':
			qrCodeSettings.text = sprintf("SMSTO:+44999999999:%s", (currentFileLink));
			callToAction = getTranslation('QR_SCAN_TO_TEXT');
			break;
		case 'tweet':
			qrCodeSettings.text = sprintf("https://twitter.com/intent/tweet?text=%s", encodeURIComponent(currentFileLink));
			callToAction = getTranslation('QR_SCAN_TO_TWEET');
			break;
		case 'link':
			qrCodeSettings.text = currentFileLink;
			callToAction = getTranslation('QR_SCAN_TO_DOWNLOAD');
			break;
	}

	divQrCode.html("");
	divQrCode.qrcode(qrCodeSettings);
	divQrInfo.text(callToAction);
}

function tweetText(text){
	var twitterLink = sprintf("https://twitter.com/intent/tweet?text=%s", encodeURIComponent(text));
	window.open(twitterLink,'_blank');
}

function onEmailLinkClicked(){
	var link = sprintf("mailto:your@recipient.com?subject=EnigmaLink&body=%s", encodeURIComponent(currentFileLink));
	window.open(link, '_self');
}

function onTextLinkClicked(){
	var link = sprintf("SMSTO:+44999999999:%s", (currentFileLink));
	window.open(link, '_self');
}

function onCopyToClipboardClicked() {
	var os = uaParser.getOS().name.toLowerCase();
	if (os == "ios"){
		copyElementToClipboard(fldLink);
		setTimeout(function(){
			fldLink.select();
			fldLink[0].selectionStart = 0;
			fldLink[0].selectionEnd = 9999;
		}, 0);

		setTimeout(function(){
			scrollToElementBottom(fldLink);
		}, 750);

	} else {
		copyElementToClipboard(fldLink);
	}
}

function browserSpecific(){
	uaParser = new UAParser();
	var os = uaParser.getOS().name.toLowerCase();
	var device = uaParser.getDevice();

	console.log("OS: " + os);
	console.log("Device:" + JSON.stringify(device) + ", mobile: " + jQuery.browser.mobile);

	// Not supported on iOS & desktops.
	if (!jQuery.browser.mobile || os == "ios"){
		btnTextNow.hide();
	}

	// If field is changed by user, change it back.
	fldLink.on('input', function() {
		$(this).val(currentFileLink);
	});
	fldSha1.on('input', function() {
		$(this).val(uploadSha1);
	});
	fldSha256.on('input', function() {
		$(this).val(uploadSha256);
	});
}

function initGui(){

}

function loadTranslations(){
	var language = window.navigator.userLanguage || window.navigator.language;
	log("Language detected: " + language);

	if (language.toLowerCase().indexOf('cs') > -1){
		language = "czech";
	} else {
		language = "english";
	}
	$.ajax({
		url: 'languages.xml',
		success: function(xml) {
			$(xml).find('translation').each(function(){
				var id = $(this).attr('id');
				var text = $(this).find(language).text();

				translationsMap[id] = text;
				$("." + id).html(text);
			});
		}
	});
}

function getTranslation(key, defaultStr){
	if (translationsMap && (key in translationsMap)){
		return translationsMap[key];
	} else if (translationsDefault && (key in translationsDefault)){
		return translationsDefault[key];
	} else {
		return defaultStr;
	}
}
// ---------------------------------------------------------------------------------------------------------------------
// onLoad
// ---------------------------------------------------------------------------------------------------------------------

$(function()
{
	sjcl.random.startCollectors();
	loadTranslations();

	htmlBody = $("body");
	updForm = $('.box')[0];
	svgUpload = $('#svgUpload');
	divButtons = $('#divButtons');
	divUploadInput = $('#divUploadInput');
	divUploadLogin = $('#divUploadLogin');
	divBoxProgress = $('#divBoxProgress');
	divShareInfo = $('#bloc-info');
	fldLink = $('#fldLink');
	fldSha256 = $('#fldSha256');
	fldSha1 = $('#fldSha1');
	divProgressBar = $('.progress-bar');
	divQrInfo = $('.qrInfo');
	ahrefGoogleDrive = $('#ahrefGoogleDrive');

	fldMsg = $('#fldMessage');
	fldFname = $('#filename');
	fldFnameOrig = $('#filenameOrig');
	chkMask = $('#chkMask');
	chkSizeConceal = $('#chkSizeConceal');
	chkPng = $('#chkPng');
	spnUploadPcnt = $('#uploadPcnt');
	fldShareLink = $('#qrLink');
	divQrCode = $('#qrcode');
	spnBtnShare = $('#spnBtnShare');
	btnUpload = $('#btnUpload');
	fldPassword = $('#fldPassword');
	fldPasswordCheck = $('#fldPasswordCheck');
	btnTextNow = $('#btnTextNow');

	// HTML5 support?
	isAdvancedUpload = function() {
		var div = document.createElement( 'div' );
		return ( ( 'draggable' in div ) || ( 'ondragstart' in div && 'ondrop' in div ) ) && 'FormData' in window && 'FileReader' in window;
	}();

	// Init upload
	initUploadDiv(updForm);

	// Button click handling.
	btnUpload.click(function(){
		uploadClicked();
	});

	if (chkMask) {
		var fncMask = function () {
			var checked = isChecked(chkMask);
			fldFname.val(checked ? genRandomName() : fldFnameOrig.val());
		};
		chkMask.click(fncMask);
	}

	// Behavior.
	fncMask();
	browserSpecific();
	initGui();

	// Default form validation, not used.
	$("input,textarea").jqBootstrapValidation(
		{
			preventSubmit: true,
			submitSuccess: function($form, event)
			{
				event.preventDefault(); // prevent default submit behaviour
			},
			filter: function() // Handle hidden form elements
			{
				return $(this).is(":visible");
			}
		});
});
