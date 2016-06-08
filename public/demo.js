/**
 * Created by dusanklinec on 06.04.16.
 * Common JS methods for all demos
 */

function set_request(msg){
    $("#reqRest").html(msg);
}

function display_message(msg) {
    $("#status").html(msg);
}

function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var sec = date.getSeconds();
    var milli = date.getMilliseconds();
    var strTime = sprintf("%02d:%02d:%02d.%03d", hours, minutes, sec, milli);
    return date.getMonth()+1 + "/" + date.getDate() + "/" + date.getFullYear() + " " + strTime;
}

function posmod(a, b){
    var r = a % b;
    return Math.abs(r >= 0 ? r : b+r);
}

function append_message(msg, statusElem) {
    try {
        statusElem = statusElem || $("#status");
        var newMsg = formatDate(new Date()) + " - " + he.encode(msg);
        if (logBuffer){
            if (logBuffer.buffer.length < logBuffer.max){
                logBuffer.buffer.push(newMsg);
            } else {
                logBuffer.buffer[logBuffer.idx] = newMsg;
                logBuffer.idx = (logBuffer.idx+1) % logBuffer.max;
            }

            var i=logBuffer.idx, ln = logBuffer.buffer.length, end = posmod(i-1, ln), str = "";
            do{
                str += logBuffer.buffer[i] + "<br/>\n";
                if (i == end){
                    break;
                }

                i = posmod(i+1, ln);
            }while(true);
            statusElem.html(str);
        } else {
            statusElem.html(statusElem.html() + "<br/>\n" + newMsg);
        }
    } catch(e){

    }
}

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

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
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
 * Switches main loading overlay.
 * @param started if true overlay is displayed. Hidden otherwise.
 */
function bodyProgress(started){
    if (started){
        $("body").addClass("loading");
    } else {
        $("body").removeClass("loading");
    }
}

function toggleCategory(){
    var header = $(this);
    var collapser = header.find('.collapser');
    var content = header.next();
    content.slideToggle(500, function () {
        collapser.text(function () {
            return content.is(":visible") ? "[-]" : "[+]";
        });
    });
}

function copyElementToClipboard(elem){
    elem.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        log("Unable to copy");
    }
}




