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
function scrollToElementBottom(D)
{
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
	$label.text( files.length > 1 ? ( $input.attr( 'data-multiple-caption' ) || '' ).replace( '{count}', files.length ) : files[ 0 ].name );

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
	}

	$form.addClass( 'is-uploading' ).removeClass( 'is-error is-success is-ready' );
	divShareInfo.hide('slow');
	onUploadStateChange(false, "Generating encryption key");

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
			//statusFieldSet(fldEbStatus, "Encryption key computed", true);
			onUploadKeyCreated(encScheme);
		},
		onError: function(data){
			bodyProgress(false);
			//setDisabled(btnUpload, false);
			//statusFieldSet(fldEbStatus, "Encryption key computation failed", false);
			//statusFieldSet(fldStatus, "Upload failed");

			log("Critical error: " + (data.reason ? data.reason : JSON.stringify(data)));
			onUploadError("Encryption key computation failed");
		},
		onRetry: function(data){
			//statusFieldSet(fldEbStatus, "Computing encryption key...");
			log("EB operation retry in: " + data.interval + " ms");
			onUploadStateChange(false, "Generating encryption key in " + formatSeconds(data.interval/1000));
		}
	});

	// Generate the file encryption key.
	//statusFieldSet(fldEbStatus, "Computing encryption key...");
	//statusFieldSet(fldStatus, "Preparing upload");
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

		chunkSizeMax: 262144*16, // 4MB chunk size
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
			onUploadError("Upload failed: " + data);
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
	onUploadStateChange(false, "Setting up the sharing");
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
		fldSha1.val(sjcl.codec.hex.fromBits(data.uploader.sha1));
	}
	if (data.uploader.sha256){
		log(sprintf("SHA256: %s", sjcl.codec.hex.fromBits(data.uploader.sha256)));
		fldSha256.val(sjcl.codec.hex.fromBits(data.uploader.sha256));
	}

	currentFileLink = link;

	log(link);
	fldLink.val(link);
	onUploadStateChange(false, "Upload finished");
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
 */
function signinCallback(result) {
	if(result.access_token) {
		accessToken = result.access_token;
		document.getElementById('signin').style.display = 'none';
		document.getElementById('signedin').style.display = null;
		log(sprintf("Google Drive auth successful, token: %s", accessToken));

		// Load google drive lib.
		loadDrive();
	}
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
		if (!storageLoaded){
			$(updForm).removeClass('is-ready');
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
		onUploadError( "Cloud drive is not yet connected" );
		return;

	} else if (newFiles.length > 1){
		onUploadError( "Only one file is supported (more coming soon)" );
		return;

	} else if (newFiles[0].size > 1024*1024*128){
		onUploadError( "The maximum file size is 128 MB (more coming soon)" );
		return;
	}

	$form.removeClass( 'is-error is-success' );
	if (storageLoaded){
		$form.addClass( 'is-ready' );
	}
	droppedFiles = newFiles;
	showFiles( droppedFiles, $fldInput, $fldLabel );
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
				spnUploadPcnt.text(sprintf("Encrypting... "));
				lblSet = true;
			}
		}

		if (!lblSet){
			spnUploadPcnt.text(sprintf("Uploading... "));
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
	saveAs(linkBlob, "ebshare-" + uploader.fname + ".link.txt");
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
		saveAs(blob, ("ebshare-" + uploader.fname + ".qr.png"));
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
			qrCodeSettings.text = sprintf("MATMSG:TO:set@send.to;SUB:File link;BODY:%s;;", (currentFileLink));
			callToAction = "Scan to email";
			break;
		case 'text':
			qrCodeSettings.text = sprintf("SMSTO:+44999999999:%s", (currentFileLink));
			callToAction = "Scan to text";
			break;
		case 'tweet':
			qrCodeSettings.text = sprintf("https://twitter.com/intent/tweet?text=%s", encodeURIComponent(currentFileLink));
			callToAction = "Scan to tweet";
			break;
		case 'link':
			qrCodeSettings.text = currentFileLink;
			callToAction = "Scan to download";
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
	var link = sprintf("mailto:your@recipient.com?subject=New%20File%20Share&body=%s", encodeURIComponent(currentFileLink));
	window.open(link, '_self');
}
// ---------------------------------------------------------------------------------------------------------------------
// onLoad
// ---------------------------------------------------------------------------------------------------------------------

$(function()
{
	sjcl.random.startCollectors();
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