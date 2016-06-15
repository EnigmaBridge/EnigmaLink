/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.1.20160328
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
        "use strict";
        // IE <10 is explicitly unsupported
        if (typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
            return;
        }
        var
            doc = view.document
        // only get URL when necessary in case Blob.js hasn't overridden it yet
            , get_URL = function() {
console.log("getUrl");
console.log(view.URL || view.webkitURL || view);
                return view.URL || view.webkitURL || view;
            }
            , save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
            , can_use_save_link = "download" in save_link
            , click = function(node) {
                var event = new MouseEvent("click");
console.log("click event dispatch");
                node.dispatchEvent(event);
            }
            , is_safari = /Version\/[\d\.]+.*Safari/.test(navigator.userAgent)
            , is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
            , webkit_req_fs = view.webkitRequestFileSystem
            , req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem
            , throw_outside = function(ex) {
                (view.setImmediate || view.setTimeout)(function() {
console.log("Exception throw");
console.log(ex);
                    throw ex;
                }, 0);
            }
            , force_saveable_type = "application/octet-stream"
            , fs_min_size = 0
        // the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
            , arbitrary_revoke_timeout = 1000 * 40 // in ms
            , revoke = function(file) {
                var revoker = function() {
console.log("Revoker in action");
console.log(file);
                    if (typeof file === "string") { // file is an object URL
                        get_URL().revokeObjectURL(file);
                    } else { // file is a File
                        file.remove();
                    }
                };
                /* // Take note W3C:
                 var
                 uri = typeof file === "string" ? file : file.toURL()
                 , revoker = function(evt) {
                 // idealy DownloadFinishedEvent.data would be the URL requested
                 if (evt.data === uri) {
                 if (typeof file === "string") { // file is an object URL
                 get_URL().revokeObjectURL(file);
                 } else { // file is a File
                 file.remove();
                 }
                 }
                 }
                 ;
                 view.addEventListener("downloadfinished", revoker);
                 */
                setTimeout(revoker, arbitrary_revoke_timeout);
            }
            , dispatch = function(filesaver, event_types, event) {
console.log("Dispatching");
                event_types = [].concat(event_types);
                var i = event_types.length;
                while (i--) {
                    var listener = filesaver["on" + event_types[i]];
console.log("listener:" + event_types[i]);
console.log(listener);
                    if (typeof listener === "function") {
                        try {
                            listener.call(filesaver, event || filesaver);
                        } catch (ex) {
                            throw_outside(ex);
                        }
                    }
                }
            }
            , auto_bom = function(blob) {
                // prepend BOM for UTF-8 XML and text/* types (including HTML)
                if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
                    return new Blob(["\ufeff", blob], {type: blob.type});
                }
                return blob;
            }
            , FileSaver = function(blob, name, no_auto_bom) {
                if (!no_auto_bom) {
                    blob = auto_bom(blob);
                }
                // First try a.download, then web filesystem, then object URLs
                var
                    filesaver = this
                    , type = blob.type
                    , blob_changed = false
                    , object_url
                    , target_view
                    , dispatch_all = function() {
console.log("dispatch all");
                        dispatch(filesaver, "writestart progress write writeend".split(" "));
                    }
                // on any filesys errors revert to saving with object URLs
                    , fs_error = function() {
console.log("fs_error; target_view: " + (target_view && 1));
console.log("fs_error; FileReader: " + (typeof FileReader !== "undefined"));
console.log("fs_error; blobtype: " + blob.type);
                        if (target_view && (is_safari || is_chrome_ios) && typeof FileReader !== "undefined") {
console.log("fs_error: safari");
                            // Safari doesn't allow downloading of blob urls
                            var reader = new FileReader();
                            reader.onloadend = function() {
console.log("building data");
                                var base64Data = reader.result;
                                //target_view.location.href = "data:"+blob.type+" + base64Data.slice(base64Data.search(/[,;]/));
                                target_view.location.href = "data:application/octet-stream" + base64Data.slice(base64Data.search(/[,;]/));
                                filesaver.readyState = filesaver.DONE;
                                dispatch_all();
                            };
console.log("start building dataurl...");
                            reader.readAsDataURL(blob);
                            filesaver.readyState = filesaver.INIT;
                            return;
                        }
console.log("or not...");
                        // don't create more object URLs than needed
                        if (blob_changed || !object_url) {
                            object_url = get_URL().createObjectURL(blob);
console.log("object url: (changed="+blob_changed+")");
console.log(object_url);
                        }
                        if (target_view) {
console.log("opening object url");
                            target_view.location.href = object_url;
                        } else {
console.log("opening new tab on object url");
                            var new_tab = view.open(object_url, "_blank");
console.log("new tab opened:");
//console.log(new_tab);
//                            if (new_tab !== undefined && new_tab.location && new_tab.location.href === "about:blank" && is_chrome_ios){
//console.log("open failed2");
//                                view.location.href = object_url
//                            }
                            if (new_tab === undefined && is_safari) {
                                //Apple do not allow window.open, see http://bit.ly/1kZffRI
console.log("open failed");
                                view.location.href = object_url
                            }
                        }
console.log("done state");
                        filesaver.readyState = filesaver.DONE;
                        dispatch_all();
                        revoke(object_url);
                    }
                    , abortable = function(func) {
                        return function() {
                            if (filesaver.readyState !== filesaver.DONE) {
                                return func.apply(this, arguments);
                            }
                        };
                    }
                    , create_if_not_found = {create: true, exclusive: false}
                    , slice
                    ;
                filesaver.readyState = filesaver.INIT;
                if (!name) {
                    name = "download";
                }
console.log("name: " + name);
console.log("is safari: " + is_safari);
console.log("is chromeios: " + is_chrome_ios);
console.log("save link: " + can_use_save_link);
console.log(save_link);
                if (can_use_save_link) {
console.log("can use save link!");
                    object_url = get_URL().createObjectURL(blob);
                    setTimeout(function() {
console.log("save link fired");
                        save_link.href = object_url;
                        save_link.download = name;
                        click(save_link);
                        dispatch_all();
                        revoke(object_url);
                        filesaver.readyState = filesaver.DONE;
                    });
                    return;
                }
                // Object and web filesystem URLs have a problem saving in Google Chrome when
                // viewed in a tab, so I force save with application/octet-stream
                // http://code.google.com/p/chromium/issues/detail?id=91158
                // Update: Google errantly closed 91158, I submitted it again:
                // https://code.google.com/p/chromium/issues/detail?id=389642
console.log("view.chrome: " + view.chrome);
                if ((view.chrome || is_chrome_ios) && type && type !== force_saveable_type) {
console.log("chrome & not forceable save type: ");
                    slice = blob.slice || blob.webkitSlice;
                    blob = slice.call(blob, 0, blob.size, force_saveable_type);
                    blob_changed = true;
console.log(blob);
                }
                // Since I can't be sure that the guessed media type will trigger a download
                // in WebKit, I append .download to the filename.
                // https://bugs.webkit.org/show_bug.cgi?id=65440
                if (webkit_req_fs && name !== "download") {
                    name += ".download";
console.log("we have a new name: " + name);
                }
                if (type === force_saveable_type || webkit_req_fs || is_chrome_ios) {
                    target_view = view;
                }
                if (!req_fs) {
console.log("req fs not...");
                    fs_error();
                    return;
                }
                fs_min_size += blob.size;
                req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
console.log("fslogic");
                    fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
console.log("saved");
                        var save = function() {
console.log("save()");
                            dir.getFile(name, create_if_not_found, abortable(function(file) {
console.log("get file: " + name);
                                file.createWriter(abortable(function(writer) {
                                    writer.onwriteend = function(event) {
                                        target_view.location.href = file.toURL();
                                        filesaver.readyState = filesaver.DONE;
                                        dispatch(filesaver, "writeend", event);
                                        revoke(file);
                                    };
                                    writer.onerror = function() {
                                        var error = writer.error;
                                        if (error.code !== error.ABORT_ERR) {
                                            fs_error();
                                        }
                                    };
                                    "writestart progress write abort".split(" ").forEach(function(event) {
                                        writer["on" + event] = filesaver["on" + event];
                                    });
console.log("start write!");
                                    writer.write(blob);
                                    filesaver.abort = function() {
                                        writer.abort();
                                        filesaver.readyState = filesaver.DONE;
                                    };
                                    filesaver.readyState = filesaver.WRITING;
                                }), fs_error);
                            }), fs_error);
                        };
                        dir.getFile(name, {create: false}, abortable(function(file) {
                            // delete file if it already exists
console.log("create file");
                            file.remove();
                            save();
                        }), abortable(function(ex) {
                            if (ex.code === ex.NOT_FOUND_ERR) {
                                save();
                            } else {
                                fs_error();
                            }
                        }));
                    }), fs_error);
                }), fs_error);
            }
            , FS_proto = FileSaver.prototype
            , saveAs = function(blob, name, no_auto_bom) {
                return new FileSaver(blob, name, no_auto_bom);
            }
            ;
        // IE 10+ (native saveAs)
        if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
            return function(blob, name, no_auto_bom) {
                if (!no_auto_bom) {
                    blob = auto_bom(blob);
                }
                return navigator.msSaveOrOpenBlob(blob, name || "download");
            };
        }

        FS_proto.abort = function() {
            var filesaver = this;
            filesaver.readyState = filesaver.DONE;
            dispatch(filesaver, "abort");
        };
        FS_proto.readyState = FS_proto.INIT = 0;
        FS_proto.WRITING = 1;
        FS_proto.DONE = 2;

        FS_proto.error =
            FS_proto.onwritestart =
                FS_proto.onprogress =
                    FS_proto.onwrite =
                        FS_proto.onabort =
                            FS_proto.onerror =
                                FS_proto.onwriteend =
                                    null;

        return saveAs;
    }(
        typeof self !== "undefined" && self
        || typeof window !== "undefined" && window
        || this.content
    ));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
    module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
    define([], function() {
        return saveAs;
    });
}