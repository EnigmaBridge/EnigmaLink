/**
 * Created by dusanklinec on 12.05.16.
 */
if (typeof(log) === 'undefined') {
    (function(globals){
        "use strict";
        globals.log = function(x){console.log(x);};
    }(this));
}

/**
 * Main EB sharing namespace.
 */
eb.sh = {

};

/**
 * Misc file sharing functions
 */
eb.sh.misc = {
    /**
     * Simple helper for building query string from hash map.
     *
     * @param {object} [params] Key/value pairs for query string
     * @return {string} query string
     */
    buildQuery: function(params) {
        params = params || {};
        return Object.keys(params).map(function (key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }).join('&');
    },

    /**
     * Build the url
     *
     * @param {string} [path] File ID if replacing
     * @param {object} [params] Query parameters
     * @param {object} [baseUrl] Base url
     * @param {boolean} [asFragment] If true the parameters are passed as fragment.
     * @return {string} URL
     */
    buildUrl: function(path, params, baseUrl, asFragment) {
        var url = baseUrl || '';
        if (path) {
            url += path;
        }
        var query = eb.sh.misc.buildQuery(params);
        if (query) {
            url += (asFragment !== undefined && asFragment ? '#' : '?') + query;
        }
        return url;
    },

    /**
     * Converts input to the URL-compatible base64 encoding.
     * @param {bitArray|string|number} input
     */
    inputToLinkBase64: function(input){
        return sjcl.codec.base64.fromBits(eb.misc.inputToBits(input), true, true);
    },

    /**
     * Converts link compatible base64 to the bitArray.
     * @param {string} input
     */
    inputFromLinkBase64: function(input){
        return sjcl.codec.base64.toBits(input, true);
    },

    /**
     * Extracts URL parameter from the given link.
     * @param {string} name of the URL parameter
     * @param {string} [url] optional URL which to analyze. If undefined, location.search is used (current).
     * @param {boolean} [fromFragment] If true the parameters are searched in the fragment.
     * @returns {string|null}
     */
    getURLParameter: function(name, url, fromFragment) {
        return decodeURIComponent((new RegExp('['+(fromFragment ? '#' : '?')+'|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(url || location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
    },

    /**
     * Returns google drive link for the file with given ID.
     * @param fileId
     * @returns {*}
     */
    getDriveDownloadLink: function(fileId){
        return sprintf("https://drive.google.com/file/d/%s/view?usp=sharing", encodeURIComponent(fileId));
    },

    /**
     * Returns google drive direct download link for the file with given ID.
     * @param fileId
     * @returns {*}
     */
    getDriveDirectLink: function(fileId){
        // return sprintf("https://www.googleapis.com/drive/v3/files/%s?alt=media", encodeURIComponent(fileId));
        // return sprintf("https://docs.google.com/uc?id=%s&export=download", encodeURIComponent(fileId));
        return sprintf("https://drive.google.com/uc?export=download&id=%s", encodeURIComponent(fileId));
    }
};

/**
 * Helper for implementing retries with backoff. Initial retry
 * delay is 1 second, increasing by 2x (+jitter) for subsequent retries
 *
 * @constructor
 */
var RetryHandler = function() {
    this.interval = 1000; // Start at one second
    this.maxInterval = 60 * 1000; // Don't wait longer than a minute
};

/**
 * Invoke the function after waiting
 *
 * @param {function} fn Function to invoke
 */
RetryHandler.prototype.retry = function(fn) {
    setTimeout(fn, this.interval);
    this.interval = this.nextInterval_();
};

/**
 * Reset the counter (e.g. after successful request.)
 */
RetryHandler.prototype.reset = function() {
    this.interval = 1000;
};

/**
 * Calculate the next wait time.
 * @return {number} Next wait interval, in milliseconds
 *
 * @private
 */
RetryHandler.prototype.nextInterval_ = function() {
    var interval = this.interval * 2 + this.getRandomInt_(0, 1000);
    return Math.min(interval, this.maxInterval);
};

/**
 * Get a random int in the range of min to max. Used to add jitter to wait times.
 *
 * @param {number} min Lower bounds
 * @param {number} max Upper bounds
 * @private
 */
RetryHandler.prototype.getRandomInt_ = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * General data source object. Abstract.
 * Provides async access to the underlying data.
 * @constructor
 */
var DataSource = function(){

};
DataSource.prototype = {
    read: function(offsetStart, offsetEnd, handler){
        throw new eb.exception.invalid("Acessing abstract method");
    },
    length: function(){
        throw new eb.exception.invalid("Acessing abstract method");
    }
};

/**
 * Data source with blob. Can be a static blob or a file.
 * Data is read with FileReader.
 * @param blob
 * @constructor
 */
var BlobDataSource = function(blob){
    this.blob = blob;
    this.reader = new FileReader();
};

/**
 * Constant data source.
 * @param {bitArray} data
 * @constructor
 */
var ConstDataSource = function(data){
    this.data = data;
};

/**
 * Data source wrapping a generator.
 * @param generator
 * @param length
 * @constructor
 */
var WrappedDataSource = function(generator, length){
    this.generator = generator;
    this.len = length;
};

/**
 * Data source combining multiple different data sources to one.
 * @param sources array of data sources.
 * @constructor
 */
var MergedDataSource = function(sources){
    this.sources = sources;
    this.len = 0;
    this.incLenList = [0]; // incremental size list. ith object = sum(0..i-1).
    var i, ln;
    for (i=0, ln=sources.length; i<ln; i++) {
        var src = sources[i];
        var cln = src.length();
        this.len += cln;
        this.incLenList.push(this.incLenList[i] + cln);
    }
};
BlobDataSource.inheritsFrom(DataSource, {
    read: function(offsetStart, offsetEnd, handler){
        var content = this.blob.slice(offsetStart, offsetEnd);

        // Event handler called when data is loaded from the blob/file.
        var onLoadFnc = function(evt) {
            if (evt.target.readyState != FileReader.DONE) { // DONE == 2
                log("State not done");
                return;
            }

            var data = evt.target.result;
            var ba = sjcl.codec.arrayBuffer.toBits(data);
            handler(ba);
        };

        // Initiate file/blob read.
        this.reader.onloadend = onLoadFnc.bind(this);
        this.reader.readAsArrayBuffer(content);
    },
    length: function(){
        return this.blob.size;
    }
});
ConstDataSource.inheritsFrom(DataSource, {
    read: function(offsetStart, offsetEnd, handler){
        var w = sjcl.bitArray;
        var bl = w.bitLength(this.data);
        var cStart = offsetStart*8;
        var cEnd = offsetEnd*8;
        if (cStart>cEnd || cEnd-cStart > bl){
            throw new eb.exception.invalid("Invalid argument");
        }

        handler(w.bitSlice(this.data, cStart, cEnd));
    },
    length: function(){
        return sjcl.bitArray.bitLength(this.data)/8;
    }
});
WrappedDataSource.inheritsFrom(DataSource, {
    read: function(offsetStart, offsetEnd, handler){
        this.generator(offsetStart, offsetEnd, function(x){
            handler(x);
        });
    },
    length: function(){
        return this.len;
    }
});
MergedDataSource.inheritsFrom(DataSource, {
    read: function(offsetStart, offsetEnd, handler){
        var w = sjcl.bitArray;
        var sl = this.sources.length;
        var i;
        var res = [];
        var cShift = 0, cLen = 0, cOffsetStart, cOffsetEnd, desiredLen = offsetEnd-offsetStart;

        var cHandler = function(x){
            var bl = w.bitLength(x);
            if (cOffsetEnd-cOffsetStart != bl/8){
                throw new eb.exception.invalid("Read invalid number of bytes!");
            }

            // Append current data to the result.
            res = w.concat(res, x);
            offsetStart+=bl/8;

            // Everything read?
            if (offsetStart>=offsetEnd){
                if (w.bitLength(res)/8 != desiredLen){
                    throw new eb.exception.invalid("Reading returned invalid number of bytes from sub data sources");
                }
                handler(res);
                return;
            }

            // Start next load.
            (startRead.bind(this))(offsetStart, offsetEnd);
        };

        var startRead = function(ofStart, ofEnd){
            for(i=0, cShift = 0; i<sl; i++){
                // Offset starts on the next streams - skip previous ones.
                if (ofStart >= this.incLenList[i+1]){
                    continue;
                }

                cShift += this.incLenList[i];
                cLen = this.sources[i].length();
                cOffsetStart = ofStart-cShift;
                cOffsetEnd = (ofEnd-cShift);
                if (cOffsetEnd > cOffsetStart+cLen){
                    cOffsetEnd = cOffsetStart+cLen;
                }

                this.sources[i].read(cOffsetStart, cOffsetEnd, cHandler.bind(this));

                // Break iteration, wait for handler to return data.
                break;
            }
        };

        // Initial kickoff.
        (startRead.bind(this))(offsetStart, offsetEnd);
    },
    length: function(){
        return this.len;
    }
});

/**
 * Helper class for resumable uploads using XHR/CORS. Can upload any Blob-like item, whether
 * files or in-memory constructs.
 *
 * @example
 * var content = new Blob(["Hello world"], {"type": "text/plain"});
 * var uploader = new MediaUploader({
     *   file: content,
     *   token: accessToken,
     *   onComplete: function(data) { ... }
     *   onError: function(data) { ... }
     * });
 * uploader.upload();
 *
 * @constructor
 * @param {object} options Hash of options
 * @param {string} options.token Access token
 * @param {blob} options.file Blob-like item to upload
 * @param {string} [options.fileId] ID of file if replacing
 * @param {object} [options.params] Additional query parameters
 * @param {string} [options.contentType] Content-type, if overriding the type of the blob. Public info (non-protected).
 * @param {object} [options.metadata] File metadata
 * @param {object} [options.fname] Filename to use.
 * @param {Array} [options.parents] Parent folder IDs of the uploaded file. If null, root directory is the only parent.
 * @param {function} [options.onComplete] Callback for when upload is complete
 * @param {function} [options.onProgress] Callback for status for the in-progress upload
 * @param {function} [options.onError] Callback if upload fails
 * @param {number} [options.chunkSize] Upload chunk size in bytes.
 * @param {bitArray} options.encKey AES-256 file encryption key.
 * @param {bitArray} options.secCtx security context for the file (encrypted form of encKey)
 * @param {number} [options.padding] Number of bytes to add to the file. Size concealing.
 * @param {function} [options.padFnc] If set, takes precedence over options.padding. Determines number of bytes to add to the message.
 */
var EnigmaUploader = function(options) {
    var noop = function() {};
    this.file = options.file;
    this.contentType = options.contentType || this.file.type || 'application/octet-stream';
    this.contentTypeOrig = this.file.type || 'application/octet-stream';
    this.fname = options.fname || this.file.name || 'note';
    this.fnameOrig = options.fnameOrig || this.file.name || 'note';
    this.metadata = options.metadata || {
            'name': this.fname,
            'mimeType': this.contentType
        };
    if (options.parents){
        this.metadata.parents = options.parents;    // parent folders for the uploaded file. if null -> root
    }
    this.token = options.token;
    this.onComplete = options.onComplete || noop;
    this.onProgress = options.onProgress || noop;
    this.onError = options.onError || noop;
    this.chunkSize = options.chunkSize || 262144*2; // requirement by Google, minimal size of a chunk.
    this.offset = 0;
    this.retryHandler = new RetryHandler();
    this.url = options.url;

    if (!this.url) {
        var params = options.params || {};
        params.uploadType = 'resumable';
        this.url = this.buildUrl_(options.fileId, params, options.baseUrl);
    }
    this.httpMethod = options.fileId ? 'PUT' : 'POST';

    // Encryption related fields.
    this.encKey = options.encKey;                   // bitArray with encryption key for AES-256-GCM.
    this.secCtx = options.secCtx || [];             // bitArray with security context, result of UO application.
    this.aes = new sjcl.cipher.aes(this.encKey);    // AES cipher instance to be used with GCM for data encryption.
    this.reader = new FileReader();                 // Reader of data/file contents.
    this.iv = sjcl.random.randomWords(4);           // initialization vector for GCM, 1 block, 16B.
    this.lnonce = sjcl.random.randomWords(4);       // 128bit of entropy stored in the link. Not available to EB.
    this.gcm = new sjcl.mode.gcm2(this.aes, true, [], this.iv, 128); // GCM encryption mode, initialized now.

    // Construct first meta block now, compute file sizes.
    this.paddingToAdd = options.padding || 0;       // Concealing padding size.
    this.paddingFnc = options.padFnc;               // Padding size function. If set, determines the padding length.
    this.dataSource = undefined;                    // Data source for data/file/padding...
    this.buildFstBlock_();
    this.preFileSize = this.preFileSize_();         // Number of bytes in the upload stream before file contents.
    this.totalSize = this.totalSize_();             // Total size of the upload stream.

    // Encrypted data buffering - already processed data. Underflow avoidance.
    this.cached = {};         // Data processing cache object.
    this.cached.offset = -1;  // Data start offset that is cached in the buff. Absolute data offset address of the first buff byte.
    this.cached.end = -1;     // Data end offset that is cached in the buff. Absolute data offset address of the last buff byte.
    this.cached.buff = [];    // Cached processed data buffer. Size = cached.end - cached.offset.
    this.cached.tag = [];     // Computed final auth tag for the data.
};

EnigmaUploader.TAG_SEC = 0x1;      // security context part. Contains IV, encrypted file encryption key.
EnigmaUploader.TAG_FNAME = 0x2;    // record with the data/file name.
EnigmaUploader.TAG_MIME = 0x3;     // record with the data/file mime type.
EnigmaUploader.TAG_ENC = 0x4;      // record with the encrypted data/file. Last record in the message (no length field).
EnigmaUploader.TAG_ENCWRAP = 0x5;  // record with the encrypted container (fname+mime+data). Last unencrypted record (no length field).
EnigmaUploader.TAG_PADDING = 0x6;  // padding record. Null bytes (skipped in parsing), may be used to conceal true file size or align blocks.
EnigmaUploader.LENGTH_BYTES = 0x4;

/**
 * Initiate the upload.
 * Store file metadata, start resumable upload to obtain upload ID.
 */
EnigmaUploader.prototype.upload = function() {
    var self = this;
    var xhr = new XMLHttpRequest();

    xhr.open(this.httpMethod, this.url, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + this.token);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Upload-Content-Length', this.totalSize);
    xhr.setRequestHeader('X-Upload-Content-Type', this.contentType);

    xhr.onload = function(e) {
        if (e.target.status < 400) {
            var location = e.target.getResponseHeader('Location');
            this.url = location;
            log("Upload session started. Url: " + this.url);

            this.sendFile_();
        } else {
            this.onUploadError_(e);
        }
    }.bind(this);
    xhr.onerror = this.onUploadError_.bind(this);

    log("Starting session with metadata: " + JSON.stringify(this.metadata));
    xhr.send(JSON.stringify(this.metadata));
};

/**
 * Builds meta info block. File is prepended with this information.
 * Contains information required for decryption and encrypted meta data block.
 * Meta data block contains e.g., original file name, mime type, ...
 *
 * First block is padded on a cipher block size with TLV padding so the further
 * data/file processing is faster and aligned on blocks.
 */
EnigmaUploader.prototype.buildFstBlock_ = function() {
    var block = [];
    var toEnc = [];
    var h = sjcl.codec.hex;
    var w = sjcl.bitArray;
    var padBytesToAdd;

    // Secure context block, tag | len-4B | IV | secCtx
    var secLen = w.bitLength(this.iv)/8 + w.bitLength(this.secCtx)/8;
    block = w.concat(block, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_SEC, secLen)));
    block = w.concat(block, this.iv);
    block = w.concat(block, this.secCtx);

    // Encryption wrap tag - the end of the message is encrypted with AES-256-GCM. Last tag in unencrypted part. No length.
    block = w.concat(block, h.toBits(sprintf("%02x", EnigmaUploader.TAG_ENCWRAP)));

    // Encrypted meta data block.
    // toEnc does not need to be aligned with block length as GCM is a stream mode.
    // But for the simplicity, pad it to the block size - easier state manipulation, size computation.
    //
    // Filename
    log("FileName in meta block: " + this.fnameOrig);
    var baName = sjcl.codec.utf8String.toBits(this.fnameOrig);
    toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_FNAME, w.bitLength(baName)/8)));
    toEnc = w.concat(toEnc, baName);

    // Mime type
    log("MimeType in meta block: " + this.contentTypeOrig);
    var baMime = sjcl.codec.utf8String.toBits(this.contentTypeOrig);
    toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_MIME, w.bitLength(baMime)/8)));
    toEnc = w.concat(toEnc, baMime);

    // Align to one AES block with padding record - encryption returns block immediately, easier size computation.
    var metaBlockSizeNoPadded = w.bitLength(toEnc)/8;
    if ((metaBlockSizeNoPadded % 16) != 0){
        var numBytesAfterPadBlock = metaBlockSizeNoPadded + 5; // pad tag + pad length = minimal size for new pad record.
        var totalFblockSize = eb.misc.padToBlockSize(numBytesAfterPadBlock, 16); // length after padding to the whole block.
        padBytesToAdd = totalFblockSize - numBytesAfterPadBlock;

        toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_PADDING, padBytesToAdd)));
        if (padBytesToAdd > 0){
            toEnc = w.concat(toEnc, h.toBits('00'.repeat(padBytesToAdd)));
        }
    }

    // Encrypt padded meta data block.
    var encrypted = this.gcm.update(toEnc);
    log(sprintf("Encrypted size: %s B, before enc: %s B", w.bitLength(encrypted)/8, w.bitLength(toEnc)/8));

    block = w.concat(block, encrypted);
    log(sprintf("FBlockSize: %s, encPartSize: %s", w.bitLength(block)/8, w.bitLength(toEnc)/8));

    // For easy/fast encryption with aligning, add padding bytes to the plaintext so the whole fstBlock is multiple of 16.
    var fstLenNoPadded = w.bitLength(block)/8;
    if ((fstLenNoPadded % 16) != 0){
        var afterPad = fstLenNoPadded + 5; // pad tag + pad length = minimal size for new pad record.
        var totalSize = eb.misc.padToBlockSize(afterPad, 16); // length after padding to the whole block.
        padBytesToAdd = totalSize - afterPad;

        var padBlock = h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_PADDING, padBytesToAdd));
        if (padBytesToAdd > 0){
            padBlock = w.concat(padBlock, h.toBits('00'.repeat(padBytesToAdd)));
        }

        block = w.concat(padBlock, block);
    }

    log(sprintf("Total after pad: %s", w.bitLength(block)/8));
    this.fstBlock = block;

    // Prepare data sources for encryption & fetching data. Processing engine fetches data from the data source
    // querying fragments of data. This abstraction helps to access multiple different sources
    // as it was only one continuous data source (underflow buffering logic is simpler).
    //
    // If padding is disabled, data source consists of a static tag source + blob source.
    var paddingEnabled = this.paddingToAdd > 0 || this.paddingFnc !== undefined;

    // Encryption block, the last tag in the message - without length
    var encSc = new ConstDataSource(h.toBits(sprintf("%02x", EnigmaUploader.TAG_ENC)));
    var blobSc = new BlobDataSource(this.file);
    if (!paddingEnabled){
        this.dataSource = new MergedDataSource([encSc, blobSc]);

    } else {
        // Simple padding data source generator - stream of zero bytes, generated on demand.
        var padGenerator = function(offsetStart, offsetEnd, handler){
            handler(sjcl.codec.hex.toBits("00".repeat(offsetEnd-offsetStart)));
        };

        // If function is defined, gen number of padding bytes to add.
        // FstBlock + TAG_PADDING + len4B + TAG_ENC + len(message) + GCM-TAG-16B
        var curTotalSize = this.preFileSize_() + 1 + 4 + 1 + blobSc.length() + 16;
        if (this.paddingFnc){
            this.paddingToAdd = this.paddingFnc(curTotalSize);
        }
        if (this.paddingToAdd < 0){
            throw new eb.exception.invalid("Padding cannot be negative");
        }

        // Padding tag source + padding generator.
        var padConst = new ConstDataSource(h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_PADDING, this.paddingToAdd)));
        var padGen = new WrappedDataSource(padGenerator, this.paddingToAdd);
        this.dataSource = new MergedDataSource([padConst, padGen, encSc, blobSc]);
        log("Concealing padding added: " + this.paddingToAdd + ", total file size: " + (curTotalSize+this.paddingToAdd));
    }

    this.dataSize = this.dataSource.length();
    return block;
};

/**
 * Bytes to send.
 * Uniform access to file structure before sending.
 */
EnigmaUploader.prototype.getBytesToSend_ = function(offset, end, loadedCb) {
    var needContent = end > this.preFileSize; // end is exclusive border.
    var result = []; // result will be placed here, given to loadedCb.
    var w = sjcl.bitArray;

    // If data from the first block is needed, pass the correct chunk.
    if (offset < this.preFileSize){
        result = w.concat(result, w.bitSlice(this.fstBlock, offset*8, Math.max(end*8, this.preFileSize*8)));
    }

    // File loading not needed.
    if (!needContent){
        loadedCb(result);
        return;
    }

    // File data loading.
    var fOffset = Math.max(0, offset - this.preFileSize);
    var fEnd = Math.min(this.dataSize, end - this.preFileSize);
    var fEndOrig = fEnd;
    var fChunkLen = fEnd - fOffset;
    var aheadBytes = 0;

    // If old chunk is requested - error, should not happen.
    // We already discarded processed data in the cache cleanup and it cannot be computed again as
    // GCM state already moved forward.
    if (this.cached.offset != -1 && fOffset < this.cached.offset){
        throw new sjcl.exception.invalid("Data requested were deleted.");
    }

    // Drop old processed chunks from the processed buffer. Won't be needed anymore.
    if (this.cached.end != -1 && this.cached.end <= fOffset){
        log(sprintf("Dropping old chunk (end). Cached: %s - %s. FileReq: %s - %s", this.cached.offset, this.cached.end, fOffset, fEnd));
        this.cached.offset = -1;
        this.cached.end = -1;
        this.cached.buff = [];
    }

    // Cleanup. Keep only last chunk in the buffer just in case a weird reupload request comes.
    // We assume we won't need more data from the past than 1 upload chunk size. If we do, it is a critical error.
    if (this.cached.offset != -1 && (this.cached.offset+this.chunkSize) < fOffset){
        log(sprintf("Dropping old chunk. Cached: %s - %s. FileReq: %s - %s, newCachedOffset: %s, DropFromPos: %s",
            this.cached.offset, this.cached.end, fOffset, fEnd, fOffset - this.chunkSize,
            fOffset - this.chunkSize - this.cached.offset));

        this.cached.buff = w.bitSlice(this.cached.buff, (fOffset - this.chunkSize - this.cached.offset)*8);
        this.cached.offset = fOffset - this.chunkSize;
        eb.misc.assert(w.bitLength(this.cached.buff) == 8*(this.cached.end - this.cached.offset), "Invariant broken");
    }

    // If we have some data already prepared in the buffer - provide it. (fOffset is in the cached buffer range).
    if (this.cached.offset <= fOffset && this.cached.end >= fOffset){
        var curStart = fOffset - this.cached.offset;
        var curStop = Math.min(this.cached.end - this.cached.offset, curStart + (fEnd - fOffset));
        var toUse = w.bitSlice(this.cached.buff, curStart*8, curStop*8);
        result = w.concat(result, toUse);

        // Update fOffset, fEnd, reflect loaded data from buffer.
        // It may be still needed to load & process (encrypt) additional data.
        fOffset += curStop - curStart;
        fChunkLen = fEnd - fOffset;

        log(sprintf("Partially provided from the buffer, provided: %s B, newDataOffset: %s B, dataToLoad: %s B",
            w.bitLength(toUse)/8, fOffset, fChunkLen));
    }

    // If enough is loaded, do not load data from source. Provide just processed data from the buffer.
    if (fOffset >= fEnd){
        log(sprintf("Everything served from the internal buffer"));

        // Check if tag needs to be provided
        if (end >= this.preFileSize + this.dataSize){
            if (w.bitLength(this.cached.tag)/8 != 16){
                throw new sjcl.exception.invalid("Tag not ready when it should be");
            }

            var tagStart = Math.max(0, fOffset-this.dataSize);
            var tagEnd = end-this.preFileSize-this.dataSize;
            result = w.concat(result, w.bitSlice(this.cached.tag, tagStart*8, tagEnd*8));
            log(sprintf("Stored tag served. %s - %s pos", tagStart, tagEnd));
        }

        loadedCb(result);
        return;
    }

    // To prevent underflow, read more data than requested (align to the cipher block size).
    // If end is in the unaligned position, GCM won't output it and underflow happens as we get fewer data than
    // we are supposed to in the upload request.
    if (fEnd < this.dataSize && (fChunkLen % 16) != 0){
        fEnd = Math.min(this.dataSize, fOffset + eb.misc.padToBlockSize(fChunkLen, 16));
        aheadBytes = fEnd - fEndOrig;
        log(sprintf("Possible underflow, read ahead, oldLen: %s, newLen: %s, oldEnd: %s, newEnd: %s, extra bytes: %s",
            fChunkLen, fEnd-fOffset, fEndOrig, fEnd, aheadBytes));
    }

    // Event handler called when data is loaded from the blob/file.
    var onLoadFnc = function(ba) {
        log(sprintf("Read bytes: %s - %s of %s B file. TotalSize: %s B, PreFileSize: %s, bitArray: %s B",
            fOffset, fEnd, this.dataSize, this.totalSize, this.preFileSize, w.bitLength(ba)/8));

        // Encrypt this chunk with GCM mode.
        // Output length is cipher-block aligned, this can cause underflows in certain situations. To make it easier
        // padding records are inserted to the first block so it is all blocksize aligned (16B).
        ba = this.gcm.update(ba);
        var cres = ba;

        // Includes tag?
        // Due to pre-buffering it should not happen end ends up in the unaligned part of the buffer.
        // It is either aligned or the final byte of the file.
        if (end >= this.preFileSize + this.dataSize){
            var res = this.gcm.doFinal();
            this.cached.tag = res.tag;

            // Ad the last data block.
            ba = w.concat(ba, res.data);

            // Result - current.
            cres = w.concat(cres, res.data);
            cres = w.concat(cres, res.tag);
        }

        // Update cached prepared data. If reupload happens, data is taken from buffer, no encryption of the same
        // data. It would break tag & counters in GCM.
        if (this.cached.offset == -1) {
            this.cached.offset = fOffset;
        }
        this.cached.end = fEnd;
        this.cached.buff = w.concat(this.cached.buff, ba);

        // Add appropriate amount of bytes from cres to result.
        var resultBl = w.bitLength(result);
        var cresBl = w.bitLength(cres);
        result = w.concat(result, w.bitSlice(cres, 0, Math.min(cresBl, 8*(end-offset) - resultBl) ) );
        loadedCb(result);
    };

    // Initiate file/blob read.
    this.dataSource.read(fOffset, fEnd, onLoadFnc.bind(this));
};

/**
 * Send the actual file content.
 * Subsequently called after previous chunk was uploaded successfully or to
 * re-upload the same chunk in case of an error.
 *
 * @private
 */
EnigmaUploader.prototype.sendFile_ = function() {
    var end = this.totalSize;
    var lstBlock = false;

    if (this.offset || this.chunkSize) {
        if (this.chunkSize) {
            end = Math.min(this.offset + this.chunkSize, this.totalSize);
            lstBlock = end >= this.totalSize;
        }
    }

    // Handler for uploading requested data range.
    var onLoadFnc = function(ba) {
        var finalBuffer = sjcl.codec.arrayBuffer.fromBits(ba, 0, 0);

        var xhr = new XMLHttpRequest();
        xhr.open('PUT', this.url, true);
        xhr.setRequestHeader('Content-Type', this.contentType);
        xhr.setRequestHeader('Content-Range', "bytes " + this.offset + "-" + (end - 1) + "/" + this.totalSize);
        xhr.setRequestHeader('X-Upload-Content-Type', this.contentType);
        if (xhr.upload) {
            xhr.upload.addEventListener('progress',
                this.progressHandler_.bind(this, {
                    offset:this.offset,
                    chunkSize:(end-this.offset),
                    total:this.totalSize
                }));
        }
        xhr.onload = this.onContentUploadSuccess_.bind(this);
        xhr.onerror = this.onContentUploadError_.bind(this);
        log(sprintf("Uploading %s - %s / %s, len: %s, bufferSize: %s",
            this.offset, end-1, this.totalSize, end-this.offset, finalBuffer.byteLength));
        xhr.send(finalBuffer);
    };

    this.getBytesToSend_(this.offset, end, onLoadFnc.bind(this));
};

/**
 * Query for the state of the file for resumption.
 *
 * @private
 */
EnigmaUploader.prototype.resume_ = function() {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', this.url, true);
    xhr.setRequestHeader('Content-Range', "bytes */" + this.totalSize);
    xhr.setRequestHeader('X-Upload-Content-Type', this.file.type);
    // Progress disabled for state query.
    //if (xhr.upload) {
    //    xhr.upload.addEventListener('progress', this.progressHandler_.bind(this));
    //}
    xhr.onload = this.onContentUploadSuccess_.bind(this);
    xhr.onerror = this.onContentUploadError_.bind(this);
    xhr.send();
};

/**
 * Extract the last saved range if available in the request.
 *
 * @param {XMLHttpRequest} xhr Request object
 */
EnigmaUploader.prototype.extractRange_ = function(xhr) {
    var range = xhr.getResponseHeader('Range');
    if (range) {
        this.offset = parseInt(range.match(/\d+/g).pop(), 10) + 1;
    }
};

/**
 * Handle successful responses for uploads. Depending on the context,
 * may continue with uploading the next chunk of the file or, if complete,
 * invokes the caller's callback.
 *
 * @private
 * @param {object} e XHR event
 */
EnigmaUploader.prototype.onContentUploadSuccess_ = function(e) {
    if (e.target.status == 200 || e.target.status == 201) {
        this.onComplete(e.target.response);
    } else if (e.target.status == 308) {
        this.extractRange_(e.target);
        this.retryHandler.reset();
        this.sendFile_();
    } else {
        this.onContentUploadError_(e);
    }
};

/**
 * Handles errors for uploads. Either retries or aborts depending
 * on the error.
 *
 * @private
 * @param {object} e XHR event
 */
EnigmaUploader.prototype.onContentUploadError_ = function(e) {
    if (e.target.status && e.target.status < 500) {
        this.onError(e.target.response);
    } else {
        this.retryHandler.retry(this.resume_.bind(this));
    }
};

/**
 * Handles errors for the initial request.
 *
 * @private
 * @param {object} e XHR event
 */
EnigmaUploader.prototype.onUploadError_ = function(e) {
    this.onError(e.target.response); // TODO - Retries for initial upload
};

EnigmaUploader.prototype.progressHandler_ = function(meta, evt){
    this.onProgress(evt, meta);
};

/**
 * Build the drive upload URL
 *
 * @private
 * @param {string} [id] File ID if replacing
 * @param {object} [params] Query parameters
 * @param {object} [baseUrl] base url
 * @return {string} URL
 */
EnigmaUploader.prototype.buildUrl_ = function(id, params, baseUrl) {
    var url = baseUrl || 'https://www.googleapis.com/upload/drive/v3/files/';
    if (id) {
        url += id;
    }
    var query = eb.sh.misc.buildQuery(params);
    if (query) {
        url += '?' + query;
    }
    return url;
};

/**
 * Computes metadata sent before file contents.
 *
 * @private
 * @return {number} number of bytes of the final file.
 */
EnigmaUploader.prototype.preFileSize_ = function() {
    if (this.fstBlock === undefined){
        throw new sjcl.exception.invalid("First block not computed");
    }

    var ln = sjcl.bitArray.bitLength(this.fstBlock)/8;
    if (ln == 0){
        throw new sjcl.exception.invalid("First block not computed");
    }

    return ln;
};

/**
 * Computes overall file size.
 *
 * @private
 * @return {number} number of bytes of the final file.
 */
EnigmaUploader.prototype.totalSize_ = function() {
    var base = this.preFileSize_();
    base += this.dataSize; // GCM is a streaming mode.
    base += 16; // GCM tag
    return base;
};


/**
 * Manager for secure file upload & share.
 */
var EnigmaSharingUpload = function(options) {

};

/**
 * File size concealing - padding.
 * @param curSize current file size.
 * @returns {number} padding bytes to add.
 */
EnigmaSharingUpload.sizeConcealPadFnc = function(curSize){
    var nSize = curSize;

    // At least 1k.
    if (curSize < 1024){
        return 1024-curSize;
    }

    // Helper function;
    var ifGrAlignTo = function(n, threshold, align){
        return n <= threshold || (n % align) == 0 ? n : n + align - (n % align);
    };

    // Simple aligning algorithm:
    // if x > 2^i then align x to 2^{i-1}
    for(var cur=1024 ; cur <= 1024*1024; cur*=2){
        if (nSize < cur*2){
            break;
        }

        nSize = ifGrAlignTo(nSize, cur*2, cur);
    }

    // If > 1.5M, pad to 1M multiple.
    nSize = ifGrAlignTo(nSize, 1024*1024*1.5, 1024*1024);

    // If > 10M, pad to 5M multiple.
    nSize = ifGrAlignTo(nSize, 1024*1024*10, 1024*1024*5);

    // If > 100M, pad to 10M multiple.
    nSize = ifGrAlignTo(nSize, 1024*1024*100, 1024*1024*10);

    return nSize - curSize;
};

/**
 * Downloader object.
 * Quite universal if you have a direct link for the file.
 * @param options
 * @constructor
 */
var EnigmaDownloader = function(options){
    var noop = function() {};

    this.token = options.token;
    this.onComplete = options.onComplete || noop;
    this.onProgress = options.onProgress || noop;
    this.onError = options.onError || noop;
    this.chunkSize = options.chunkSize || 262144*2; // All security relevant data should be present in the first chunk.
    this.offset = 0;
    this.downloaded = false;        // If file was downloaded entirely.
    this.encWrapDetected = false;   // Encryption tag encountered already? If yes, data goes through GCM layer.
    this.retryHandler = new RetryHandler();

    this.url = options.url;
    this.proxyRedirUrl = options.proxyRedirUrl;

    // Encryption related fields.
    this.encKey = options.encKey;                   // bitArray with encryption key for AES-256-GCM. TODO: remove, will be computed
    this.secCtx = undefined;                        // bitArray with security context, result of UO application.
    this.encryptionInitialized = false;             // If the security block was parsed successfully and system is ready for decryption.
    this.aes = undefined;                           // AES cipher instance to be used with GCM for data encryption.
    this.iv = undefined;                            // initialization vector for GCM, 1 block, 16B.
    this.gcm = undefined;                           // GCM encryption mode, initialized now.

    // Construct first meta block now, compute file sizes.
    this.init_();
    this.totalSize=-1;                              // Total size of the upload stream.
    this.downloadedSize=0;                          // Number of bytes downloaded so far.

    // Downloaded data buffering.
    this.cached = {};         // Data processing cache object.
    this.cached.offset = -1;  // Data start offset that is cached in the buff. Absolute data offset address of the first buff byte.
    this.cached.end = -1;     // Data end offset that is cached in the buff. Absolute data offset address of the last buff byte.
    this.cached.buff = [];    // Cached processed data buffer. Size = cached.end - cached.offset.

    // Decrypted data buffering. Fed to TLV parser.
    this.dec = {};
    this.dec.buff = [];

    // State of the TLV parser of the dec buffer.
    this.tps = {};
    this.tps.ctag = -1;
    this.tps.tlen = -1;
    this.tps.clen = 0;
    this.tps.cdata = [];

    // File blobs for download after the decryption finishes.
    this.blobs = [];
    this.fsize = 0;             // Filesize.
    this.fname = undefined;     // Filename extracted from the meta block.
    this.mimetype = undefined;  // Mime type extracted from the meta block.
};

/**
 * Initiate the upload.
 * Store file metadata, start resumable upload to obtain upload ID.
 */
EnigmaDownloader.prototype.fetch = function() {
    // TODO: implement multiple fetching strategies as described in the documentation.
    // TODO: split google drive download logic from the overall download logic. So it is usable also for dropbox & ...
    if (this.proxyRedirUrl) {
        this.fetchProxyRedir_();
    } else if (this.url) {
        this.fetchFile_();
    } else {
        throw new eb.exception.invalid("URL not valid");
    }
};

/**
 * TODO: docs
 */
EnigmaDownloader.prototype.init_ = function() {

};

/**
 * Fetches another chunk of the file, adds it to the processing buffer and calls processing routine.
 * Handles failed state - download retry.
 *
 * Range download: https://greenbytes.de/tech/webdav/draft-ietf-httpbis-p5-range-latest.html#rule.ranges-specifier
 * @private
 */
EnigmaDownloader.prototype.fetchFile_ = function() {
    // Already downloaded the file?
    if (this.downloaded){
        // Start processing of the download buffer.
        this.processDownloadBuffer_();
        return;
    }

    // Start downloading a next chunk we don't have.
    var xhr = new XMLHttpRequest();
    var rangeHeader = "bytes=" + this.offset + "-" + (this.offset + this.chunkSize - 1);

    xhr.open("GET", this.url, true);
    xhr.setRequestHeader('Range', rangeHeader);
    xhr.onload = function(e) {
        if (e.target.status == 416){
            log("Content range not satisfiable, end of the transfer.");
            this.downloaded = true;

            // Start processing of the download buffer.
            this.processDownloadBuffer_();
        }

        if (e.target.status < 400) {
            this.retryHandler.reset();

            var arraybuffer = xhr.response;
            var downloadedLen = arraybuffer ? arraybuffer.byteLength : -1;
            var isLastChunk = downloadedLen < this.chunkSize || (this.totalSize > 0 && this.totalSize <= this.downloadedSize+downloadedLen);
            log(sprintf("Download done, size: %s, lastChunk: %s, downloadedPreviously: %s, offset: %s",
                downloadedLen, isLastChunk, this.downloadedSize, this.offset));

            if (downloadedLen < 0){
                log("Invalid downloaded length");
                this.onDownloadError_(null);
                return;
            }

            // If the size is less than we asked for we surely know it is the last chunk.
            // But if there is no total size information and the length is the size of the chunk it still
            // can be the last chunk but we don't know until we ask for the next one.
            if (isLastChunk){
                this.downloaded = true;
            }

            // By default we are not able to read header "Content-Range" here as it is not in Access-Control-Expose-Headers.
            //var range = xhr.getResponseHeader('Content-Range');

            // Merge with cached download buffer.
            this.mergeDownloadBuffers_(this.offset, this.offset + downloadedLen, arraybuffer);

            // Start processing of the download buffer.
            this.processDownloadBuffer_();

        } else {
            this.onContentDownloadError_(e);
        }
    }.bind(this);
    xhr.onerror = this.onContentDownloadError_.bind(this);

    log(sprintf("Downloading file range: %s, total size: %s", rangeHeader, this.totalSize));
    xhr.responseType = "arraybuffer";
    xhr.send(null);
};

/**
 * Merges downloaded chunk to the download buffer.
 * Moves offset value.
 *
 * @param from
 * @param to
 * @param buffer
 * @private
 */
EnigmaDownloader.prototype.mergeDownloadBuffers_ = function(from, to, buffer){
    var bitArray = sjcl.codec.arrayBuffer.toBits(buffer);

    // Download buffer is empty - simple case.
    if (this.cached.offset == -1 && this.cached.end == -1){
        this.cached.offset = from;
        this.cached.end = to;
        this.cached.buff = bitArray;

        // State update
        this.offset = to;
        this.downloadedSize += to-from;
        return;
    }

    // Consecutive - easy.
    if (this.cached.offset != -1 && this.cached.end == from){
        this.cached.end = to;
        this.cached.buff = sjcl.bitArray.concat(this.cached.buff, bitArray);

        // State update
        this.offset = to;
        this.downloadedSize += to-from;
        return;
    }

    // Same chunk or inside the buffer already?
    if (this.cached.offset <= from && this.cached.end >= to){
        log("Downloaded chunk is already in the buffer, should not happen");
        this.offset = this.cached.end;
        return;
    }

    log("Download buffer is in invalid state, gaps could be present");
    throw new eb.exception.invalid("Illegal download buffer state");
};

/**
 * Processing of the download buffer.
 * @private
 */
EnigmaDownloader.prototype.processDownloadBuffer_ = function(){
    var w = sjcl.bitArray;

    // If the first block has not been processed yet - process encryption block, get IV, encKey.
    if (!this.encryptionInitialized){
        // If there is not enough data for encryption initialization, keep downloading.
        if (!this.downloaded && this.downloadedSize < 128){
            log("Not initialized, not enough data");
            this.bufferProcessed_();
            return;
        }

        // Read encryption block, process data.
        log("Reading encryption data.");
        this.processEncryptionBlock_();
    }

    log(sprintf("ToProcess with GCM: %s-%s, size: %s, buffSize: %s",
        this.cached.offset, this.cached.end, this.cached.end-this.cached.offset, w.bitLength(this.cached.buff)/8));

    if (this.cached.end<this.cached.offset || this.cached.end-this.cached.offset != w.bitLength(this.cached.buff)/8){
        throw new eb.exception.invalid("Cache buffer inconsistent");
    }

    // If the whole file was downloaded, process the whole buffer, without alignments, compute&verify tag.
    if (this.downloaded){
        var finalBlock = this.gcm.doFinal(this.cached.buff);
        if (finalBlock.tagValid != true){
            log("Invalid tag!");
            throw new eb.exception.corrupt("Invalid auth tag on decrypted data");
        }

        // Reset the cached state
        this.cached.offset = -1;
        this.cached.end = -1;
        this.cached.buff = [];

        // Merge decrypted data buffer with the previously decrypted data.
        this.mergeDecryptedBuffers_(finalBlock.data);

    } else {
        // Not the final block, take data aligned to one AES block, decrypt, add to buffer.
        var buffLen = w.bitLength(this.cached.buff)/8;
        var buffToDecryptLen = buffLen - (buffLen%16);
        if (buffToDecryptLen > 0){
            var decrypted = this.gcm.update(w.bitSlice(this.cached.buff, 0, buffToDecryptLen*8));

            // Slice of the GCM processed data from the download buffer, update state.
            this.cached.buff = w.bitSlice(this.cached.buff, buffToDecryptLen*8);
            this.cached.offset += buffToDecryptLen;

            // Merge decrypted data buffer with the previously decrypted data.
            this.mergeDecryptedBuffers_(decrypted);
        }
    }

    // Process decrypted data.
    this.processDecryptedBlock_();

    // Last step:
    // Download next chunk, if any.
    this.bufferProcessed_();
};

/**
 * Merge currently decrypted data with the decrypted buffer.
 * @param buffer
 * @private
 */
EnigmaDownloader.prototype.mergeDecryptedBuffers_ = function(buffer){
    this.dec.buff = sjcl.bitArray.concat(this.dec.buff, buffer);
};

/**
 * Processing decrypted data, TLV records.
 * @private
 */
EnigmaDownloader.prototype.processDecryptedBlock_ = function(){
    var decLen, cpos = 0, ctag = -1, lenToTagFinish = 0, toConsume = 0, w = sjcl.bitArray;
    decLen = w.bitLength(this.dec.buff)/8;
    log(sprintf("To parse: %s B", decLen));

    if (decLen < 0){
        return;
    }

    // Possible parser states:
    //  - reading a new TLV record = clean start.
    //  - incomplete length field = length field not fully available, stop parsing (do not consume buffer), read more, no parser state change.
    //  - incomplete value (from defined length). state = current tag, length (-1 if till end), current length (read), current data.
    // Parser is fed with the decrypted data buffer.
    // This parser is stateful, processes data in a streaming mode, keeps state across multiple requests.
    do {
        // End of the buffer?
        if (cpos == decLen){
            log("End of the dec buffer");
            break;
        }
        if (cpos > decLen){
            log("Invalid buffer state");
            throw new eb.exception.invalid("Invalid decrypted buffer state");
        }

        // Previous tag can be closed?
        if (this.tps.tlen == this.tps.clen){
            this.tps.ctag = -1;
        }

        // Process the buffer. We may be left in the state from the previous processing - unfinished tag processing.
        if (this.tps.ctag == -1){
            // Previous tag finished cleanly, read the next tag + length field (if applicable).
            ctag = w.extract(this.dec.buff, cpos*8, 8);
            cpos += 1;

            // Check for weird tags that should not be present in this buffer.
            if (ctag == EnigmaUploader.TAG_ENCWRAP || ctag == EnigmaUploader.TAG_SEC){
                throw new eb.exception.invalid("Invalid tag detected");
            }

            // If there is not enough data for parsing length field, abort parsing.
            // We need more data then. TAG_ENC is the only tag that does not have length field in this scope.
            if (ctag != EnigmaUploader.TAG_ENC){
                if ((cpos + 4) >= decLen){
                    log("Not enough bytes to parse the length field. Need more data");
                    cpos -= 1; // Tag length, keep in the buffer.
                    break;
                }

                this.tps.tlen = w.extract32(this.dec.buff, cpos*8);
                this.tps.clen = 0;
                cpos += EnigmaUploader.LENGTH_BYTES;

                if (this.tps.tlen < 0){
                    throw new eb.exception.invalid("Negative length detected, field too big");
                }

            } else {
                this.tps.tlen = -1;
                this.tps.clen = 0;
            }

            // Parser can accept this tag, change the parser state.
            this.tps.ctag = ctag;
            this.tps.cdata = [];
        }

        // If tag has definite length, check if we can process it all in one.
        // If not, add data to the cdata buffer and wait until we can process it all in one (unless we can process it
        // in a streaming fashion - or skip in case of the padding).
        // If tag has unknown length, it is the last tag = decrypted file contents.
        if (this.tps.tlen < 0){
            // File data - consume the whole buffer.
            var fileData = w.bitSlice(this.dec.buff, cpos*8);
            var csize = w.bitLength(fileData)/8;
            var arrayBuffer = sjcl.codec.arrayBuffer.fromBits(fileData, 0, 0);
            log(sprintf("Processing %s B of data, totally have: %s. ArrayBuffer: %s B", csize, this.fsize + csize, arrayBuffer.byteLength));

            this.blobs.push(arrayBuffer);
            this.fsize += csize;

            cpos += csize;
            this.tps.clen += csize;
            break;
        }

        lenToTagFinish = this.tps.tlen - this.tps.clen;
        toConsume = Math.min(lenToTagFinish, decLen - cpos);

        // Padding can be processed in the streaming fashion.
        if (this.tps.ctag == EnigmaUploader.TAG_PADDING){
            cpos += toConsume;

            // Current tag parsed? tlen==clen? -> reset tag.
            this.tps.clen += toConsume;
            continue;
        }

        // Process tag with defined length which can be processed only when the whole buffer is loaded.
        // Add toConsume bytes to the cdata buffer.
        this.tps.cdata = w.concat(this.tps.cdata, w.bitSlice(this.dec.buff, cpos*8, (cpos+toConsume)*8));

        cpos += toConsume;
        this.tps.clen += toConsume;
        if (this.tps.clen != this.tps.tlen){
            continue;
        }

        // Tag was processed completely.
        switch(this.tps.ctag){
            case EnigmaUploader.TAG_FNAME:
                this.fname = sjcl.codec.utf8String.fromBits(this.tps.cdata);
                break;

            case EnigmaUploader.TAG_MIME:
                this.mimetype = sjcl.codec.utf8String.fromBits(this.tps.cdata);
                break;

            default:
                log(sprintf("Unsupported tag detected: %s, len: %s", this.tps.ctag, this.tps.clen));
                break;
        }
    } while(true);

    // If here, this.downloaded and dec.buff is not empty = error. Parsing fail, unparsed data left.
    if (cpos < decLen && this.downloaded){
        throw new eb.exception.invalid("Parsing error. Unparsed data left");
    }

    // Slice off the processed part of the buffer.
    this.dec.buff = w.bitSlice(this.dec.buff, cpos*8);
};

/**
 * Parser of the unencrypted data.
 * Initial block contains security related data required for further decryption.
 *
 * @private
 */
EnigmaDownloader.prototype.processEncryptionBlock_ = function(){
    // Possible parser states:
    //  - reading a new TLV record = clean start.
    //  - incomplete length field = length field not fully available, stop parsing (do not consume buffer), read more, no parser state change.
    //  - incomplete value (from defined length). state = current tag, length (-1 if till end), current length (read), current data.
    // Parser is fed with the downloaded data buffer, later, in decryption phase another layer is added, source is data after decryption.
    // This parser is very simple, cannot work with small chunks, everything has to be already loaded in the cache buffer.
    var cpos=0, ctag=-1, tlen=-1, w=sjcl.bitArray;
    if (this.cached.offset != 0){
        throw new eb.exception.invalid("Input data buffer is in invalid state");
    }

    // Process tags.
    do {
        if (cpos > this.cached.end){
            throw new eb.exception.invalid("Input data invalid - reading out of bounds");
        } else if (cpos == this.cached.end){
            break;
        }

        // Get tag.
        ctag = w.extract(this.cached.buff, cpos*8, 8);
        cpos += 1;
        switch(ctag){
            case EnigmaUploader.TAG_ENCWRAP:
                this.encWrapDetected = true;
                break;

            case EnigmaUploader.TAG_PADDING:
                tlen = w.extract32(this.cached.buff, cpos*8);
                cpos += EnigmaUploader.LENGTH_BYTES + tlen;
                break;

            case EnigmaUploader.TAG_SEC:
                tlen = w.extract32(this.cached.buff, cpos*8);
                cpos += EnigmaUploader.LENGTH_BYTES;
                if (this.encryptionInitialized){
                    throw new eb.exception.invalid("Sec block already seen");
                }

                var secBlock = w.bitSlice(this.cached.buff, cpos*8, (cpos+tlen)*8);
                cpos += tlen;

                if (w.bitLength(secBlock) != tlen*8){
                    throw new eb.exception.invalid("Sec block size does not match");
                }

                this.processSecCtx_(secBlock);
                break;

            default:
                tlen = w.extract32(this.cached.buff, cpos*8);
                cpos += EnigmaUploader.LENGTH_BYTES + tlen;
                log(sprintf("Unsupported tag detected: %s, len: %s", ctag, tlen));
                break;
        }

    } while(!this.encWrapDetected);

    // Throw an exception if ENCWRAP was not detected by the end of this call. Simple parser.
    if (!this.encWrapDetected){
        throw new eb.exception.invalid("ENCWRAP tag was not detected in the data. Parser does not support chunked data");
    }

    // Slice off the processed part of the buffer.
    if (cpos == this.cached.end){
        this.cached.offset = -1;
        this.cached.end = -1;
        this.cached.buff = [];

    } else {
        this.cached.offset = cpos;
        this.cached.buff = w.bitSlice(this.cached.buff, cpos*8);
    }
};

/**
 * Processing of the security context block;
 * @private
 */
EnigmaDownloader.prototype.processSecCtx_ = function(buffer){
    var cpos=0, w=sjcl.bitArray;
    var ln = w.bitLength(buffer)/8;
    if (ln < 16){
        throw new eb.exception.invalid("Input data buffer is in invalid state");
    }

    // Extract GCM IV.
    this.iv = w.bitSlice(buffer, 0, 16*8);
    cpos += 16;

    // Security context, contains decryption key, wrapped.
    this.secCtx = w.bitSlice(buffer, cpos*8);
    // TODO: call UO. parse secCtx.
    // TODO: remove debugging info.
    log(sprintf("IV: %s", eb.misc.inputToHex(this.iv)));
    log(sprintf("EK: %s", eb.misc.inputToHex(this.encKey)));

    // Initialize cipher, engines.
    this.aes = new sjcl.cipher.aes(this.encKey);    // AES cipher instance to be used with GCM for data encryption.
    this.gcm = new sjcl.mode.gcm2(this.aes, false, [], this.iv, 128); // GCM encryption mode, initialized now.
    this.encryptionInitialized = true;
};

/**
 * On downloaded data is processed.
 * @private
 */
EnigmaDownloader.prototype.bufferProcessed_ = function(){
    if (!this.downloaded){
        this.fetchFile_();
    }

    // TODO: implement if all processing is done (decryption).
    if (this.downloaded) {
        this.onComplete();
    }
};

/**
 * As the Google download URL does not provide CORS headers the download with
 * XMLHttpRequest fails due to same origin policy.
 *
 * GoogleApis with googleapis.com do support CORS headers but user needs to be logged in.
 * If we don't want to bother user with logging in we need another approach to get
 * to the file.
 *
 * Luckily, Google download URL returns 302 temporary redirect to the file
 * which supports CORS and Range headers. We can get this direct link using our
 * simple proxy-redir.php proxy file, which reads the redirect and provides it as a JSON.
 *
 * TODO: move to google drive downloader class.
 *
 * @private
 */
EnigmaDownloader.prototype.fetchProxyRedir_ = function() {
    var self = this;
    var xhr = new XMLHttpRequest();

    xhr.open("GET", this.proxyRedirUrl, true);
    xhr.onload = function(e) {
        if (e.target.status < 400) {
            var json = JSON.parse(xhr.responseText);
            console.log(json);

            if (!json.url){
                this.onDownloadError_(null);
                return;
            }

            // Proxy can fetch total size of the downloaded file.
            // This information is optional, does not affect download process. We are donloading until there is some data.
            // This is mainly for UX while downloading large files so user can see download progress.
            if (json.size && json.size > 0){
                this.totalSize = json.size;
            }

            this.url = json.url;
            this.fetchFile_();

        } else {
            this.onDownloadError_(e);
        }
    }.bind(this);
    xhr.onerror = this.onDownloadError_.bind(this);

    log(sprintf("Fetching direct link using redir proxy: %s", this.proxyRedirUrl));
    xhr.send(null);
};

/**
 * Resume download process which failed previously.
 *
 * @private
 */
EnigmaDownloader.prototype.resume_ = function() {
    log("Resume!");
    this.fetchFile_();
};

/**
 * Handles errors for chunk download. Either retries or aborts depending
 * on the error.
 *
 * @private
 * @param {object} e XHR event
 */
EnigmaDownloader.prototype.onContentDownloadError_ = function(e) {
    log("Chunk download error");
    if (e.target.status && e.target.status < 400) {
        this.onError(e.target.response);
    } else {
        this.retryHandler.retry(this.resume_.bind(this));
    }
};

/**
 * Handles errors for the initial request.
 *
 * @private
 * @param {object} e XHR event
 */
EnigmaDownloader.prototype.onDownloadError_ = function(e) {
    this.onError(e.target.response); // TODO - Retries for initial download
};

EnigmaDownloader.prototype.progressHandler_ = function(meta, evt){
    this.onProgress(evt, meta);
};
