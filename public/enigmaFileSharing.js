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
    this.metadata = options.metadata || {
            'name': this.fname,
            'mimeType': this.contentType
        };
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
    log("FileName in meta block: " + this.fname);
    var baName = sjcl.codec.utf8String.toBits(this.fname);
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
        assert(w.bitLength(this.cached.buff) == 8*(this.cached.end - this.cached.offset), "Invariant broken");
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
 * Construct a query string from a hash/object
 *
 * @private
 * @param {object} [params] Key/value pairs for query string
 * @return {string} query string
 */
EnigmaUploader.prototype.buildQuery_ = function(params) {
    params = params || {};
    return Object.keys(params).map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
};

/**
 * Build the drive upload URL
 *
 * @private
 * @param {string} [id] File ID if replacing
 * @param {object} [params] Query parameters
 * @return {string} URL
 */
EnigmaUploader.prototype.buildUrl_ = function(id, params, baseUrl) {
    var url = baseUrl || 'https://www.googleapis.com/upload/drive/v3/files/';
    if (id) {
        url += id;
    }
    var query = this.buildQuery_(params);
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