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

// Google Drive access token.
var accessToken = null;

// Share folder drive ID where to put uploaded files in the Google Drive.
var shareFolderId;

// Uploader object.
var uploader;

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
		fldFname.val(isChecked(chkMask) ? genRandomName() : files[0].name);
		fldFnameOrig.val(files[0].name);
	}

	// Hide upload icon
	svgUpload.hide();
	divButtons.show();
}

function enableLinkButtons(enable){
	setDisabled($('#btnCopyLink'), !enable);
	setDisabled($('#btnTryLink'), !enable);
	setDisabled($('#btnSaveLink'), !enable);
	setDisabled($('#btSaveQr'), !enable);
	setDisabled($('#btnChangeSharing'), !enable);
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

	log("Share folder fetched");

	// Now sharing can be enabled.
	divUploadInput.show();
	divUploadLogin.hide();
	//setDisabled(btnShare, false);
	//spnBtnShare.hide('fast');
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

	// On file change show file info.
	$fldInput.on( 'change', function( e )
	{
		showFiles( e.target.files, $fldInput, $fldLabel );
	});

	// drag&drop files if the feature is available
	if (!isAdvancedUpload){
		alert("Unsupported browser");
		return
	}

	$form
		.addClass( 'has-advanced-upload' ) // letting the CSS part to know drag&drop is supported by the browser
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
			if (newFiles.length > 1){
				$form.removeClass( 'is-uploading' ).addClass( 'is-error' );
				$fldErrorMsg.text( "Only one file is supported for now." );
				//$fldLabel.text("Only one file is supported for now.");
				logFiles(newFiles);
				return;
			}

			$form.removeClass( 'is-error' );
			droppedFiles = newFiles;
			showFiles( droppedFiles, $fldInput, $fldLabel );
		});

	// restart the form if has a state of error/success
	$fldRestart.on( 'click', function( e )
	{
		e.preventDefault();
		$form.removeClass( 'is-error is-success' );
		svgUpload.show();
		divButtons.hide();
		//$fldInput.trigger( 'click' );
	});

	// Firefox focus bug fix for file input
	$fldInput
		.on( 'focus', function(){ $fldInput.addClass( 'has-focus' ); })
		.on( 'blur', function(){ $fldInput.removeClass( 'has-focus' ); });

	divUploadInput.hide();
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
	btnUpload = $('#btnShare');
	fldPassword = $('#fldPassword');
	fldPasswordCheck = $('#fldPasswordCheck');

	// HTML5 support?
	isAdvancedUpload = function() {
		var div = document.createElement( 'div' );
		return ( ( 'draggable' in div ) || ( 'ondragstart' in div && 'ondrop' in div ) ) && 'FormData' in window && 'FileReader' in window;
	}();

	// Init upload
	initUploadDiv(updForm);

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