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

// ---------------------------------------------------------------------------------------------------------------------
// Functions & handlers
// ---------------------------------------------------------------------------------------------------------------------

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
 * Simple logging method used in this script, passed to request objects for logging.
 * @param msg
 */
function log(msg){
	console.log(msg);
	append_message(msg);
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

// ...

// ---------------------------------------------------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------------------------------------------------

function initUploadDiv(form){
	var $form = $(form);
	$fldInput		 = $form.find( 'input[type="file"]' );
	$fldLabel		 = $form.find( 'label' );
	$fldErrorMsg	 = $form.find( '.box__error span' );
	$fldRestart	 = $form.find( '.box__restart' );

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
				$fldLabel.text("Only one file is supported for now.");
				logFiles(newFiles);
				return;
			}

			droppedFiles = newFiles;
			showFiles( droppedFiles, $fldInput, $fldLabel );
		});

	// restart the form if has a state of error/success
	$fldRestart.on( 'click', function( e )
	{
		e.preventDefault();
		$form.removeClass( 'is-error is-success' );
		$fldInput.trigger( 'click' );
	});

	// Firefox focus bug fix for file input
	$fldInput
		.on( 'focus', function(){ $fldInput.addClass( 'has-focus' ); })
		.on( 'blur', function(){ $fldInput.removeClass( 'has-focus' ); });
}

// ---------------------------------------------------------------------------------------------------------------------
// onLoad
// ---------------------------------------------------------------------------------------------------------------------

$(function()
{
	sjcl.random.startCollectors();
	htmlBody = $("body");
	updForm = $('.box')[0];

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