"use strict";

/**
 * Global shortcuts to fields.
 */
var htmlBody;

// Link configuration for the download
var linkCfg;

// Downloader
var dwn;
var passwdRequired=false;
var progressData = {
    lastProgress: -1.0
};

// Other fields.
var btnDownload;
var btnPasswordUse;
var fldPassword;
var divPassword;
var divStatusWrapper;
var divPasswdNotif;
var divStatusInfo;
var divFileInfo;
var divStatusNotif;
var divProgressBar;
var btnGet;
var divGetFile;
var preFileInfo;
var divFileMessage;
var divFileMessageContent;

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

function getSettings(){
    var apiKey = shareConfig.ebConfigUpload.apiKey;
    var endpoint = shareConfig.ebConfigUpload.remoteEndpoint;
    var keyId = shareConfig.ebConfigUpload.userObjectId;
    var aesKey = shareConfig.ebConfigUpload.encKey;
    var macKey = shareConfig.ebConfigUpload.macKey;

    return {
        remoteEndpoint: endpoint,
        remotePort: 11180,
        requestMethod: eb.comm.REQ_METHOD_POST,
        requestScheme: 'https',
        requestTimeout: 35000,
        debuggingLog: true,
        apiKey: apiKey,
        apiKeyLow4Bytes: keyId,
        userObjectId : keyId,
        aesKey: aesKey,
        macKey: macKey
    };
}

function formatSeconds(s){
    if (s < 60){
        return sprintf("%d s", s);
    } else {
        return sprintf("%d:%d s", Math.floor(s/60), s%60);
    }
}

function displayNotify(elem, text, isError, shouldScroll){
    elem.text(text);
    if (isError){
        elem.removeClass('notifSuccess');
        elem.addClass('notifFail');
    } else {
        elem.removeClass('notifFail');
        elem.addClass('notifSuccess');
    }
    elem.show('slow');
    if (shouldScroll){
        scrollToIfNotVisible(elem, false);
    }

    if (isError){
        elem.effect('shake');
    }
}

function displayNotifyGlobal(text, isError, shouldScroll){
    displayNotify(divStatusNotif, text, isError, shouldScroll);
}

// ---------------------------------------------------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------------------------------------------------

function downloadClicked() {
    var fileLink = eb.sh.misc.getDriveDownloadLink(linkCfg.fid);
    var directLink = eb.sh.misc.getDriveDirectLink(linkCfg.fid);
    var proxyLink = getProxyRedirLink(linkCfg.fid);
    log("Parsed link data: " + JSON.stringify(linkCfg));
    log("DownloadLink: " + fileLink);
    log("DirectLink: " + directLink);
    log("ProxyRedirLink: " + proxyLink);

    // Use configuration from the config file (UOTYPE, endpoint) but UOID and commkeys take from the link.
    var ebConfig = $.extend(shareConfig.ebConfigDownload, {
        userObjectId: eb.misc.inputToHex(linkCfg.uoid),
        encKey:       eb.misc.inputToBits(linkCfg.aesKey),
        macKey:       eb.misc.inputToBits(linkCfg.macKey)
    });

    // Initialize encryption scheme
    var encScheme = new EnigmaShareScheme({
        lnonce: linkCfg.nonce,
        eb: ebConfig,
        logger: log
    });

    // Init downloader, start download.
    // Google APIs do not support CORS for not authorized users. In order to have CORS,
    // we need access token. It means we need to bother user with signing in to the google drive/plus.
    //
    // If we have no access_token, we need to use proxy to obtain file location we can download.
    // proxy-redir.php reads redirect URL and provides it in a form of a JSON.
    // Another proxy approach is to stream the whole file = greater overhead, we don't have Google's bandwidth.
    dwn = new EnigmaDownloader({
        url:directLink,
        proxyRedirUrl: proxyLink,
        encScheme: encScheme,
        chunkSizeAdaptive: true,
        chunkSizeMax: jQuery.browser.mobile ? 1024*1024 : 1024*1024*4, // 4MB chunk size
        onProgress: function(oEvent, aux){
            if (oEvent && oEvent.lengthComputable && oEvent.loaded && aux && aux.offset && aux.total) {
                var totalPercent = (aux.offset+oEvent.loaded) / aux.total;
                onDownloadProgress(totalPercent);
            }
        },
        onComplete: function(data) {
            log("Download complete: " + data);
            log(sprintf("File name: %s", dwn.fname));
            log(sprintf("Mime type: %s", dwn.mimetype));
            log(sprintf("File size: %s", dwn.fsize));
            log(sprintf("File size meta: %s", dwn.fsizeMeta));
            log(sprintf("Extra msg: %s", dwn.extraMessage));

            onSuccess(data);
        },
        onStateChange: function(data){
            onStateChanged(data);
        },
        onError: function(data) {
            log("Critical error: " + JSON.stringify(data));
            onError(data);
        },
        onPasswordNeeded: function(data){
            log("Password needed");
            onPasswordRequired(true);
        },
        onPasswordFail: function(data){
            log("Password is invalid");
            onPasswordFail(data);
        },
        onPasswordOK: function(data){
            log("Password is OK");
            onPasswordOk(data);
        },
        onMetaReady: function(obj, continueCb, abortCb){
            onMetaReady(obj, continueCb, abortCb);
        }
    });

    setDisabled(btnDownload, true);
    btnDownload.hide('slow');

    divStatusWrapper.show();
    divStatusInfo.text("Downloading...");
    divFileInfo.hide();
    divStatusNotif.hide();
    divPasswdNotif.hide();
    setFillScreenBlocHeight();
    bodyProgress(true);
    scrollToElementBottom(divStatusWrapper);
    dwn.fetch();
}

function onDownloadStateChange(txt){
    divStatusInfo.text(txt);
}

function onDownloadProgress(progress){
    onUploadStateChange(true, progress);
}

function onSuccess(){
    var fileInfo = sprintf(
        "File name: %s\n" +
        "Mime type: %s\n" +
        "File size: %s B\n" +
        "Uploaded:  %s\n" +
        "SHA1:      %s\n" +
        "SHA256:    %s",
        dwn.fname,
        dwn.mimetype,
        dwn.fsize,
        dwn.uploadTime > 0 ? new Date(dwn.uploadTime).toString() : '-',
        sjcl.codec.hex.fromBits(dwn.sha1),
        sjcl.codec.hex.fromBits(dwn.sha256)
    );

    setDisabled(btnDownload, false);

    preFileInfo.text(fileInfo);
    showMessageIfAny(true);

    divFileInfo.show();
    setFillScreenBlocHeight();
    displayNotifyGlobal("Download successful", false, true);

    // For mobile browsers show button to download the file again.
    if (jQuery.browser.mobile) {
        divGetFile.show();
    }
    setFillScreenBlocHeight();

    // If this is a mobile browser, do not trigger download immediately
    // So user can view the message and file details.
    if (!jQuery.browser.mobile){
        triggerFileDownload();
    }
}

function onError(data){
    bodyProgress(false);
    setDisabled(btnDownload, false);
    setDisabled(btnPasswordUse, true);
    setDisabled(fldPassword, true);
    btnDownload.show('slow');
    setFillScreenBlocHeight();
    divStatusInfo.html("Failed");
    log(JSON.stringify(data));
    displayNotifyGlobal("Error: " + (data && data.reason ? data.reason : JSON.stringify(data))
        + ". The link may be invalid, expired or the file may be deleted or corrupted.", true, true);
}

function onStateChanged(data){
    log("State change: " + data.state);
    if (data.state == EnigmaDownloader.STATE_SECURITY_BLOCK_FINISHED) {
        bodyProgress(false);
    }
    onUploadStateChange(true, {state:data});
}

function onPasswordRequired(required){
    passwdRequired = required;
    if (required){
        bodyProgress(false);
        onDownloadStateChange("Password verification required");
        setDisabled(btnPasswordUse, false);
        setDisabled(fldPassword, false);
        divPasswdNotif.hide();

        divPassword.show('slow');
        scrollToIfNotVisible(divPassword, false);
        fldPassword.focus();

    } else {
        divPassword.hide('slow');
        divStatusInfo.text("File downloaded");
    }
}

function onPasswordFail(){
    bodyProgress(false);
    setDisabled(btnPasswordUse, false);
    displayNotify(divPasswdNotif, "Invalid password", true, true);
}

function onPasswordOk(){
    bodyProgress(false);
    divPassword.hide('slow');

    onDownloadStateChange("Downloading ...");
    setDisabled(btnPasswordUse, true);
    setDisabled(fldPassword, true);
    displayNotify(divPasswdNotif, "Password is correct", false, false);
}

function onPasswordSubmitted(){
    setDisabled(btnPasswordUse, true);
    bodyProgress(true);
    dwn.tryPassword(fldPassword.val());
}

function onMetaReady(obj, continueCb, abortCb){
    log("Meta block authenticated");
    var fileInfo = sprintf(
        "File name: %s\n" +
        "Mime type: %s\n" +
        "File size: %s B\n" +
        "Uploaded:  %s",
        dwn.fname,
        dwn.mimetype,
        dwn.fsizeMeta,
        dwn.uploadTime > 0 ? new Date(dwn.uploadTime).toString() : '-'
    );

    log(fileInfo);

    preFileInfo.text(fileInfo);
    showMessageIfAny();

    divFileInfo.show();
    setFillScreenBlocHeight();
    setTimeout(continueCb, 0);
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
            if (data.state.state === EnigmaDownloader.STATE_PROCESSING
             || data.state.state === EnigmaDownloader.STATE_SECURITY_BLOCK_PROCESSING)
            {
                divStatusInfo.text(sprintf("Decrypting... "));
                lblSet = true;
            }
            if (data.state.state === EnigmaDownloader.STATE_DONE)
            {
                divStatusInfo.text(sprintf("Finished"));
                data.val = 1.0;
                lblSet = true;
            }
        }

        if (!lblSet){
            divStatusInfo.text(sprintf("Downloading... "));
        }

        if (progressData.lastProgress != Math.round(data.val*1000)) {
            progressData.lastProgress = Math.round(data.val*1000);
            pcnt0 = sprintf("%1.1f", Math.round(data.val*1000)/10);
            divProgressBar.css('width', pcnt0+'%').attr('aria-valuenow', pcnt0).text(pcnt0+"%");
        }
    } else {
        divStatusInfo.text(data);
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------------------------------------------------

function showMessageIfAny(scrollIfAny){
    if (dwn.extraMessage === undefined){
        divFileMessage.hide();
        return;
    }

    scrollIfAny = scrollIfAny || false;
    divFileMessageContent.text(dwn.extraMessage);
    divFileMessage.show();
    if (scrollIfAny){
        scrollToIfNotVisible(divFileMessage, false);
    }
}

function loadParams(){
    var w = sjcl.bitArray;

    console.log(location);
    log(sprintf("URL query: %s", location.search));
    log(sprintf("URL hash: %s", location.hash));
    linkCfg = eb.sh.misc.buildLinkParams(location.hash);

    log(JSON.stringify(linkCfg));
    if (linkCfg.fid !== null && linkCfg.fid.length > 0 && linkCfg.nonce != null && w.bitLength(linkCfg.nonce) > 0){
        btnDownload.removeClass("disabled");
    }
}

function onGetFileClicked(){
    if (dwn && dwn.blobs){
        setTimeout(triggerFileDownload, 0);
        triggerFileDownload();

    } else {
        displayNotifyGlobal("Error: Get file failed", true, true);
    }
}

function triggerFileDownload(){
    var blob = new Blob( dwn.blobs, { type: dwn.mimetype } );
    saveAs(blob, dwn.fname);
}

// ---------------------------------------------------------------------------------------------------------------------
// onLoad
// ---------------------------------------------------------------------------------------------------------------------

$(function()
{
    sjcl.random.startCollectors();
    htmlBody = $("body");

    // Init
    btnDownload = $('#btnDownload');
    btnPasswordUse = $('#btnPasswordUse');
    fldPassword = $('#password');
    divPassword = $('#passwordDiv');
    divStatusWrapper = $('#divStatusWrapper');
    divPasswdNotif = $('#divPasswdNotif');
    divStatusInfo = $('#divStatusInfo');
    divFileInfo = $('#divFileInfo');
    divStatusNotif = $('#divStatusNotif');
    divProgressBar = $('.progress-bar');
    btnGet = $('#btnGet');
    divGetFile = $('.divGetFile');
    preFileInfo = $('#preFileInfo');
    divFileMessage = $('#divFileMessage');
    divFileMessageContent = $('#divFileMessageContent');

    // Button click handling.
    btnDownload.click(downloadClicked);
    btnPasswordUse.click(onPasswordSubmitted);
    btnGet.click(onGetFileClicked);

    // Enter press on password field
    fldPassword.bind("enterKey",function(e){
        onPasswordSubmitted();
    });
    fldPassword.keyup(function(e){
        if(e.keyCode == 13)
        {
            $(this).trigger("enterKey");
        }
    });

    // Load URL parameters
    loadParams();

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