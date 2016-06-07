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
     * Takes maximally N characters from the string - length limit.
     * @param string
     * @param n
     */
    takeMaxN: function(string, n){
        return string === undefined ? undefined : ((string || {}).substring(0, n));
    },

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
    },

    /**
     * Generates communication keys from the input.
     * Used to generate 2x 256bit comm keys from lower entropy key - file sharing link is shorter.
     * @param input
     * @returns {{enc, mac}}
     */
    regenerateCommKeys: function(input){
        var w = sjcl.bitArray;
        var baInput = eb.misc.inputToBits(input);
        var baEnc = sjcl.hash.sha256.hash(w.concat(baInput, [0x01]));
        var baMac = sjcl.hash.sha256.hash(w.concat(baInput, [0x02]));
        return {enc:baEnc, mac:baMac};
    },

    /**
     *
     * Basic asynchronous operation.
     * May use setTimeout(fnc, 0) to implement the async nature or setImmediate(fnc) or postMessage.
     *
     * @param {Function} fnc
     */
    async: function(fnc){
        // Default implementation is simple.
        setTimeout(fnc, 0);
    },

    /**
     * Update hash function hash with hash.update(data).
     * For memory optimization purposes (potential memory leaks) it calls
     * update() on smaller chunks.
     *
     * @param {object|Array} hash
     * @param {Array|bitArray} data
     * @param {Object} [options]
     * @param {Number} [options.base] chunk size
     */
    updateHash: function(hash, data, options){
        hash = typeof hash[0] === 'undefined' ? [hash] : hash;
        options = options || {};

        var ln = data.length, base = options.base || 1024*64; // 256Kb (1024*64 4B words) is the basic chunk.
        var i = 0, hi = 0, hl = hash.length, curChunk;

        // Hash chunks.
        for(i = 0; i < ln; i += base){
            curChunk = data.slice(i, i+base);
            for(hi=0; hi<hl; ++hi){
                hash[hi].update(curChunk);
            }
        }
    },

    /**
     * Updates hash function with hash.update(data) in the async fashion.
     * Data is split to reasonably sized chunks so the processing of the chunk by the hash function
     * fits in 16ms to preserve 60 fps. Hashing function computation is added to the event queue.
     *
     * @param hash
     * @param data
     * @param onCompleted
     * @param {Object} [options]
     * @param {Number} [options.base] chunk size
     * @param {boolean} [options.async=true] set false to skip async processing.
     */
    updateHashAsync: function(hash, data, onCompleted, options){
        hash = typeof hash[0] === 'undefined' ? [hash] : hash;
        options = options || {};

        var ln = data.length, base = options.base || 1024*64; // 256Kb (1024*64 4B words) is the basic chunk.
        var i, hl = hash.length, curChunk;
        var isAsync = options.async === 'undefined' ? true : options.async;

        // Hash chunks.
        for(i = 0; i < ln; i += base){
            curChunk = data.slice(i, i+base);

            // Enqueue.
            if (isAsync) {
                eb.sh.misc.async((function (x) {
                    for (var hi = 0; hi < hl; ++hi) {
                        hash[hi].update(x);
                    }
                }).bind(this, curChunk));

            } else {
                for (var hi = 0; hi < hl; ++hi) {
                    hash[hi].update(curChunk);
                }
            }
        }
        data = [];

        //Enqueue onCompleted callback
        if (onCompleted) {
            eb.sh.misc.async(onCompleted);
        }
    },

    /**
     * Updates cipher mode with the given data. Data is split to reasonably sized chunks.
     * After one block is processed, onCompleted is called with 2 parameters. onCompleted(data, false).
     * On the last block is processed onCompleted is called: onCompleted([], true).
     *
     * @param prf
     * @param data
     * @param onCompleted
     * @param {Object} [options]
     * @param {Number} [options.base] chunk size
     * @param {boolean} [options.async=true] set false to skip async processing.
     */
    updateCipherAsync: function(prf, data, onCompleted, options){
        options = options || {};
        var ln = data.length, base = options.base || 1024*8; // 32Kb (1024*8 4B words) is the basic chunk.
        var i, curChunk;
        var isAsync = options.async === 'undefined' ? true : options.async;

        for(i = 0; i < ln; i += base){
            curChunk = data.slice(i, i+base);

            // Enqueue.
            if (isAsync) {
                eb.sh.misc.async((function (x) {
                    var res = prf.update(x);
                    onCompleted(res, false);
                }).bind(this, curChunk));

            } else {
                var res = prf.update(curChunk);
                onCompleted(res, false);
            }
        }
        data = [];

        //Enqueue onCompleted callback
        eb.sh.misc.async(function(){
            onCompleted([], true);
        });
    },

    /**
     * bitArray concatenation to the original array. Modifies a input.
     * @param {Array|bitArray} a source to be appended.
     * @param {Array|bitArray} b data to be appended to a.
     * @return {Array|bitArray} a
     */
    concatSelf: function(a, b){
        var w = sjcl.bitArray;
        if (a.length == 0){
            return b.slice(0);

        } else if (w.getPartial(a[a.length-1]) === 32){
            // Naive append to the a array, using the push() method.
            var i = 0, blen = b.length;
            for(; i < blen-128; ){
                a.push(b[i   ], b[i+1 ], b[i+2 ], b[i+3 ], b[i+4 ], b[i+5 ], b[i+6 ], b[i+7 ],
                       b[i+8 ], b[i+9 ], b[i+10], b[i+11], b[i+12], b[i+13], b[i+14], b[i+15],
                       b[i+16], b[i+17], b[i+18], b[i+19], b[i+20], b[i+21], b[i+22], b[i+23],
                       b[i+24], b[i+25], b[i+26], b[i+27], b[i+28], b[i+29], b[i+30], b[i+31]); i+= 32;
                a.push(b[i   ], b[i+1 ], b[i+2 ], b[i+3 ], b[i+4 ], b[i+5 ], b[i+6 ], b[i+7 ],
                       b[i+8 ], b[i+9 ], b[i+10], b[i+11], b[i+12], b[i+13], b[i+14], b[i+15],
                       b[i+16], b[i+17], b[i+18], b[i+19], b[i+20], b[i+21], b[i+22], b[i+23],
                       b[i+24], b[i+25], b[i+26], b[i+27], b[i+28], b[i+29], b[i+30], b[i+31]); i+= 32;
                a.push(b[i   ], b[i+1 ], b[i+2 ], b[i+3 ], b[i+4 ], b[i+5 ], b[i+6 ], b[i+7 ],
                       b[i+8 ], b[i+9 ], b[i+10], b[i+11], b[i+12], b[i+13], b[i+14], b[i+15],
                       b[i+16], b[i+17], b[i+18], b[i+19], b[i+20], b[i+21], b[i+22], b[i+23],
                       b[i+24], b[i+25], b[i+26], b[i+27], b[i+28], b[i+29], b[i+30], b[i+31]); i+= 32;
                a.push(b[i   ], b[i+1 ], b[i+2 ], b[i+3 ], b[i+4 ], b[i+5 ], b[i+6 ], b[i+7 ],
                       b[i+8 ], b[i+9 ], b[i+10], b[i+11], b[i+12], b[i+13], b[i+14], b[i+15],
                       b[i+16], b[i+17], b[i+18], b[i+19], b[i+20], b[i+21], b[i+22], b[i+23],
                       b[i+24], b[i+25], b[i+26], b[i+27], b[i+28], b[i+29], b[i+30], b[i+31]); i+= 32;

            }
            for(; i < blen-32; ){
                a.push(b[i  ], b[i+1], b[i+2 ], b[i+3 ], b[i+4 ], b[i+5 ], b[i+6 ], b[i+7 ]); i+= 8;
                a.push(b[i  ], b[i+1], b[i+2 ], b[i+3 ], b[i+4 ], b[i+5 ], b[i+6 ], b[i+7 ]); i+= 8;
                a.push(b[i  ], b[i+1], b[i+2 ], b[i+3 ], b[i+4 ], b[i+5 ], b[i+6 ], b[i+7 ]); i+= 8;
                a.push(b[i  ], b[i+1], b[i+2 ], b[i+3 ], b[i+4 ], b[i+5 ], b[i+6 ], b[i+7 ]); i+= 8;
            }
            for(; i < blen-8; ){
                a.push(b[i], b[i+1], b[i+2], b[i+3], b[i+4], b[i+5], b[i+6], b[i+7]); i+= 8;
            }
            for(; i < blen; i++){
                a.push(b[i]);
            }
            return a;

        } else {
            // Traditional concatenation.
            return w.concat(a, b);
        }
    }

};

/**
 * Incremental/streaming GCM mode.
 * http://csrc.nist.gov/groups/ST/toolkit/BCM/documents/proposedmodes/gcm/gcm-spec.pdf
 *
 * @param {Object} cipher The pseudorandom function.  It must have a block size of 16 bytes.
 * @param {boolean} encrypt mode of operation. true for encryption, false for decryption.
 * @param {bitArray} adata Data to include in authentication tag.
 * @param {bitArray} iv The initialization value.
 * @param {Number} [tlen=128] The desired tag length, in bits.
 */
/** @namespace Galois/Counter mode. */
sjcl.mode.gcmProgressive = {
    /** The name of the mode.
     * @constant
     */
    name: "gcmProgressive",

    /**
     * Creates a new GCM engine.
     *
     * @param {Object} prf The pseudo-random function. It must have a block size of 16 bytes.
     * @param {boolean} encrypt mode of operation. true for encryption, false for decryption.
     * @param {bitArray} iv The initialization vector.
     * @param {bitArray} adata Data to include in authentication tag.
     * @param {Number} [tlen=128] The desired tag length, in bits.
     * @returns {Object} encryption engine {update: function(data), finalize:function(data)}
     */
    create: function (prf, encrypt, iv, adata, tlen) {
        return new sjcl.mode.gcmProgressive.engine(prf, encrypt, iv, adata, tlen);
    },

    /**
     * Creates a new GCM engine for encryption.
     *
     * @param {Object} prf The pseudo-random function. It must have a block size of 16 bytes.
     * @param {bitArray} iv The initialization vector.
     * @param {bitArray} adata Data to include in authentication tag.
     * @param {Number} [tlen=128] The desired tag length, in bits.
     * @returns {Object} encryption engine {update: function(data), finalize:function(data)}
     */
    createEncryptor: function (prf, iv, adata, tlen) {
        return new sjcl.mode.gcmProgressive.engine(prf, true, iv, adata, tlen);
    },

    /**
     * Creates a new GCM engine for decryption.
     *
     * @param {Object} prf The pseudo-random function. It must have a block size of 16 bytes.
     * @param {bitArray} iv The initialization vector.
     * @param {bitArray} adata Data to include in authentication tag.
     * @param {Number} [tlen=128] The desired tag length, in bits.
     * @returns {Object} encryption engine {update: function(data), finalize:function(data)}
     */
    createDecryptor: function (prf, iv, adata, tlen) {
        return new sjcl.mode.gcmProgressive.engine(prf, false, iv, adata, tlen);
    },

    /**
     * Convenience function for encryption of the input data.
     *
     * @param {Object} prf The pseudo-random function. It must have a block size of 16 bytes.
     * @param {bitArray} data input data to encrypt
     * @param {bitArray} iv The initialization vector.
     * @param {bitArray} adata Data to include in authentication tag.
     * @param {Number} [tlen=128] The desired tag length, in bits.
     * @returns {bitArray} ciphertext + tag
     */
    encrypt: function (prf, data, iv, adata, tlen) {
        return (new sjcl.mode.gcmProgressive.engine(prf, true, iv, adata, tlen)).finalize(data);
    },

    /**
     * Convenience function for decryption of the input data.
     *
     * @param {Object} prf The pseudo-random function. It must have a block size of 16 bytes.
     * @param {bitArray} data input data to decrypt (with tag).
     * @param {bitArray} iv The initialization vector.
     * @param {bitArray} adata Data to include in authentication tag.
     * @param {Number} [tlen=128] The desired tag length, in bits.
     * @returns {bitArray} plaintext
     */
    decrypt: function (prf, data, iv, adata, tlen) {
        return (new sjcl.mode.gcmProgressive.engine(prf, false, iv, adata, tlen)).finalize(data);
    },

    /**
     * Incremental/streaming/progressive GCM mode.
     * http://csrc.nist.gov/groups/ST/toolkit/BCM/documents/proposedmodes/gcm/gcm-spec.pdf
     *
     * @param {Object} prf The pseudo-random function. It must have a block size of 16 bytes.
     * @param {boolean} encrypt mode of operation. true for encryption, false for decryption.
     * @param {bitArray} iv The initialization vector.
     * @param {bitArray} adata Data to include in authentication tag.
     * @param {Number} [tlen=128] The desired tag length, in bits.
     */
    engine: function (prf, encrypt, iv, adata, tlen) {
        this._gcmInitState(prf, encrypt, iv, adata || [], tlen || 128);
    }
};

sjcl.mode.gcmProgressive.engine.prototype = {
    _prf: undefined,     // pseudo random function (cipher).
    _enc: undefined,     // encryption/decryption flag.
    _H: undefined,       // H value used in tag computation, H = prf.encrypt(key, 0^{128}).
    _tlen: undefined,    // tag length in bits.
    _abl: undefined,     // authenticated data bit length, used for the final tag computation.
    _J0: undefined,      // initial counter value for the first block = used for the final tag computation.
    _ctr: undefined,     // current counter value.
    _tag: undefined,     // current tag value.
    _bl: undefined,      // total plaintext/ciphertext bitlength. Used in the final tag computation.
    _buff: undefined,    // buffer keeping streaming input, not processed yet, not multiple of a block size.
    _buffTag: undefined, // in decryption mode, buffer for potential tag in stream processing. Holds last tlen bits from the last update() block.
    _finalized: false,   // if mode was already finalized.

    /**
     * Incremental processing function.
     * Processes input data, returns output.
     * Output from the function is multiple of 16B, unprocessed data are stored in the internal state.
     * Note the function may return empty result = [].
     *
     * @param data
     * @returns {*|Array}
     */
    update: function (data) {
        return this._update(data, false);
    },
    process: function (data) {
        return this._update(data, false);
    },

    /**
     * Processes the last block (potentially empty) and produces the final output.
     *
     * @param data
     * @param {object} options
     * @param {boolean} [options.returnTag] if true function returns {tag: tag, data: data}.
     * @returns {bitArray | {tag: (bitArray), data: (bitArray)}}
     */
    finalize: function (data, options) {
        // Process final data, finalize tag computation & buffers.
        var last, enc, w = sjcl.bitArray;
        options = options || {};
        var returnTag = options && options.returnTag || false;
        var interm = this._update(data, true);

        // Calculate last tag block from bit lengths, ugly because bitwise operations are 32-bit
        last = [
            Math.floor(this._abl / 0x100000000), this._abl & 0xffffffff,  // adata bit length
            Math.floor(this._bl / 0x100000000), this._bl & 0xffffffff     // data bit length
        ];

        // Calculate the final tag block
        // Tag computation including bit lengths
        this._tag = this._ghash(this._H, this._tag, last);

        // XORing with the first counter value to obtain final auth tag.
        enc = this._prf.encrypt(this._J0);
        this._tag[0] ^= enc[0];
        this._tag[1] ^= enc[1];
        this._tag[2] ^= enc[2];
        this._tag[3] ^= enc[3];

        // Decryption -> check tag. If invalid -> throw exception.
        if (!this._enc && !w.equal(this._tag, this._buffTag)) {
            throw new sjcl.exception.corrupt("gcm: tag doesn't match");
        }

        if (returnTag) {
            return {tag: w.clamp(this._tag, this._tlen), data: interm};
        }

        return this._enc ? w.concat(interm || [], this._tag) : interm;
    },

    /**
     * Initializes the internal state state for streaming processing.
     *
     * @param encrypt
     * @param prf
     * @param adata
     * @param iv
     * @param tlen
     * @private
     */
    _gcmInitState: function (prf, encrypt, iv, adata, tlen) {
        var ivbl, S0, w = sjcl.bitArray;

        // Calculate data lengths
        this._enc = encrypt;
        this._prf = prf;
        this._tlen = tlen;
        this._abl = w.bitLength(adata);
        this._bl = 0;
        this._buff = [];
        this._buffTag = [];
        ivbl = w.bitLength(iv);

        // Calculate the parameters - H = E(K, 0^{128}), tag multiplier
        this._H = this._prf.encrypt([0, 0, 0, 0]);
        // IV size reflection to the J0 = counter
        if (ivbl === 96) {
            // J0 = IV || 0^{31}1
            this._J0 = iv.slice(0);
            this._J0 = w.concat(this._J0, [1]);
        } else {
            // J0 = GHASH(H, {}, IV)
            this._J0 = this._ghash(this._H, [0, 0, 0, 0], iv);
            // Last step of GHASH = (j0 + len(iv)) . H
            this._J0 = this._ghash(this._H, this._J0, [0, 0, Math.floor(ivbl / 0x100000000), ivbl & 0xffffffff]);
        }
        // Authenticated data hashing. Result will be XORed with first ciphertext block.
        S0 = this._ghash(this._H, [0, 0, 0, 0], adata);

        // Initialize ctr and tag
        this._ctr = this._J0.slice(0);
        this._tag = S0.slice(0);
    },

    /**
     * Internal update method. Processes input data in the given encryption mode.
     * Takes care of the internal state. In normal update mode (not finalizing), only a multiple
     * of a cipher block size is processed. Rest is kept in the state.
     *
     * Special care is taken in decryption, where last tlen bytes can be auth tag.
     *
     * When finalizing, no aligning is applied and whole state and input data is processed. Object should be called
     * only once with finalize=true.
     *
     * @param {Array} data
     * @param {boolean} finalize
     * @returns {Array}
     * @private
     */
    _update: function (data, finalize) {
        var enc, bl, i, l, inp = [], w = sjcl.bitArray;

        // Data to process = unprocessed buffer from the last update call + current data so
        // it gives multiple of a block size. Rest goes to the buffer.
        // In decryption case, keep last 16 bytes in the buffTag as it may be a potential auth tag that must not go
        // to decryption routine.
        // Add data from the previous update().
        inp = w.concat(inp, this._buff);
        this._buff = [];

        // Finalize only once - prevent programmers mistake.
        if (this._finalized && finalize) {
            throw new sjcl.exception.invalid("Cipher already finalized, cannot process new data, need to init a new cipher");
        }
        this._finalized |= finalize;

        // In case of a decryption, add also potential tag buffer - may not be the tag but the part of the ciphertext.
        if (!this._enc) {
            inp = w.concat(inp, this._buffTag);
            this._buffTag = [];
        }

        // Add all input data to the processing buffer inp.
        inp = w.concat(inp, data || []);
        bl = w.bitLength(inp);

        // In decryption case, move last tlen bits back to the buffTag as it may be a potential auth tag.
        if (!this._enc) {
            if (bl < this._tlen) {
                this._buffTag = inp;
                return [];
            }

            this._buffTag = w.bitSlice(inp, bl - this._tlen);
            inp = w.clamp(inp, bl - this._tlen);
            bl -= this._tlen;
        }

        // Move last bytes not aligned to 1 block (16B) size to buff. When finalizing, process everything.
        var blForNextTime = bl % 128;
        if (blForNextTime > 0 && !finalize) {
            this._buff = w.bitSlice(inp, bl - blForNextTime);
            inp = w.clamp(inp, bl - blForNextTime);
            bl -= blForNextTime;
        }

        // Sanity check.
        if (bl < 0) {
            throw new sjcl.exception.invalid("Invariant invalid - buffer underflow");
        } else if (bl == 0) {
            return [];
        }

        this._bl += bl;

        // In GCM ciphertext goes to the tag computation. In decryption mode, it is our input.
        if (!this._enc) {
            this._tag = this._ghash(this._H, this._tag, inp);
        }

        // Encrypt all the data
        // Last 32bits of the ctr is actual counter.
        for (i = 0, l = inp.length; i < l; i += 4) {
            this._ctr[3]++;
            enc = this._prf.encrypt(this._ctr);
            inp[i] ^= enc[0];
            inp[i + 1] ^= enc[1];
            inp[i + 2] ^= enc[2];
            inp[i + 3] ^= enc[3];
        }
        // Take the actual length of the original input (as in the Streaming mode).
        // Should be a multiple of a cipher block size - no effect on data, unless we are finalizing.
        inp = w.clamp(inp, bl);

        // In GCM ciphertext goes to the tag computation. In encryption mode, it is our output.
        if (this._enc) {
            this._tag = this._ghash(this._H, this._tag, inp);
        }

        return inp;
    },

    /* Compute the galois multiplication of X and Y
     * @private
     */
    _galoisMultiply: function (x, y) {
        var i, j, xi, Zi, Vi, lsb_Vi, w=sjcl.bitArray, xor=eb.misc.xor;

        Zi = [0,0,0,0];
        Vi = y.slice(0);

        // Block size is 128 bits, run 128 times to get Z_128
        for (i=0; i<128; i++) {
            xi = (x[Math.floor(i/32)] & (1 << (31-i%32))) !== 0;
            if (xi) {
                // Z_i+1 = Z_i ^ V_i
                Zi = xor(Zi, Vi);
            }

            // Store the value of LSB(V_i)
            lsb_Vi = (Vi[3] & 1) !== 0;

            // V_i+1 = V_i >> 1
            for (j=3; j>0; j--) {
                Vi[j] = (Vi[j] >>> 1) | ((Vi[j-1]&1) << 31);
            }
            Vi[0] = Vi[0] >>> 1;

            // If LSB(V_i) is 1, V_i+1 = (V_i >> 1) ^ R
            if (lsb_Vi) {
                Vi[0] = Vi[0] ^ (0xe1 << 24);
            }
        }
        return Zi;
    },

    _ghash: function(H, Y0, data) {
        var Yi, i, l = data.length;

        Yi = Y0.slice(0);
        for (i=0; i<l; i+=4) {
            Yi[0] ^= 0xffffffff&data[i];
            Yi[1] ^= 0xffffffff&data[i+1];
            Yi[2] ^= 0xffffffff&data[i+2];
            Yi[3] ^= 0xffffffff&data[i+3];
            Yi = this._galoisMultiply(Yi, H);
        }
        return Yi;
    },
};

/**
 * Helper for implementing retries with backoff. Initial retry
 * delay is 250ms, increasing by 2x (+jitter) for subsequent retries
 * @param {Object} [options]
 * @param {Number} [options.startInterval] start interval of the backoff. The initial value. Default 250ms.
 * @param {Number} [options.maxInterval] maximum waiting time, after reaching this point, backoff is not increased.
 * @param {Number} [options.maxAttempts] maximum number of attempts before failing. -1 by default = do not fail
 * @param {Number} [options.onFail] callback to call when maximum number of attempts was reached.
 * @constructor
 */
var RetryHandler = function(options) {
    var nop = function(){};
    options = options || {};
    this.startInterval = options.startInterval || 250; // Start at 250ms - quick retry
    this.interval      = this.startInterval;
    this.maxInterval = options.maxInterval || 60 * 1000; // Don't wait longer than a minute
    this.maxAttempts = options.maxAttempts || -1;
    this.onFail = options.onFail || nop;
    this.logger = options.logger || nop;
    this.curAttempts = 0;
    this.curTimer = undefined;  // current setTimeout timer value. For cancellation.
};

/**
 * Invoke the function after waiting
 *
 * @param {function} fn Function to invoke
 */
RetryHandler.prototype.retry = function(fn) {
    if (this.limitReached()){
        this.logger("Retry: max number reached");
        this.onFail(this);
        return;
    }

    var curInterval = this.interval;
    this.curTimer = setTimeout(fn, curInterval);
    this.logger("Retry: next attempt in: " + curInterval);

    this.interval = this.nextInterval_();
    this.curAttempts += 1;
    return curInterval;
};

/**
 * Cancels currently waiting back-off.
 */
RetryHandler.prototype.cancel = function() {
    if (this.curTimer) {
        clearTimeout(this.curTimer);
        this.curTimer = undefined;
    }
};

/**
 * Reset the counter (e.g. after successful request.)
 */
RetryHandler.prototype.reset = function() {
    this.cancel();
    this.interval = this.startInterval;
    this.curAttempts = 0;
};

/**
 * Returns number of attempts.
 * @returns {number}
 */
RetryHandler.prototype.numAttempts = function(){
    return this.curAttempts;
};

/**
 * Returns true if the limit on maximum number of attempts was reached.
 * @returns {boolean}
 */
RetryHandler.prototype.limitReached = function(){
    return this.maxAttempts >= 0 && this.maxAttempts <= this.curAttempts;
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
    this.name = "";
    this.decorators = []; // array of functions updated with the content as it is read.
};
DataSource.prototype = {
    read: function(offsetStart, offsetEnd, handler){
        throw new eb.exception.invalid("Acessing abstract method");
    },
    length: function(){
        throw new eb.exception.invalid("Acessing abstract method");
    },
    updateDecorators: function(offsetStart, offsetEnd, ba){
        for (var index = 0, ln=this.decorators.length; index < ln; ++index) {
            this.decorators[index](offsetStart, offsetEnd, ba);
        }
    }
};

/**
 * Data source with blob. Can be a static blob or a file.
 * Data is read with FileReader.
 * @param blob
 * @param {Object} [options]
 * @constructor
 */
var BlobDataSource = function(blob, options){
    this.blob = blob;
    this.reader = new FileReader();

    options = options || {};
    this.name = options.name || "";
};

/**
 * Constant data source.
 * @param {bitArray} data
 * @param {Object} [options]
 * @constructor
 */
var ConstDataSource = function(data, options){
    this.data = data;

    options = options || {};
    this.name = options.name || "";
};

/**
 * Data source wrapping a generator.
 * @param generator
 * @param length
 * @param {Object} [options]
 * @constructor
 */
var WrappedDataSource = function(generator, length, options){
    this.generator = generator;
    this.len = length;

    options = options || {};
    this.name = options.name || "";
};

/**
 * Data source wrapping another data source, hashing its unique content.
 * If underlying source is read sequentially, this data source hashes it correctly. Otherwise there will be gaps
 * and only the read portions will be hashed.
 * In future, can be implemented as a decorator.
 *
 * @param {DataSource} dataSource underlying datasource
 * @param {Function} hashingFnc hashing function. bitArray to hash update is provided as an argument.
 * @param {Object} [options]
 * @constructor
 */
var HashingDataSource = function(dataSource, hashingFnc, options){
    this.ds = dataSource;
    this.dsLen = dataSource.length();
    this.hasher = hashingFnc;
    this.seenOffsetStart = -1;
    this.seenOffsetEnd = -1;
    this.gaps = false;

    options = options || {};
    this.name = options.name || "";
};

/**
 * Data source combining multiple different data sources to one.
 * @param sources array of data sources.
 * @param {Object} [options]
 * @constructor
 */
var MergedDataSource = function(sources, options){
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

    options = options || {};
    this.name = options.name || "";
};
BlobDataSource.inheritsFrom(DataSource, {
    read: function(offsetStart, offsetEnd, handler){
        var content = this.blob.slice(offsetStart, offsetEnd);

        // Event handler called when data is loaded from the blob/file.
        var onReaderDataLoadedFnc = function(evt) {
            if (evt.target.readyState != FileReader.DONE) { // DONE == 2
                log("State not done");
                return;
            }

            var data = evt.target.result;
            var ba = sjcl.codec.arrayBuffer.toBits(data);

            this.updateDecorators(offsetStart, offsetEnd, ba);
            handler(ba);
        };

        // Initiate file/blob read.
        this.reader.onloadend = onReaderDataLoadedFnc.bind(this);
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

        var data = w.bitSlice(this.data, cStart, cEnd);
        this.updateDecorators(offsetStart, offsetEnd, data);
        handler(data);
    },
    length: function(){
        return sjcl.bitArray.bitLength(this.data)/8;
    }
});
WrappedDataSource.inheritsFrom(DataSource, {
    read: function(offsetStart, offsetEnd, handler){
        this.generator(offsetStart, offsetEnd, (function(x){
            this.updateDecorators(offsetStart, offsetEnd, x);
            handler(x);
        }).bind(this));
    },
    length: function(){
        return this.len;
    }
});
MergedDataSource.inheritsFrom(DataSource, {
    read: function(offsetStart, offsetEnd, handler){
        var res = [];
        var cOffsetStart, cOffsetEnd, desiredLen = offsetEnd-offsetStart;
        var offsetStartOrig = offsetStart, offsetEndOrig = offsetEnd;

        // Callback called when reading of the particular data source has been finished.
        var onReadFinished = function(x){
            var w = sjcl.bitArray;
            var bl = w.bitLength(x);
            if (cOffsetEnd-cOffsetStart != bl/8){
                throw new eb.exception.invalid("Read invalid number of bytes!");
            }

            // Append current data to the result.
            res = eb.sh.misc.concatSelf(res, x);
            offsetStart+=bl/8;

            // Everything read?
            if (offsetStart>=offsetEnd){
                if (w.bitLength(res)/8 != desiredLen){
                    throw new eb.exception.invalid("Reading returned invalid number of bytes from sub data sources in \"" + this.name + "\"");
                }

                this.updateDecorators(offsetStartOrig, offsetEndOrig, res);
                handler(res);
                res=[]; // Explicit memory cleaning on finish.
                return;
            }

            // Start next load.
            (startReadAsync.bind(this))(offsetStart, offsetEnd);
        };

        var startReadAsync = function(ofStart, ofEnd){
            var i, cShift, cLen = 0, sl = this.sources.length;
            for(i=0, cShift = 0; i<sl; i++){
                // Offset starts on the next streams - skip previous ones.
                if (ofStart >= this.incLenList[i+1]){
                    if (i+1 == sl){
                        throw new eb.exception.invalid(sprintf("Underflow in \"%s\", %s - %s, ln: %s", this.name, ofStart, ofEnd, this.incLenList[i+1]));
                    }
                    continue;
                }

                cShift += this.incLenList[i];
                cLen = this.sources[i].length();
                cOffsetStart = ofStart-cShift;
                cOffsetEnd = Math.min(cLen, ofEnd-cShift);

                this.sources[i].read(cOffsetStart, cOffsetEnd, onReadFinished.bind(this));

                // Break iteration, wait for handler to return data.
                break;
            }
        };

        // Initial kickoff.
        (startReadAsync.bind(this))(offsetStart, offsetEnd);
    },
    length: function(){
        return this.len;
    }
});
HashingDataSource.inheritsFrom(DataSource, {
    read: function(offsetStart, offsetEnd, handler){
        this.ds.read(offsetStart, offsetEnd, (function(ba){
            var w = sjcl.bitArray, len = w.bitLength(ba)/8, realEnd = offsetStart + len;

            this.gaps |= this.seenOffsetStart != -1 && this.seenOffsetStart > offsetStart;
            this.gaps |= this.seenOffsetStart != -1 && this.seenOffsetStart > realEnd;
            this.gaps |= this.seenOffsetEnd != -1 && this.seenOffsetEnd < offsetStart;

            var offsetStartNow = Math.max(this.seenOffsetEnd, offsetStart);
            var offsetEndNow = Math.max(this.seenOffsetEnd, realEnd);

            // Call hasher only if there is something new.
            if (offsetEndNow > offsetStartNow
                && this.seenOffsetEnd < offsetEndNow)
            {
                var tmpOffsetToHash = (offsetStartNow - offsetStart);
                var tmpOffsetToHashEnd = (len - offsetEndNow + realEnd);
                var toHash = (tmpOffsetToHash==0 && tmpOffsetToHashEnd==len) ? ba : w.bitSlice(ba, tmpOffsetToHash*8, tmpOffsetToHashEnd*8);
                this.hasher(offsetStartNow, offsetEndNow, this.dsLen, toHash);
                toHash = []; // Drop allocation before calling handler.

                this.seenOffsetEnd = offsetEndNow;
                if (this.seenOffsetStart == -1){
                    this.seenOffsetStart = offsetStartNow;
                }
            }

            handler(ba);
        }).bind(this));
    },
    length: function(){
        return this.dsLen;
    }
});

/**
 * Crypto sharing scheme protecting file sharing.
 * Ued for building & parsing security context of the files.
 * First version of share scheme, simple building & parsing.
 *
 * VERSION-1B | TAGV1-1B | PasswordSet-1B | lkeySalt-16B | pkeySalt-16B | phSalt-16B | e1Iv-16B | pkeyIter-4B | lkeyIter-4B | e1-32B
 *
 * @param options
 * @constructor
 */
var EnigmaShareScheme = function(options){
    var nop = function() {};
    this.lnonce = options.lnonce;  // 128bit of entropy stored in the link. Not available to EB.
    this.lkeySalt = undefined;     // 256bit of entropy for lkey salt (stored in encrypted file).
    this.pkeySalt = undefined;     // 256bit of entropy for pkey salt (stored in encrypted file).
    this.e1Iv = undefined;         // 128bit IV for E_1 computation.
    this.phSalt = undefined;       // 128bit of entropy for password verification (stored in encrypted file).
    this.passwordSet = false;      // flag indicating whether the password was used or not.
    this.logger = options.logger || nop; // logger to be used.
    this.retryHandler = new RetryHandler($.extend({maxAttempts: 10}, options.retry || {}));

    // Event handlers.
    this.onError = options.onError || nop;
    this.onComplete = options.onComplete || nop;
    this.onRetry = options.onRetry || nop;
    this.onPasswordNeeded = options.onPasswordNeeded || nop;
    this.onPasswordFail = options.onPasswordFail || nop;
    this.onPasswordOK = options.onPasswordOK || nop;

    // To be computed.
    this.secCtx = undefined;    // security context to be generated / parsed.
    this.fKey = undefined;      // master key to be computed.
    this.pKey = undefined;      // pkey, 32B key derived from password.
    this.lKey = undefined;      // lkey, 32B key derived from link nonce.
    this.e1 = undefined;        // e1 encryption block.

    // EB options.
    this.ebOptions = options.eb;
};

EnigmaShareScheme.VERSION = 1;
EnigmaShareScheme.TAG_V1 = 1;

EnigmaShareScheme.ITERATIONS_PKEY = 0; // 0 means no PBKDF2, just simple sha256.
EnigmaShareScheme.ITERATIONS_LKEY = 0; // 0 means no PBKDF2, just simple sha256.
EnigmaShareScheme.OUTPUTLEN = 32;      // To match AES key block size.

/**
 * Builds a secure context block from the parameters.
 * @param {string} password UTF-8 password
 * @param [onBuildFinishedCb] callback to be called when building is finished. Otherwise onComplete is called.
 * @return {bitArray} secure context block.
 */
EnigmaShareScheme.prototype.build = function(password, onBuildFinishedCb){
    // Init data.
    var w = sjcl.bitArray;
    this.lnonce = sjcl.random.randomWords(4);
    this.lkeySalt = sjcl.random.randomWords(8);
    this.pkeySalt = sjcl.random.randomWords(8);
    this.phSalt = sjcl.random.randomWords(4);
    this.e1Iv = sjcl.random.randomWords(4);
    this.fKey = sjcl.random.randomWords(8);
    this.onComplete = onBuildFinishedCb || this.onComplete;

    // Derive lKey
    this.lKey = this.derive_(this.lnonce, 0, this.lkeySalt, EnigmaShareScheme.ITERATIONS_LKEY, EnigmaShareScheme.OUTPUTLEN);

    // Derive pKey
    this.passwordSet = password !== undefined && password.length > 0;
    var passwordInput = this.passwordSet ? sjcl.codec.utf8String.toBits(password) : [0];
    this.pKey = this.derive_(w.concat(this.lnonce, passwordInput), 0, this.pkeySalt, EnigmaShareScheme.ITERATIONS_PKEY, EnigmaShareScheme.OUTPUTLEN);

    // Plainsec block = phSalt || (lKey + fKey)
    var plainSecBlock = w.concat(this.phSalt, eb.misc.xor8(this.lKey, this.fKey));

    // Call EB to compute E2, for now it is mocked with static key encryption.
    var onEbOpSuccess = (function(data){
        var e2 = data.data;
        if (w.bitLength(e2) != w.bitLength(plainSecBlock)){
            throw new eb.exception.invalid("Returned encrypted block has invalid length");
        }

        // Compute e1 block.
        var aes = new sjcl.cipher.aes(eb.misc.inputToBits(this.pKey));
        this.e1 = sjcl.mode.cbc.encrypt(aes, e2, this.e1Iv, [], true);

        // Build final block & signalize completion.
        this.buildBlock_(this.e1);
        this.onComplete({data:data, scheme:this});
    }).bind(this);

    var onEbOpFailure = (function(data){
        this.onError({'reason':'retry attempts limit reached', data: data, scheme: this});
    }).bind(this);

    // Call EB operation.
    this.ebOpWithRetry_(plainSecBlock, true, this.ebOptions, onEbOpSuccess.bind(this), onEbOpFailure.bind(this));
};

/**
 * Processes (parses) secCtx object.
 * If password is required, callback is called.
 * In case of a parsing error, exception is thrown.
 *
 * @param secCtx
 */
EnigmaShareScheme.prototype.process = function(secCtx){
    var cpos = 0, pkeyIter, lkeyIter, w = sjcl.bitArray;
    this.secCtx = secCtx || this.secCtx;

    // Parse the context.
    if (w.extract(secCtx, cpos*8, 8) != EnigmaShareScheme.VERSION){
        throw new eb.exception.invalid("Unsupported version");
    }
    cpos += 1;

    if (w.extract(secCtx, cpos*8, 8) != EnigmaShareScheme.TAG_V1){
        throw new eb.exception.invalid("V1 tag is missing");
    }
    cpos += 1;

    this.passwordSet = w.extract(secCtx, cpos*8, 8);
    cpos += 1;

    this.lkeySalt = w.bitSlice(secCtx, cpos*8, (cpos+32)*8);
    cpos += 32;

    this.pkeySalt = w.bitSlice(secCtx, cpos*8, (cpos+32)*8);
    cpos += 32;

    this.phSalt = w.bitSlice(secCtx, cpos*8, (cpos+16)*8);
    cpos += 16;

    this.e1Iv = w.bitSlice(secCtx, cpos*8, (cpos+16)*8);
    cpos += 16;

    pkeyIter = w.extract32(secCtx, cpos*8);
    cpos += 4;

    lkeyIter = w.extract32(secCtx, cpos*8);
    cpos += 4;

    if (pkeyIter != EnigmaShareScheme.ITERATIONS_PKEY || lkeyIter != EnigmaShareScheme.ITERATIONS_LKEY){
        throw new eb.exception.invalid("Number of iterations not supported");
    }

    this.e1 = w.bitSlice(secCtx, cpos*8);

    if (w.bitLength(this.lkeySalt) != 256
        || w.bitLength(this.pkeySalt) != 256
        || w.bitLength(this.phSalt) != 128
        || w.bitLength(this.e1Iv) != 128
    ) {
        throw new eb.exception.invalid("Invalid element sizes in secCtx");
    }

    // If password protection is set, call password provide callback.
    if (this.passwordSet){
        this.onPasswordNeeded({});
        return;
    }

    this.tryDecrypt_();
};

/**
 * Called when password was required, entered by user and provided for processing.
 * Function can be called only if onPasswordNeeded callback was signaled.
 * @param password
 */
EnigmaShareScheme.prototype.passwordProvided = function(password){
    this.tryDecrypt_(password);
};

EnigmaShareScheme.prototype.tryDecrypt_ = function(password){
    var w = sjcl.bitArray;

    // Derive lkey
    this.lKey = this.derive_(this.lnonce, 0, this.lkeySalt, EnigmaShareScheme.ITERATIONS_LKEY, EnigmaShareScheme.OUTPUTLEN);

    // Derive pkey
    var passwordInput = this.passwordSet ? sjcl.codec.utf8String.toBits(password) : [0];
    this.pKey = this.derive_(w.concat(this.lnonce, passwordInput), 0, this.pkeySalt, EnigmaShareScheme.ITERATIONS_PKEY, EnigmaShareScheme.OUTPUTLEN);

    // Compute e2
    var aes = new sjcl.cipher.aes(eb.misc.inputToBits(this.pKey));
    var e2 = sjcl.mode.cbc.decrypt(aes, this.e1, this.e1Iv, [], true);

    // EB function to call
    var ebOpFnc = undefined;

    // Call EB decryption on e2.
    var onEbOpSuccess = (function(data){
        var plainSecBlock = data.data;
        var phSaltPrime = w.bitSlice(plainSecBlock, 0, 128);

        // Test password correctness
        if (!w.equal(phSaltPrime, this.phSalt)){
            // Password is invalid.
            this.onPasswordFail({data:data, scheme:this});
            return;
        }

        // Compute fKey.
        this.fKey = eb.misc.xor8(w.bitSlice(plainSecBlock, 128), this.lKey);

        // Completed!
        this.onPasswordOK({});
        this.onComplete({data:data, scheme:this});
    }).bind(this);

    var onEbOpFailure = (function(data){
        this.onError({'reason':'retry attempts limit reached', data: data, scheme:this});
    }).bind(this);

    // Call EB operation.
    this.ebOpWithRetry_(e2, false, this.ebOptions, onEbOpSuccess.bind(this), onEbOpFailure.bind(this));
};

/**
 * Builds final secCtx block
 *
 * @param e1
 * @private
 */
EnigmaShareScheme.prototype.buildBlock_ = function(e1){
    var w = sjcl.bitArray;
    var ba = [];
    ba = w.concat(ba, eb.misc.numberToBits(EnigmaShareScheme.VERSION, 8));
    ba = w.concat(ba, eb.misc.numberToBits(EnigmaShareScheme.TAG_V1,  8));
    ba = w.concat(ba, eb.misc.numberToBits(this.passwordSet ? 1 : 0,  8));
    ba = w.concat(ba, eb.misc.inputToBits(this.lkeySalt));
    ba = w.concat(ba, eb.misc.inputToBits(this.pkeySalt));
    ba = w.concat(ba, eb.misc.inputToBits(this.phSalt));
    ba = w.concat(ba, eb.misc.inputToBits(this.e1Iv));
    ba = w.concat(ba, eb.misc.numberToBits(EnigmaShareScheme.ITERATIONS_PKEY, 32));
    ba = w.concat(ba, eb.misc.numberToBits(EnigmaShareScheme.ITERATIONS_LKEY, 32));
    ba = w.concat(ba, eb.misc.inputToBits(e1));

    this.secCtx = ba;
    return ba;
};

/**
 * Cancels enqueued backoff.
 */
EnigmaShareScheme.prototype.cancel = function(){
    this.retryHandler.cancel();
};

/**
 * Performing EB encryption operation on the input.
 * @param input
 * @param encrypt
 * @param ebOptions
 * @param onSuccess
 * @param onFailure
 * @private
 */
EnigmaShareScheme.prototype.ebOpWithRetry_ = function(input, encrypt, ebOptions, onSuccess, onFailure){
    // EB function to call
    var ebOpFnc = undefined;

    // Success handler - reset retry handler, call success CB.
    var onEbOpSuccess = (function(data){
        this.retryHandler.reset();
        onSuccess(data);
    }).bind(this);

    // Failure handler - try to retry if limit is not reached.
    var onEbOpFailure = (function(data){
        if (this.retryHandler.limitReached()){
            this.logger("EB failure - limit reached");
            onFailure($.extend(data, {retry:{'reason':'retry attempts limit reached'}}));
            return;
        }

        var interval = this.retryHandler.retry(ebOpFnc.bind(this));
        this.onRetry({'interval': interval, 'scheme':this});
        this.logger("EB failure, next attempt: " + interval + " ms");
    }).bind(this);

    // Call EB operation.
    ebOpFnc = (function(){
        this.ebOp_(input, encrypt, ebOptions, onEbOpSuccess.bind(this), onEbOpFailure.bind(this));
    }).bind(this);

    this.retryHandler.reset();
    ebOpFnc();
};

/**
 * Performing EB encryption operation on the input.
 * @param input
 * @param encrypt
 * @param ebOptions
 * @param onSuccess
 * @param onFailure
 * @private
 */
EnigmaShareScheme.prototype.ebOp_ = function(input, encrypt, ebOptions, onSuccess, onFailure){
    var defaultConfig = {
        remoteEndpoint: "site1.enigmabridge.com",
        remotePort: 11180,
        requestMethod: eb.comm.REQ_METHOD_POST,
        requestScheme: "https",
        requestTimeout: 30000,
        debuggingLog: true,
        apiKey: "API_TEST",
        callRequestType: "PLAINAES",
        aesKey: undefined,
        macKey: undefined,
        apiKeyLow4Bytes: undefined,
        userObjectId : undefined
    };
    defaultConfig = $.extend(defaultConfig, ebOptions);

    // Create a new request
    var request = new eb.comm.processData();
    request.configure(defaultConfig);
    request.logger = this.logger;

    // On EB call fail.
    var onEBFail = (function(data){
        this.logger("EB call failed");
        onFailure({data: data});
    }).bind(this);

    // On EB call success.
    var onEBSuccess = (function(response, data){
        var responseStatus = response.statusCode;
        this.logger(sprintf("EB call finished! Status: %04X", responseStatus));
        if (responseStatus != eb.comm.status.SW_STAT_OK || response.protectedData === undefined) {
            // Critical error?
            onEBFail(data);
            return;
        }

        //// TODO: remove failed attempts.
        //if(this.retryHandler.numAttempts() < 1){
        //    onEBFail(data);
        //    return;
        //}

        onSuccess({data:response.protectedData});
    }).bind(this);

    // Request callbacks.
    request.done((function(response, requestObj, data) {
        (onEBSuccess.bind(this))(response, data);

    }).bind(this)).fail((function(failType, data){
        this.logger("fail! type=" + failType);
        if (failType == eb.comm.status.PDATA_FAIL_RESPONSE_FAILED){
            (onEBSuccess.bind(this))(data.response); // application level failure.

        } else if (failType == eb.comm.status.PDATA_FAIL_CONNECTION){
            (onEBFail.bind(this))(data);
        }

    }).bind(this)).always((function(request, data){

    }).bind(this));

    // Build the request so we can display request in the form.
    request.build([], input);

    // Submit request.
    this.logger("Calling EB for SecCtx");
    request.doRequest();

    // Old mocking code. Local computation.
    //var aes = new sjcl.cipher.aes(eb.misc.inputToBits("11223344556677889900aabbccddeeff"));
    //var iv = [0, 0, 0, 0];
    //var encOp = encrypt ? sjcl.mode.cbc.encrypt : sjcl.mode.cbc.decrypt;
    //var processedData = encOp(aes, input, iv, [], true);
    //onSuccess({data:processedData});
};

/**
 * Derivation function to derive secret keys from the input.
 * For now we do not use PBKDF2, iterations and outputLen are ignored.
 *
 * @param input
 * @param [extra] extra differentiator, for deriving multiple outputs with same input & salt.
 * @param salt
 * @param iterations
 * @param outputLen
 * @private
 */
EnigmaShareScheme.prototype.derive_ = function(input, extra, salt, iterations, outputLen){
    var sha256 = sjcl.hash.sha256.hash, xor8=eb.misc.xor8;
    var extraHbits = sha256(eb.misc.inputToBits(extra || [0]));
    var inputHbits = sha256(eb.misc.inputToBits(input));
    var saltHbits  = sha256(eb.misc.inputToBits(salt));
    return sha256(xor8(sha256(xor8(extraHbits, inputHbits)), saltHbits));
};

/**
 * CRC32 computation.
 */
var CRC32;
(function (factory) {
    if(typeof DO_NOT_EXPORT_CRC === 'undefined') {
        if('object' === typeof exports) {
            factory(exports);
        } else if ('function' === typeof define && define.amd) {
            define(function () {
                var module = {};
                factory(module);
                return module;
            });
        } else {
            factory(CRC32 = {});
        }
    } else {
        factory(CRC32 = {});
    }
}(function(CRC32)
{
    CRC32.version = '0.4.0';
    /* see perf/crc32table.js */
    function signed_crc_table() {
        var c = 0, table = new Array(256);

        for(var n =0; n != 256; ++n){
            c = n;
            c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            table[n] = c;
        }

        return typeof Int32Array !== 'undefined' ? new Int32Array(table) : table;
    }

    var table = signed_crc_table();

    function crc32_ba_partial(ba, crc, finalize){
        ba = ba || [];
        crc = crc || -1;

        var w = sjcl.bitArray, ln = w.bitLength(ba)/8, i, arLen = ba.length;

        // Compute on full words (4B) as it is faster. Up to the last element which may be incomplete word.
        for(i = 0; i < arLen - 1; i++){
            crc = (crc >>> 8) ^ table[(crc^(  ba[i]         & 0xFF ))&0xFF];
            crc = (crc >>> 8) ^ table[(crc^( (ba[i] >>>  8) & 0xFF ))&0xFF];
            crc = (crc >>> 8) ^ table[(crc^( (ba[i] >>> 16) & 0xFF ))&0xFF];
            crc = (crc >>> 8) ^ table[(crc^( (ba[i] >>> 24) & 0xFF ))&0xFF];
        }

        // Finish the last, possibly incomplete block. Max 4 iterations.
        for(i = (arLen-1) * 4; i < ln; ++i) {
            crc = (crc >>> 8) ^ table[(crc^( w.extract(ba, 8*i, 8) ))&0xFF];
        }
        return finalize ? (crc ^ -1) : crc;
    }

    function crc32_ba(ba){
        return crc32_ba_partial(ba, -1, true);
    }

    CRC32.table = table;
    CRC32.ba = crc32_ba;
    CRC32.ba_part = crc32_ba_partial;
    CRC32.engine = function(){
        this.crc = -1;
    };
    CRC32.engine.prototype.update = function(ba){
        this.crc = crc32_ba_partial(ba, this.crc);
    };
    CRC32.engine.prototype.finalize = function(ba){
        if (ba) this.crc = crc32_ba_partial(ba, this.crc);
        var res = this.crc ^ -1;
        this.crc = -1;
        return res;
    };
    CRC32.getInstance = function() {
        return new CRC32.engine();
    }
}));

/**
 * PNG file parser & builer.
 * Enabled to add new chunks to the existing PNG file - for hiding EB data in it.
 * It is better for user to see data is protected than file with random noise.
 *
 * @param {object} [options]
 * @param {String} [options.png] Base64 encoded PNG to process.
 * @type {{}}
 */
eb.sh.png = function(options){
    options = options || {};
    this.png = options.png ? sjcl.codec.base64.toBits(options.png) : []; // base64 encoded.
    this.pngLen = sjcl.bitArray.bitLength(this.png)/8;

    this.chunks = {};
    this.pngHead = [];  // header + IHDR
    this.pngData = [];  // PNG data before IEND
    this.pngTrail = []; // IEND
    this.pngHeadChunks = []; // PNG chunks to place after IHDR
    this.pngTailChunks = []; // PNG chunks to place before IEND

    this.crc32Engine = undefined; // CRC32 engine for UMPH data.
    this.crc32Val = undefined;    // CRC32 value computed for UMPH data.
    this.parsePng();
};
eb.sh.png.prototype = {
    genTag: function(str){
        return sjcl.bitArray.extract32(sjcl.codec.utf8String.toBits(str), 0);
    },

    parsePng: function(){
        var w = sjcl.bitArray;
        var pos = 8; // length of the standard PNG header.
        var tag, length, data, chunk, crc, tagStart;
        this.chunks = {hdr:undefined, end:undefined, idat:undefined};
        if (this.pngLen == 0){
            return;
        }

        for(;pos < this.pngLen;){
            tagStart = pos;
            length = w.extract32(this.png, pos*8); pos+=4;
            tag = w.extract32(this.png, pos*8); pos+=4;
            data = w.bitSlice(this.png, pos*8, (pos+length)*8); pos+=length;
            crc = w.extract32(this.png, pos*8); pos+=4;
            chunk = {tag:tag, len: length, crc:crc, data:data, offset:tagStart, offsetEnd: tagStart+4+4+4+length};

            switch(tag){
                case this.genTag("IHDR"):
                    this.chunks.hdr = chunk;
                    break;
                case this.genTag("IDAT"):
                    if (this.chunks.idat === undefined) {
                        this.chunks.idat = chunk;
                    }
                    break;
                case this.genTag("IEND"):
                    this.chunks.end = chunk;
                    break;
                default:
                    break;
            }
        }

        this.pngHead = w.clamp(this.png, this.chunks.idat.offset*8);
        this.pngData = w.bitSlice(this.png, this.chunks.idat.offset*8, this.chunks.end.offset*8);
        this.pngTrail = w.bitSlice(this.png, this.chunks.end.offset*8);
    },

    crc32: function(ba, tag){
        var crc;
        if (tag){
            crc = CRC32.ba_part(tag);
        }

        return [CRC32.ba_part(ba, crc, true)];
    },

    createChunk: function(tag, data2add, crc){
        var w = sjcl.bitArray;
        var ba = [(w.bitLength(data2add)/8)|0, tag|0];
        ba = w.concat(ba, data2add);

        // CRC32
        var crc2put = crc || this.crc32(data2add, tag);
        ba = w.concat(ba, crc2put);
        return ba;
    },

    createTxtChunk: function(keyword, str){
        var w = sjcl.bitArray;
        var data2add = [];
        data2add = w.concat(data2add, sjcl.codec.utf8String.toBits(keyword));
        data2add = w.concat(data2add, eb.misc.getZeroBits(8*5));
        data2add = w.concat(data2add, sjcl.codec.utf8String.toBits(str));

        var ba = [(w.bitLength(data2add)/8)|0, (this.genTag("iTXt"))|0];
        ba = w.concat(ba, data2add);

        // CRC32
        var crc2put = this.crc32(data2add, this.genTag("iTXt"));
        ba = w.concat(ba, crc2put);
        return ba;
    },

    addHeaderTxtChunk: function(keyword, str){
        var tag = this.createTxtChunk(keyword, str);
        this.pngHeadChunks.push(tag);
    },

    createPaddingChunk: function(size){
        return this.createChunk(this.genTag("umPp"), eb.misc.getZeroBits(size*8));
    },

    addTrailUmphChunk: function(data){
        var tag = this.createChunk(this.genTag("umPh"), data);
        this.pngTailChunks.push(tag);
    },

    buildPngHead: function(){
        var w = sjcl.bitArray, i, ln;
        var ba = [];
        ba = w.concat(ba, this.pngHead);

        // head chunks
        for(i=0, ln = this.pngHeadChunks.length; i<ln; i++){
            ba = w.concat(ba, this.pngHeadChunks[i]);
        }

        // png data
        ba = w.concat(ba, this.pngData);
        return ba;
    },

    build: function(){
        var w = sjcl.bitArray, i, ln;
        var ba = this.buildPngHead();

        // png tailing chunks
        for(i=0, ln = this.pngTailChunks.length; i<ln; i++){
            ba = w.concat(ba, this.pngTailChunks[i]);
        }

        // png trailing
        ba = w.concat(ba, this.pngTrail);
        return ba;
    },

    buildUmphCrcEngine: function(){
        var crc = CRC32.getInstance();
        crc.update(this.genTag("umPh"));
        return crc;
    },

    getUmphWrappingDataSource: function(umphDataSource){
        var w = sjcl.bitArray, i, ln, trailData = [];
        this.crc32Engine = this.buildUmphCrcEngine();
        var finalDataSources = [];

        // PNG head, until UMPH tag (exclusive).
        var pngHead = this.buildPngHead();
        var pngHeadDs = new ConstDataSource(pngHead, {name: 'pngHdr'});

        // UMPH tag + length
        var umphHdrDs = new ConstDataSource( [(umphDataSource.length())|0, this.genTag("umPh")|0], {name: 'pngUmphHdr'} );

        // Compute padding data source so the UMPHIO data starts at 32 B multiple.
        var hdrLen = pngHeadDs.length() + umphHdrDs.length();
        if ((hdrLen % 32) != 0){
            var lenWithPadHdr = hdrLen + 4 + 4 + 4;
            var padChunk = this.createPaddingChunk(32 - (lenWithPadHdr % 32));
            var padDs = new ConstDataSource( padChunk, {name: 'pngPad'} );
            finalDataSources = [pngHeadDs, padDs, umphHdrDs];

        } else {
            finalDataSources = [pngHeadDs, umphHdrDs];
        }

        // UMPH content wrapped with hashing data source - computes CRC32 over input data.
        var umphDataSourceCrc32Ds = new HashingDataSource(umphDataSource, (function(ofStart, ofEnd, len, data){
            this.crc32Engine.update(data);
            if (ofEnd >= len){
                this.crc32Val = this.crc32Engine.finalize();
            }
        }).bind(this), {name: 'pngUmphCrcWrap'});

        // Static CRC32 data source - reads computed value.
        var crc32StaticFnc = (function(offsetStart, offsetEnd, handler){
            handler(w.bitSlice([this.crc32Val], offsetStart*8, offsetEnd*8));
        }).bind(this);
        var crc32StaticDs = new WrappedDataSource(crc32StaticFnc, 4, {name: 'pngCrcData'});

        // Trailing DS
        for(i=0, ln = this.pngTailChunks.length; i<ln; i++){
            trailData = w.concat(trailData, this.pngTailChunks[i]);
        }

        // png trailing
        trailData = w.concat(trailData, this.pngTrail);
        var pngTrailDs = new ConstDataSource(trailData, {name: 'pngTrail'});

        finalDataSources.push(umphDataSourceCrc32Ds);
        finalDataSources.push(crc32StaticDs);
        finalDataSources.push(pngTrailDs);
        return new MergedDataSource(finalDataSources, {name: "png"});
    }
};

/**
 * Parsing umPh header from the PNG stream.
 * @param options
 */
eb.sh.pngParser = function(options){
    options = options || {};
    this.pngHeader = undefined;
    this.umphTag = undefined;
    this.iendTag = undefined;
    this.generator = undefined;

    // Parser state.
    this.tps = {};
    this.tps.ctag = -1;
    this.tps.tlen = -1; // must be -1 initially.
    this.tps.clen = 0;
    this.tps.crc = [];
    this.iendDetected = false;
    this.headerRead = 0;

    this.init_();
};
eb.sh.pngParser.prototype = {
    init_: function(){
        this.pngHeader = sjcl.codec.hex.toBits("89504e470d0a1a");
        this.generator = new eb.sh.png({});
        this.umphTag = this.generator.genTag("umPh");
        this.iendTag = this.generator.genTag("IEND");
    },

    /**
     * Returns true if this file format is supported by the decoder.
     * @param {bitArray} ba
     * @returns {boolean}
     */
    isSupportedFormat: function(ba){
        var w = sjcl.bitArray;
        return w.equal(this.pngHeader, w.clamp(ba, w.bitLength(this.pngHeader)));
    },

    /**
     *
     * @param {object} cached
     * @param {bitArray} cached.buff
     * @param {Number} cached.offset
     * @param {Number} cached.end
     * @param {Function} onNeedMoreData
     * @param {Function} onPlainUpdated
     */
    process: function(cached, onNeedMoreData, onPlainUpdated){
        var bufLen, cpos = 0, lenToTagFinish = 0, toConsume = 0, w = sjcl.bitArray;
        var resData = [];

        bufLen = w.bitLength(cached.buff)/8;
        log(sprintf("To parse pngBlock: %s B", bufLen));

        // Standard PNG header.
        if (this.headerRead < 8){
            toConsume = Math.min(8 - this.headerRead, bufLen - cpos);

            this.headerRead += toConsume;
            cpos += toConsume;
        }

        // Parser is fed with the input data buffer.
        // This parser is stateful, processes data in a streaming mode, keeps state across multiple requests.
        for(;!this.iendDetected;) {
            // Previous tag can be closed?
            if (this.tps.tlen == this.tps.clen && w.bitLength(this.tps.crc) == 32){
                // IEND tag? then terminate the parsing.
                if (this.tps.ctag == this.iendTag){
                    this.iendDetected = true;
                    break;
                }
                this.tps.ctag = -1;
            }

            // End of the buffer?
            if (cpos == bufLen){
                log("End of the png buffer");
                break;
            } else if (cpos > bufLen){
                throw new eb.exception.invalid("Invalid decrypted buffer state");
            }

            // Process new tag.
            // Basic PNG chunk structure:
            // length-4B | type-4B | data | CRC-4B
            if (this.tps.ctag == -1){
                // Is there enough data to read length + type? If yes, do it, otherwise ask for more data.
                if ((cpos + 8) > bufLen){
                    log("Not enough bytes to parse the length field. Need more data");
                    break;
                }

                // Read the length field + tag field.
                this.tps.tlen = w.extract32(cached.buff, cpos*8); cpos += 4;
                this.tps.ctag = w.extract32(cached.buff, cpos*8); cpos += 4;
                this.tps.clen = 0;
                this.tps.crc = [];
                if (this.tps.tlen < 0){
                    throw new eb.exception.invalid("Negative length detected, field too big");
                }
            }

            lenToTagFinish = this.tps.tlen - this.tps.clen;
            toConsume = Math.min(lenToTagFinish, bufLen - cpos);

            // umph tag? Process it.
            if (this.tps.ctag == this.umphTag){
                var fileData = w.bitSlice(cached.buff, cpos*8, (cpos+toConsume)*8);
                resData = eb.sh.misc.concatSelf(resData, fileData);

                cpos += toConsume;
                this.tps.clen += toConsume;

            } else {
                // Another chunk data are just skipped.
                cpos += toConsume;
                this.tps.clen += toConsume;
            }

            // CRC32?
            if (this.tps.clen == this.tps.tlen){
                toConsume = Math.min(4 - w.bitLength(this.tps.crc)/8, bufLen - cpos);
                this.tps.crc = w.concat(this.tps.crc, w.bitSlice(cached.buff, cpos*8, (cpos+toConsume)*8));
                cpos += toConsume;
            }
        }

        // Slice off the processed part of the buffer.
        if (cpos > 0) {
            cached.buff = w.bitSlice(cached.buff, cpos * 8);
            cached.offset += cpos;
        }

        // End of parsing? If yes
        if (this.iendDetected){
            onPlainUpdated(resData);
        } else {
            // PNG not read entirely.
            // Have data to process? Give it.
            if (w.bitLength(resData) > 0){
                onPlainUpdated(resData);
            } else {
                onNeedMoreData();
            }
        }
    }
};

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
 * @param {object} [options.fnameOrig] Original file name to be stored to the encrypted meta block.
 * @param {object} [options.extraMessage] Extra text message to share with the file.
 * @param {object} [options.passwordHint] Password hint phrase, non-protected.
 * @param {object} [options.retry] Options for RetryHandler.
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
    this.passwordHint = options.passwordHint;
    this.extraMessage = options.extraMessage;
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
    this.retryHandler = new RetryHandler($.extend({maxAttempts: 10}, options.retry || {}));
    this.url = options.url;
    this.png = options.png;

    if (!this.url) {
        var params = options.params || {};
        params.uploadType = 'resumable';
        this.url = this.buildUrl_(options.fileId, params, options.baseUrl);
    }
    this.httpMethod = options.fileId ? 'PUT' : 'POST';

    // Encryption related fields.
    this.encKey = options.encKey;                   // bitArray with encryption key for AES-256-GCM.
    this.secCtx = options.secCtx || [];             // bitArray with security context, result of UO application.
    this.lnonceHash = options.lnonceHash || [];     // bitArray with SHA-256(linkNonce). Used for password hinting.
    this.aes = new sjcl.cipher.aes(this.encKey);    // AES cipher instance to be used with GCM for data encryption.
    this.iv = sjcl.random.randomWords(4);           // initialization vector for GCM, 1 block, 16B.
    this.gcm = undefined;                           // GCM encryption mode, initialized now.
    this.sha1Digest = new sjcl.hash.sha1();         // Hashing input data
    this.sha256Digest = new sjcl.hash.sha256();     // Hashing input data

    // Construct first meta block now, compute file sizes.
    this.paddingToAdd = options.padding || 0;       // Concealing padding size.
    this.paddingFnc = options.padFnc;               // Padding size function. If set, determines the padding length.
    this.formatHeader = undefined;                  // UMPHIO1
    this.dataSource = undefined;                    // Data source for data/file/padding.
    this.totalSize = undefined;                     // Total size of the upload stream.
    this.pngMagic = undefined;                      // PNG generator.
    this.sha1 = undefined;                          // SHA1 of the input data.
    this.sha256 = undefined;                        // SHA256 of the input data.

    // Encrypted data buffering - already processed data. Underflow avoidance.
    this.cached = {};         // Data processing cache object.
    this.cached.offset = -1;  // Data start offset that is cached in the buff. Absolute data offset address of the first buff byte.
    this.cached.end = -1;     // Data end offset that is cached in the buff. Absolute data offset address of the last buff byte.
    this.cached.buff = [];    // Cached processed data buffer. Size = cached.end - cached.offset.
    this.cached.tag = [];     // Computed final auth tag for the data.

    // Initializes data sources, encryption.
    this.initialize_();
};

EnigmaUploader.TAG_SEC = 0x1;      // security context part. Contains IV, encrypted file encryption key.
EnigmaUploader.TAG_FNAME = 0x2;    // record with the data/file name.
EnigmaUploader.TAG_MIME = 0x3;     // record with the data/file mime type.
EnigmaUploader.TAG_TIME = 0x7;     // record with the timestamp of the upload.
EnigmaUploader.TAG_MSG = 0x8;      // record with the user provided message (will be encrypted + auth together with the file).
EnigmaUploader.TAG_MSG_HINT = 0xa; // record with the password hint - protected only by linkNonce.
EnigmaUploader.TAG_FSIZE = 0x9;    // record with the file size.
EnigmaUploader.TAG_METAMAC = 0xc;  // record with the HMAC of all previously stated meta blocks.
EnigmaUploader.TAG_ENC = 0x4 | 0x80;      // record with the encrypted data/file. 64bit length field.
EnigmaUploader.TAG_ENCWRAP = 0x5 | 0x80;  // record with the encrypted container (fname+mime+data). Last unencrypted record. 64bit length field.
EnigmaUploader.TAG_PADDING = 0x6;  // padding record. Null bytes (skipped in parsing), may be used to conceal true file size or align blocks.
EnigmaUploader.TAG_GCMTAG = 0xd;  // final tag int the encrypted part (ENCRWAP), contains GCM tag of all previous data.
EnigmaUploader.TAG_END = 0xf;     // final tag, no more tags in the current envelope. Closes scheme.
EnigmaUploader.LENGTH_BYTES = 0x4;
EnigmaUploader.MAGIC_STRING = "UMPHIO";

/**
 * Initiate the upload.
 * Store file metadata, start resumable upload to obtain upload ID.
 */
EnigmaUploader.prototype.upload = function() {
    var xhr = new XMLHttpRequest();

    xhr.open(this.httpMethod, this.url, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + this.token);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Upload-Content-Length', this.totalSize);
    xhr.setRequestHeader('X-Upload-Content-Type', this.contentType);

    xhr.onload = function(e) {
        if (e.target.status < 400) {
            this.retryHandler.reset();
            this.url = e.target.getResponseHeader('Location');
            log("Upload session started. Url: " + this.url);

            this.sendFile_();
        } else {
            this.onUploadError_(e);
        }
    }.bind(this);
    xhr.onerror = this.onUploadError_.bind(this);

    this.retryHandler.reset();
    log("Starting session with metadata: " + JSON.stringify(this.metadata));
    xhr.send(JSON.stringify(this.metadata));
};

/**
 * Cancels current operation - mainly for cancelling backoff waiting.
 */
EnigmaUploader.prototype.cancel = function() {
    this.retryHandler.cancel();
    // TODO: cancellation of download, encryption.
    // TODO: handling of cancellation. Eventing?
};

/**
 * Builds meta info block. File is prepended with this information.
 * Contains information required for decryption and encrypted meta data block.
 * Meta data block contains e.g., original file name, mime type, ...
 *
 * First block is padded on a cipher block size with TLV padding so the further
 * data/file processing is faster and aligned on blocks.
 */
EnigmaUploader.prototype.initialize_ = function() {
    var block = [], encWrapHeader, fstBlockSize, aad = [];
    var h = sjcl.codec.hex;
    var w = sjcl.bitArray;

    // Format header, magic string + version number. Defines file format (useful if wrapped in another format).
    this.formatHeader = w.concat(sjcl.codec.utf8String.toBits(EnigmaUploader.MAGIC_STRING), [w.partial(8, 1)]);
    block = w.concat(block, this.formatHeader);

    // Secure context block, TAG_SEC | len-4B | IV-16B | secCtx
    var secLen = w.bitLength(this.iv)/8 + w.bitLength(this.secCtx)/8;
    block = w.concat(block, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_SEC, secLen)));
    block = w.concat(block, this.iv);
    block = w.concat(block, this.secCtx);

    // GCM tag authenticates also magic string, version, IV, security context.
    aad = block;

    // Build meta block (fname, mime, fsize, message), unencrypted, for length computation. No state modification.
    // toEnc is already padded to multiple of 32.
    var toEnc = this.buildMetaBlock_();

    // Build padding of the first block so the fstBlock is padded to 32B multiple.
    // fstBlock = magic | secCtx | TAG_ENCWRAP | len-8B | ENC($meta | $padding)
    var encMetaSize = w.bitLength(toEnc)/8;
    var fstBlockWoPadding = w.bitLength(block)/8 + (1 + 8) + encMetaSize;
    var padBlock = this.buildPaddingBlock_(fstBlockWoPadding);

    // Add padding block to the block, then TAG_ENCWRAP comes.
    block = w.concat(block, padBlock);

    // Compute first block size (no data sources included, static data).
    // toEnc is aligned to 32B, encrypted size will be the same.
    fstBlockSize = fstBlockWoPadding + w.bitLength(padBlock)/8;

    // Compute overall sizes required for the format.
    // For this we need to compute concealing padding size first.
    var blobSc = new BlobDataSource(this.file, {name: 'inputBlob'});

    // Total size (header, data, footer), without concealing padding.
    var totalSize = this.computeTotalSize_(fstBlockSize, blobSc.length(), 0, 0);
    var concealingSize = this.computeConcealPaddingSize_(totalSize);
    var encWrapSize = this.computeEncryptedPartSize_(blobSc.length()) + encMetaSize + concealingSize;
    log(sprintf("TotalSize: %d, concealingSize: %d, encWrapSize: %d, fileSize: %d, fstCompSize: %d, metaSize: %d",
        totalSize, concealingSize, encWrapSize, blobSc.length(), fstBlockSize, encMetaSize));

    // Encryption wrap tag - the end of the message is encrypted with AES-256-GCM.
    // ENCWRAP length = metablock + padding-conceal + data + gcm-tag-16B
    encWrapHeader = w.concat([w.partial(8, EnigmaUploader.TAG_ENCWRAP)], eb.misc.serialize64bit(encWrapSize));
    block = w.concat(block, encWrapHeader);

    // Initialize GCM.
    this.gcm = sjcl.mode.gcmProgressive.create(this.aes, true, this.iv, aad, 128);

    // Encrypt meta block, append to the first block data.
    var encrypted = this.buildEncryptedMetaBlock_(toEnc);
    block = w.concat(block, encrypted);
    log(sprintf("FBlockSize: %s, encPartSize: %s", w.bitLength(block)/8, w.bitLength(encrypted)/8));
    this.fstBlock = block;

    // Data source setup (with concealing padding).
    // Prepares input data for processing, length computation.
    this.setupDataSource_(blobSc, concealingSize);
};

/**
 * Returns true if concealing padding is enabled.
 * @returns {boolean}
 * @private
 */
EnigmaUploader.prototype.isPaddingEnabled_ = function(){
    return this.paddingToAdd > 0 || this.paddingFnc !== undefined;
};

/**
 * Computes size of size concealing padding if enabled.
 * Returns 0 if no padding should be added or if 0 padding bytes should be added - warning, need to check for padding condition.
 *
 * @param curTotalSize
 * @returns {*}
 * @private
 */
EnigmaUploader.prototype.computeConcealPaddingSize_ = function(curTotalSize){
    return this.isPaddingEnabled_() ? (this.paddingFnc ? this.paddingFnc(curTotalSize) : this.paddingToAdd) : 0;
};

/**
 * Computes overall file format size. Required for computation of the concealing padding size.
 * Contains padding block if size concealing padding is enabled.
 *
 * @param fstBlockSize
 * @param dataLen
 * @param trailExtraLen
 * @param headerExtraLen
 * @returns {Number}
 * @private
 */
EnigmaUploader.prototype.computeTotalSize_ = function(fstBlockSize, dataLen, trailExtraLen, headerExtraLen){
    var totalSize = 0;

    // Exta header
    totalSize += headerExtraLen || 0;
    // fstBlock size: pad(|formatHeader| + |secCtx| + (1 + 8) + pad(meta))
    totalSize += fstBlockSize;
    // conceal padding hdr + enc hdr + data.
    totalSize += this.computeEncryptedPartSize_(dataLen);
    // GCM + end tag.
    totalSize += (1 + 4 + 16) + (1 + 4);
    // TrailExtraLen = extra length with trailing
    totalSize += trailExtraLen || 0;
    return totalSize;
};

/**
 * Computes size of the encrypted data block.
 * Concealing padding is not taken into account, but if enabled, concealing padding headers are.
 *
 * @param dataLen
 * @returns {Number}
 * @private
 */
EnigmaUploader.prototype.computeEncryptedPartSize_ = function(dataLen){
    var totalSize = 0;
    // conceal padding hdr
    totalSize += this.isPaddingEnabled_() ? (1 + 4) : 0;
    // encHdr + data len
    totalSize += (1 + 8) + dataLen;
    return totalSize;
};

/**
 * Generates DataSource for the terminating tag.
 * Helps to declare there will be no next tag for processing, to tell parser to stop the parsing.
 * Useful when file format is embedded in another file format.
 *
 * @returns {ConstDataSource}
 * @private
 */
EnigmaUploader.prototype.buildEndTagDataSource_ = function(){
    var w = sjcl.bitArray;
    return new ConstDataSource(w.concat([w.partial(8, EnigmaUploader.TAG_END)], [0]), {name: 'endTag'});
};

/**
 * Builds GCM tag data source.
 * TAG_GCMTAG | len4B | gcmtag
 *
 * Uses internal state to fill in GCM tag when requested by caller.
 * If GCM tag is not computed in time of requesting GCM tag data, data source
 * finalizes GCM encryption, generates GCM tag and uses this new one.
 *
 * @returns {MergedDataSource}
 * @private
 */
EnigmaUploader.prototype.buildGcmTagDataSource_ = function(){
    var w = sjcl.bitArray;
    var tagFnc = function(offsetStart, offsetEnd, handler){
        if (w.bitLength(this.cached.tag)/8 != 16){
            log("GCM tag not computed yet. Finalizing GCM encryption");
            var res = this.gcm.finalize([], {returnTag: true});
            this.cached.tag = res.tag;
            if (res.data.length > 0){
                throw new eb.exception.invalid("GCM tag finalizing, data produced, should not happen");
            }
        }

        handler(w.bitSlice(this.cached.tag, offsetStart*8, offsetEnd*8));
    };

    var hrd = new ConstDataSource(w.concat([w.partial(8, EnigmaUploader.TAG_GCMTAG)], [16]), {name: 'gcmTagHdr'});
    var tag = new WrappedDataSource(tagFnc.bind(this), 16, {name: 'gcmTagData'});
    return new MergedDataSource([hrd, tag], {name: 'gcmTag'});
};

/**
 * Builds data source that is fed into the encryption routine.
 * Contains size concealing padding + input data (message/file).
 *
 * @param {DataSource} blobSc Data source containing input data to protect/share (main user input).
 * @param {Number} concealingSize Number of concealing bytes to add. Has to be pre-computed when calling this.
 * @returns {MergedDataSource}
 * @private
 */
EnigmaUploader.prototype.buildEncryptionInputDataSource_ = function(blobSc, concealingSize){
    var h = sjcl.codec.hex;
    var w = sjcl.bitArray;
    var paddingEnabled = this.isPaddingEnabled_();

    // Main blob containing input data / file size.
    var blobScSize = blobSc.length();

    // Add padding such that file data is aligned to 32B multiple.
    var encPadLen = 32 - 1-4 - 1-8; // 32B block - padding header - TAG_ENC header (9B)
    var padDs = new ConstDataSource(
        w.concat(
            w.concat([w.partial(8, EnigmaUploader.TAG_PADDING)], [encPadLen]),
            eb.misc.getRandomBits(encPadLen*8)
            ), {name: 'encPadDs'});

    // Encryption block, contains the shared data, has 8B length field.
    var encHdr = w.concat([w.partial(8, EnigmaUploader.TAG_ENC)], eb.misc.serialize64bit(blobScSize));
    var encHdrDs = new ConstDataSource(encHdr, {name: 'encHdr'});

    // File/message content wrapped with hashing data source - computes sha1, sha256 over input data.
    var inputHashingDs = new HashingDataSource(blobSc, (function(ofStart, ofEnd, len, data){
        this.hashDataAsync_(ofStart, ofEnd, len, data);
    }).bind(this), {name: 'hashingDs'});

    // Message size concealing padding data sources.
    if (!paddingEnabled){
        return new MergedDataSource([padDs, encHdrDs, inputHashingDs], {name: 'encData'});
    }

    // Simple padding data source generator - stream of zero bytes, generated on demand.
    var padGenerator = function(offsetStart, offsetEnd, handler){
        handler(eb.misc.getRandomBits((offsetEnd-offsetStart)*8));
    };

    if (concealingSize < 0){
        throw new eb.exception.invalid("Padding cannot be negative");
    }

    // Padding tag source + padding generator.
    var padConst = new ConstDataSource(h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_PADDING, concealingSize)), {name: 'concealHdr'});
    var padGen = new WrappedDataSource(padGenerator, concealingSize, {name: 'concealData'});

    // Padding + data to encrypt
    return new MergedDataSource([padDs, encHdrDs, inputHashingDs, padConst, padGen], {name: 'encConcData'});
};

/**
 * Async hash computation.
 *
 * @param ofStart
 * @param ofEnd
 * @param len
 * @param data
 * @private
 */
EnigmaUploader.prototype.hashDataAsync_ = function(ofStart, ofEnd, len, data) {
    eb.sh.misc.updateHashAsync([this.sha1Digest, this.sha256Digest], data, undefined, {async:true, base:1024*8});
    if (ofEnd >= len){
        eb.sh.misc.async((function(){
            this.sha1 = this.sha1Digest.finalize();
            this.sha256 = this.sha256Digest.finalize();
        }).bind(this));
    }
};

/**
 * Builds data source that encrypts underlying inputDs.
 * Modifies the state (gcm) and cache object.
 * @param inputDs
 * @private
 */
EnigmaUploader.prototype.buildEncryptionDataSource_ = function(inputDs) {
    var w = sjcl.bitArray;
    var ln = inputDs.length();

    // Encrypts all underlying data sources with the GCM engine.
    var encryptionFnc = (function(fOffset, fEnd, handler) {
        var result = []; // result will be placed here, given to loadedCb.
        var fChunkLen = fEnd - fOffset;
        var fEndOrig = fEnd;
        var aheadBytes = 0;

        if (fEnd > ln){
            throw new eb.exception.invalid(sprintf("Requesting larger chunk than available, end: %s, len: %s", fEnd, ln));
        }

        // If old chunk is requested - error, should not happen.
        // We already discarded processed data in the cache cleanup and it cannot be computed again as
        // GCM state already moved forward.
        if (this.cached.offset != -1 && fOffset < this.cached.offset) {
            throw new sjcl.exception.invalid("Data requested were deleted.");
        }

        // Drop old processed chunks from the processed buffer. Won't be needed anymore.
        if (this.cached.end != -1 && this.cached.end <= fOffset) {
            log(sprintf("Dropping old chunk (end). Cached: %s - %s. FileReq: %s - %s", this.cached.offset, this.cached.end, fOffset, fEnd));
            this.cached.offset = -1;
            this.cached.end = -1;
            this.cached.buff = [];
        }

        // Cleanup. Keep only last chunk in the buffer just in case a weird reupload request comes.
        // We assume we won't need more data from the past than 1 upload chunk size. If we do, it is a critical error.
        if (this.cached.offset != -1 && (this.cached.offset + this.chunkSize) < fOffset) {
            log(sprintf("Dropping old chunk. Cached: %s - %s. FileReq: %s - %s, newCachedOffset: %s, DropFromPos: %s",
                this.cached.offset, this.cached.end, fOffset, fEnd, fOffset - this.chunkSize,
                fOffset - this.chunkSize - this.cached.offset));

            this.cached.buff = w.bitSlice(this.cached.buff, (fOffset - this.chunkSize - this.cached.offset) * 8);
            this.cached.offset = fOffset - this.chunkSize;
            eb.misc.assert(w.bitLength(this.cached.buff) == 8 * (this.cached.end - this.cached.offset), "Invariant broken");
        }

        // If we have some data already prepared in the buffer - provide it. (fOffset is in the cached buffer range).
        if (this.cached.offset <= fOffset && this.cached.end >= fOffset) {
            var curStart = fOffset - this.cached.offset;
            var curStop = Math.min(this.cached.end - this.cached.offset, curStart + (fEnd - fOffset));
            var toUse = w.bitSlice(this.cached.buff, curStart * 8, curStop * 8);
            result = eb.sh.misc.concatSelf(result, toUse);

            // Update fOffset, fEnd, reflect loaded data from buffer.
            // It may be still needed to load & process (encrypt) additional data.
            fOffset += curStop - curStart;
            fChunkLen = fEnd - fOffset;

            log(sprintf("Partially provided from the buffer, provided: %s B, newDataOffset: %s B, dataToLoad: %s B",
                w.bitLength(toUse) / 8, fOffset, fChunkLen));
        }

        // If enough is loaded, do not load data from source. Provide just processed data from the buffer.
        if (fOffset >= fEnd) {
            log(sprintf("Everything served from the internal buffer"));
            handler(result);
            return;
        }

        // To prevent underflow, read more data than requested (align to the cipher block size).
        // If end is in the unaligned position, GCM won't output it and underflow happens as we get fewer data than
        // we are supposed to in the upload request.
        if (fEnd < ln && (fChunkLen % 16) != 0) {
            fEnd = Math.min(ln, fOffset + eb.misc.padToBlockSize(fChunkLen, 16));
            aheadBytes = fEnd - fEndOrig;
            log(sprintf("Possible underflow, read ahead, oldLen: %s, newLen: %s, oldEnd: %s, newEnd: %s, extra bytes: %s",
                fChunkLen, fEnd - fOffset, fEndOrig, fEnd, aheadBytes));
        }

        // Data encrypted event handler.
        var onDataEncrypted = (function (ba){
            // Includes tag?
            // Due to pre-buffering it should not happen end ends up in the unaligned part of the buffer.
            // It is either aligned or the final byte of the file.
            if (fEnd >= ln) {
                var res = this.gcm.finalize([], {returnTag: true});
                this.cached.tag = res.tag;

                // Add the last data block, finalizing result.
                ba = eb.sh.misc.concatSelf(ba, res.data);
            }

            // Update cached prepared data. If reupload happens, data is taken from buffer, no encryption of the same
            // data. It would break tag & counters in GCM.
            if (this.cached.offset == -1) {
                this.cached.offset = fOffset;
            }
            this.cached.end = fEnd;
            this.cached.buff = eb.sh.misc.concatSelf(this.cached.buff, ba);

            // Add appropriate amount of bytes from cres to result.
            var baBl = w.bitLength(ba);
            result = eb.sh.misc.concatSelf(result, w.clamp(ba, Math.min(baBl, 8 * (fEndOrig - fOffset))));
            ba = []; // Drop allocation before going to callback.

            handler(result);
            result = []; // Explicit memory deallocation.
        }).bind(this);

        // Event handler called when data is loaded from the underlying data source.
        var onDataToEncryptLoadedFnc = (function (ba) {
            log(sprintf("onBytesRead: %s - %s of %s B file. TotalUploadSize: %s B, bitArray: %s B. Cached: %s. GCM start.",
                fOffset, fEnd, ln, this.totalSize, w.bitLength(ba) / 8, w.bitLength(this.cached.buff)/8));

            // Encrypt this chunk with GCM mode.
            // Output length is cipher-block aligned, this can cause underflows in certain situations. To make it easier
            // padding records are inserted to the first block so it is all blocksize aligned (16B).
            this.encryptDataAsync_(ba, onDataEncrypted);
        }).bind(this);

        // Start loading.
        inputDs.read(fOffset, fEnd, onDataToEncryptLoadedFnc);
    }).bind(this);

    log(sprintf("ToEncrypt DS with length: %s", ln));
    return new WrappedDataSource(encryptionFnc, ln, {name: 'encryptionDs'});
};

EnigmaUploader.prototype.encryptDataAsync_ = function(ba, onFinished){
    var tmp = [];
    var onFinish = (function(ba, last){
        tmp = eb.sh.misc.concatSelf(tmp, ba);
        if (last){
            onFinished(tmp);
            tmp = [];
        }
    }).bind(this);

    // Trigger async cipher update.
    eb.sh.misc.updateCipherAsync(this.gcm, ba, onFinish, {async:true});
};

EnigmaUploader.prototype.setupDataSource_ = function(blobSc, concealingSize){
    // Construct file data source, will be needed anyway.
    var umph = this.setupUmphDataSource_(blobSc, concealingSize);

    // PNG wrapping.
    if (this.png){
        log("Using PNG embedding");
        this.pngMagic = new eb.sh.png({png:this.png});
        this.pngMagic.addHeaderTxtChunk("Warning", "Generated by UMPH.IO secure file sharing. " +
            "This file does contain encrypted content, can be seen only with UMPH link. Powered by EnigmaBridge.com");

        this.dataSource = this.pngMagic.getUmphWrappingDataSource(umph);
        this.totalSize = this.dataSource.length();

        this.contentType = 'image/png';
        this.fname = this.fname + '.png';
        this.metadata.mimeType = this.contentType;
        this.metadata.name = this.fname;
    } else {
        // Default.
        this.dataSource = umph;
        this.totalSize = umph.length();
    }
};

EnigmaUploader.prototype.setupUmphDataSource_ = function(blobSc, concealingSize){
    // File header data source = first block.
    var hdrDs = new ConstDataSource(this.fstBlock, {name: 'fstBlock'});

    // Build data source for encryption.
    var toEncDs = this.buildEncryptionInputDataSource_(blobSc, concealingSize);

    // Encryption data source
    var encDs = this.buildEncryptionDataSource_(toEncDs);
    var tagDs = this.buildGcmTagDataSource_();
    var endDs = this.buildEndTagDataSource_();
    log(sprintf("Size hdrDs: %s, toEncDs: %s, encDs: %s, tagDs: %s, endDs: %s",
        hdrDs.length(),
        toEncDs.length(),
        encDs.length(),
        tagDs.length(),
        endDs.length()));

    // Final data source
    return new MergedDataSource([hdrDs, encDs, tagDs, endDs], {name: 'umph'});
};

/**
 * Returns a block with password hint. Password hint text is clamped to 1k.
 * TAG-1B | len-4B | salt-16B | IV-16B | HMAC-32B | encrypted-hint | GCM-TAG-16B
 *
 * @returns {Array|bitArray}
 * @private
 */
EnigmaUploader.prototype.buildMessageHintBlock_ = function(){
    if (this.passwordHint === undefined || this.lnonceHash === undefined){
        return [];
    }

    var w = sjcl.bitArray;
    var salt = sjcl.random.randomWords(8);
    var iv = sjcl.random.randomWords(4);
    var key = sjcl.hash.sha256.hash(w.concat(this.lnonceHash, salt));
    var aes = new sjcl.cipher.aes(key);

    var encHdr = [];
    encHdr = w.concat(encHdr, salt);
    encHdr = w.concat(encHdr, iv);

    var hintBa = sjcl.codec.utf8String.toBits(eb.sh.misc.takeMaxN(this.passwordHint, 1024));
    var hintEncBa = sjcl.mode.gcmProgressive.encrypt(aes, hintBa, iv, [], 128); // GCM encryption mode, initialized now.

    // As hint is protected only by linkNonce, it is easy for an attacker with the link to tamper the hint content.
    // In order to detect tampering after the password entry, HMAC the whole hint with password derived from encKey.
    // Note the hint is also protected as Associated data, protected by the GCM.
    var hmacObj = sjcl.misc.hmac(w.concat(this.encKey, encHdr));
    var hmac = hmacObj.mac(hintEncBa);
    encHdr = w.concat(encHdr, hmac);
    encHdr = w.concat(encHdr, hintEncBa);

    var hdr = w.concat([w.partial(8, EnigmaUploader.TAG_MSG_HINT)], [w.bitLength(encHdr)/8]);
    return w.concat(hdr, encHdr);
};

/**
 * Builds meta block for this transfer.
 * Does not modify the state.
 *
 * @returns {Array|bitArray}
 * @private
 */
EnigmaUploader.prototype.buildMetaBlock_ = function(){
    var toEnc = [];
    var h = sjcl.codec.hex;
    var w = sjcl.bitArray;

    // toEnc does not need to be aligned with block length as GCM is a stream mode.
    // But for the simplicity, pad it to the block size - easier state manipulation, size computation.
    //
    // Filename
    log("FileName in meta block: " + this.fnameOrig);
    var baName = sjcl.codec.utf8String.toBits(eb.sh.misc.takeMaxN(this.fnameOrig, 256));
    toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_FNAME, w.bitLength(baName)/8)));
    toEnc = w.concat(toEnc, baName);

    // Mime type
    log("MimeType in meta block: " + this.contentTypeOrig);
    var baMime = sjcl.codec.utf8String.toBits(eb.sh.misc.takeMaxN(this.contentTypeOrig, 256));
    toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_MIME, w.bitLength(baMime)/8)));
    toEnc = w.concat(toEnc, baMime);

    // Timestamp of the upload
    var time = Date.now();
    var baTime = eb.misc.serialize64bit(time);
    toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_TIME, w.bitLength(baTime)/8)));
    toEnc = w.concat(toEnc, baTime);
    log("Time in meta block: " + time);

    // FileSize
    var baSize = eb.misc.serialize64bit(this.file.size);
    toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_FSIZE, w.bitLength(baSize)/8)));
    toEnc = w.concat(toEnc, baSize);
    log("FileSize in meta block: " + this.file.size);

    // Extra file share message.
    if (this.extraMessage && this.extraMessage.length > 0){
        var baExtraMsg = sjcl.codec.utf8String.toBits(eb.sh.misc.takeMaxN(this.extraMessage, 1024*5));
        toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_MSG, w.bitLength(baExtraMsg)/8)));
        toEnc = w.concat(toEnc, baExtraMsg);
        log("Extra message in meta block: " + this.extraMessage);
    }

    // MAC meta block message so it can be displayed right after password entry, without need to
    // download the whole file (GCM TAG) in order to verify authenticity of the meta data.
    var macKey = sjcl.hash.sha256.hash(w.concat(this.encKey, sjcl.codec.utf8String.toBits("metahmac")));
    var macObj = new sjcl.misc.hmac(macKey);
    var mac = macObj.mac(toEnc);

    toEnc = w.concat(toEnc, h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_METAMAC, w.bitLength(mac)/8)));
    toEnc = w.concat(toEnc, mac);
    log("Meta block HMAC: " + h.fromBits(mac));

    // Align to one AES block with padding record - encryption returns block immediately, easier size computation.
    toEnc = this.padBlockToBlockSize_(toEnc, false);
    return toEnc;
};

/**
 * Encrypts provided meta block with the GCM object.
 * Modifies the state.
 *
 * @param toEnc
 * @returns {Array|bitArray}
 * @private
 */
EnigmaUploader.prototype.buildEncryptedMetaBlock_ = function(toEnc){
    var w = sjcl.bitArray;

    // Encrypt padded meta data block.
    var encrypted = this.gcm.update(toEnc);
    log(sprintf("Encrypted size: %s B, before enc: %s B", w.bitLength(encrypted)/8, w.bitLength(toEnc)/8));

    return encrypted;
};

/**
 * Returns the size of the input data after padding with TAG_PAD record to the block size.
 * @param {Number} curSize
 * @returns {Number}
 * @private
 */
EnigmaUploader.prototype.getSizeAfterBlockPadding_ = function(curSize){
    // Align to one AES block with padding record - encryption returns block immediately, easier size computation.
    var base = 32; // padding to 32 bytes as bitArray operations are much faster with 1 word aligned vectors.
    if ((curSize % base) != 0){
        // pad tag + pad length = minimal size for new pad record.
        return eb.misc.padToBlockSize(curSize + 5, base); // length after padding to the whole block.
    } else {
        return curSize;
    }
};

/**
 * Builds padding block so the padding block + size is multiple of 16B.
 * @param size
 * @returns {Array|bitArray}
 * @private
 */
EnigmaUploader.prototype.buildPaddingBlock_ = function(size){
    var h = sjcl.codec.hex;
    var w = sjcl.bitArray;
    var base = 32; // padding to 32 bytes as bitArray operations are much faster with 1 word aligned vectors.
    var padBytesToAdd;

    // Align to one AES block with padding record - encryption returns block immediately, easier size computation.
    if ((size % base) != 0){
        var numBytesAfterPadBlock = size + 5; // pad tag + pad length = minimal size for new pad record.
        var totalFblockSize = eb.misc.padToBlockSize(numBytesAfterPadBlock, base); // length after padding to the whole block.
        padBytesToAdd = totalFblockSize - numBytesAfterPadBlock;

        // Generate padding block
        var padBlock = h.toBits(sprintf("%02x%08x", EnigmaUploader.TAG_PADDING, padBytesToAdd));
        if (padBytesToAdd > 0){
            padBlock = w.concat(padBlock, eb.misc.getRandomBits(padBytesToAdd * 8));
        }

        return padBlock;
    }

    return [];
};

/**
 * Pads input block with the padding tag to the block size.
 * @param input
 * @param beforeInput
 * @returns {*}
 * @private
 */
EnigmaUploader.prototype.padBlockToBlockSize_ = function(input, beforeInput){
    var w = sjcl.bitArray;
    var padBlock = this.buildPaddingBlock_(w.bitLength(input)/8);

    // Align to one AES block with padding record - encryption returns block immediately, easier size computation.
    if (padBlock.length > 0){
        // Add padding block
        if (beforeInput){
            input = w.concat(padBlock, input);
        } else {
            input = eb.sh.misc.concatSelf(input, padBlock);
        }
    }

    return input;
};

/**
 * Bytes to send.
 * Uniform access to file structure before sending.
 */
EnigmaUploader.prototype.getBytesToSend_ = function(offset, end, loadedCb) {
    // Initiate file/blob read.
    this.dataSource.read(offset, end, loadedCb);
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
    if (this.offset || this.chunkSize) {
        if (this.chunkSize) {
            end = Math.min(this.offset + this.chunkSize, this.totalSize);
        }
    }

    // Handler for uploading requested data range.
    var onDataToSendLoadedFnc = function(ba) {
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

    this.getBytesToSend_(this.offset, end, onDataToSendLoadedFnc.bind(this));
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
    if (this.retryHandler.limitReached()){
        this.onError(e ? e.target.response : e);
    } else {
        this.retryHandler.retry(this.upload.bind(this));
    }
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
 * @param {string} options.token access token for Google Drive.
 * @param {function} [options.onComplete] event handler.
 * @param {function} [options.onProgress] event handler.
 * @param {function} [options.onError] event handler.
 * @param {function} [options.onPasswordNeeded] event handler.
 * @param {function} [options.onPasswordFail] event handler.
 * @param {function} [options.onPasswordOK] event handler.
 * @param {function} [options.onStateChange] event handler.
 * @param {function} [options.onMetaReady] event handler. If meta data is loaded, callback is called.
 * @param {Number} [options.chunkSize] chunk size for download. First chunk must contain meta block. 256kB or 512kB is ideal.
 * @param {Number} [options.chunkSizeMax] Maximum chunk size.
 * @param {boolean} [options.chunkSizeAdaptive] True if the chunk size should be chosen in the adaptive manner.
 * @param {string} [options.url] direct URL for file to download.
 * @param {string} [options.proxyRedirUrl] proxy link for the file to download.
 * @param {EnigmaShareScheme} options.encScheme access token for google drive
 * @param {string|Array|*} [options.encKey] AES GCM master key, used only for debugging, scheme derives the key.
 * @param {object} [options.retry] Options for RetryHandler.
 * @constructor
 */
var EnigmaDownloader = function(options){
    var noop = function() {};

    this.token = options.token;

    this.onComplete = options.onComplete || noop;
    this.onProgress = options.onProgress || noop;
    this.onError = options.onError || noop;
    this.onPasswordNeeded = options.onPasswordNeeded || noop;
    this.onPasswordFail = options.onPasswordFail || noop;
    this.onPasswordOK = options.onPasswordOK || noop;
    this.onStateChange = options.onStateChange || noop;
    this.onMetaReady = options.onMetaReady;

    this.chunkSize = options.chunkSize || 262144*2; // All security relevant data should be present in the first chunk.
    this.offset = 0;
    this.downloaded = false;        // If file was downloaded entirely.
    this.encWrapDetected = false;   // Encryption tag encountered already? If yes, data goes through GCM layer.
    this.encWrapLength = undefined; // Length of encwrap block size.
    this.encWrapLengthProcessed = 0; // Length of encwrap processed block size.
    this.endTagDetected = false;    // True if TAG_ENC was detected in parsing.

    // Adaptive chunk setting.
    this.chunkSizePrefs = {};
    this.chunkSizePrefs.cur = this.chunkSize;
    this.chunkSizePrefs.min = 262144 * 2;
    this.chunkSizePrefs.max = options.chunkSizeMax || 1024 * 1024 * 8; // Larger may cause problems with RAM & Performance.
    this.chunkSizePrefs.maxAchieved = this.chunkSize;
    this.chunkSizePrefs.adaptive = options.chunkSizeAdaptive || false;

    this.retryHandler = new RetryHandler($.extend({maxAttempts: 10}, options.retry || {}));
    this.curState = EnigmaDownloader.STATE_INIT;
    this.downloadStarted = false;

    this.url = options.url;
    this.proxyRedirUrl = options.proxyRedirUrl;

    // Encryption related fields.
    this.encScheme = options.encScheme;             // EnigmaShareScheme for computing file encryption key.
    this.encKey = options.encKey;                   // bitArray with encryption key for AES-256-GCM.
    this.secCtx = undefined;                        // bitArray with security context, result of UO application.
    this.encryptionInitialized = false;             // If the security block was parsed successfully and system is ready for decryption.
    this.aes = undefined;                           // AES cipher instance to be used with GCM for data encryption.
    this.iv = undefined;                            // initialization vector for GCM, 1 block, 16B.
    this.gcm = undefined;                           // GCM encryption mode, initialized now.
    this.sha1Digest = new sjcl.hash.sha1();         // Hashing downloaded data - checksum.
    this.sha256Digest = new sjcl.hash.sha256();     // Hashing downloaded data - checksum.
    this.aad = [];                                  // Data to be authenticated with GCM tag.
    this.pngParser = undefined;                     // Parses input PNG file.
    this.inputParser = undefined;                   // Input file parser instance.

    // Construct first meta block now, compute file sizes.
    this.totalSize=-1;                              // Total size of the upload stream.
    this.downloadedSize=0;                          // Number of bytes downloaded so far.

    // Downloaded data buffering.
    this.cached = {};         // Data processing cache object.
    this.cached.offset = -1;  // Data start offset that is cached in the buff. Absolute data offset address of the first buff byte.
    this.cached.end = -1;     // Data end offset that is cached in the buff. Absolute data offset address of the last buff byte.
    this.cached.buff = [];    // Cached processed data buffer. Size = cached.end - cached.offset.

    // UMPHIO data buffering.
    this.plain = {};         // Data processing cache object.
    this.plain.buff = [];    // Cached processed data buffer. Size = cached.end - cached.offset.
    this.plain.totalSize = 0;// Total size of the buffer from the beginning. Accumulative.

    // Decrypted data buffering. Fed to TLV parser.
    this.dec = {};
    this.dec.totalSize = 0; // total size of decrypted buffer.
    this.dec.buff = [];

    // State of the TLV parser of the dec buffer.
    this.tps = {};
    this.tps.ctag = -1;
    this.tps.tlen = -1;
    this.tps.clen = 0;
    this.tps.cdata = [];

    // State of the TLV parser out of the ENCWRAP.
    this.tpo = {};
    this.tpo.ctag = -1;
    this.tpo.tlen = -1;
    this.tpo.clen = 0;
    this.tpo.cdata = [];

    // Array of ArrayBuffers with plain (decrypted) content.
    this.blobs = [];

    // HMAC-ing of the meta data.
    this.metaMacEngine = undefined; // Meta mac engine computes HMAC over meta data.
    this.metaMacOk = undefined; // Meta mac present & matches ==> true.
    this.metaMacShow = false; // If true then Meta HMAC was just verified and can be shown to the user (not shown before).

    // Extracted info.
    this.fsize = 0;             // Filesize.
    this.fname = undefined;     // Filename extracted from the meta block.
    this.fsizeMeta = undefined; // File size extracted from the meta block.
    this.mimetype = undefined;  // Mime type extracted from the meta block.
    this.uploadTime = undefined;// UTC milliseconds when the file was uploaded.
    this.sha1 = undefined;      // SHA1 checksum of the message.
    this.sha256 = undefined;    // SHA256 checksum of the message.
    this.extraMessage = undefined; // Extra text message shared with the file.
    this.passwordHint = undefined; // Unprotected password hint message.

    // Init.
    this.init_();
};

EnigmaDownloader.ERROR_CODE_PROXY_JSON = 1;
EnigmaDownloader.ERROR_CODE_PROXY_INVALID_URL = 2;
EnigmaDownloader.ERROR_CODE_INVALID_CHUNK_LEN = 3;
EnigmaDownloader.ERROR_CODE_PROXY_FAILED = 4;
EnigmaDownloader.STATE_INIT = 1;
EnigmaDownloader.STATE_PROXY_FETCH = 2;
EnigmaDownloader.STATE_SECURITY_BLOCK_PROCESSING = 3;
EnigmaDownloader.STATE_SECURITY_BLOCK_FINISHED = 4;
EnigmaDownloader.STATE_DOWNLOADING = 5;
EnigmaDownloader.STATE_PROCESSING = 6;
EnigmaDownloader.STATE_DONE = 7;
EnigmaDownloader.STATE_CANCELLED = 8;
EnigmaDownloader.STATE_ERROR = 9;
EnigmaDownloader.STATE_BACKOFF = 10;

/**
 * Initiate the upload.
 * Store file metadata, start resumable upload to obtain upload ID.
 */
EnigmaDownloader.prototype.fetch = function() {
    // TODO: implement multiple fetching strategies as described in the documentation.
    // TODO: split google drive download logic from the overall download logic. So it is usable also for dropbox & ...
    this.retryHandler.reset();
    this.changeState_(EnigmaDownloader.STATE_INIT);

    if (this.proxyRedirUrl) {
        this.fetchProxyRedir_();
    } else if (this.url) {
        this.fetchFile_();
    } else {
        throw new eb.exception.invalid("URL not valid");
    }
};

/**
 * Cancels current operation - mainly for cancelling backoff waiting.
 */
EnigmaDownloader.prototype.cancel = function() {
    this.retryHandler.cancel();
    this.changeState_(EnigmaDownloader.STATE_CANCELLED);
    // TODO: cancellation of download, decryption
    // TODO: handling of cancellation. Eventing?
};

/**
 * Initialization of the downloader.
 */
EnigmaDownloader.prototype.init_ = function() {
    this.pngParser = new eb.sh.pngParser();
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
    if (this.downloaded || this.endTagDetected){
        // Start processing of the download buffer.
        this.processDownloadBuffer_();
        return;
    }

    this.downloadStarted = true;
    this.changeState_(EnigmaDownloader.STATE_DOWNLOADING);

    // Start downloading a next chunk we don't have.
    var xhr = new XMLHttpRequest();
    var rangeHeader = "bytes=" + this.offset + "-" + (this.offset + this.chunkSizePrefs.cur - 1);

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
            this.chunkAdaptiveStep_(true);

            var arraybuffer = xhr.response;
            var downloadedLen = arraybuffer ? arraybuffer.byteLength : -1;
            var isLastChunk = downloadedLen < this.chunkSize || (this.totalSize > 0 && this.totalSize <= this.downloadedSize+downloadedLen);
            log(sprintf("Download done, size: %s, lastChunk: %s, downloadedPreviously: %s, offset: %s",
                downloadedLen, isLastChunk, this.downloadedSize, this.offset));

            if (downloadedLen < 0){
                log("Invalid downloaded length");
                this.onError({'reason':'Download length invalid', 'code':EnigmaDownloader.ERROR_CODE_INVALID_CHUNK_LEN});
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

    // Progress monitoring
    xhr.addEventListener('progress',
        this.progressHandler_.bind(this, {
            offset:this.offset,
            chunkSize:(this.chunkSize),
            total:this.totalSize
        })
    );

    this.chunkSize = this.chunkSizePrefs.cur;

    log(sprintf("Downloading file range: %s, total size: %s", rangeHeader, this.totalSize));
    xhr.responseType = "arraybuffer";
    xhr.send(null);
};

/**
 * Changes adaptive chunkSize value.
 * @param success
 * @private
 */
EnigmaDownloader.prototype.chunkAdaptiveStep_ = function(success){
    if (!this.chunkSizePrefs.adaptive){
        return;
    }

    if (success){
        this.chunkSizePrefs.cur = Math.min(this.chunkSizePrefs.max, this.chunkSizePrefs.cur*2);
    } else {
        this.chunkSizePrefs.cur = Math.max(this.chunkSizePrefs.min, this.chunkSizePrefs.cur/2);
    }
    this.chunkSizePrefs.maxAchieved = Math.max(this.chunkSizePrefs.maxAchieved, this.chunkSizePrefs.cur);
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
        this.cached.buff = eb.sh.misc.concatSelf(this.cached.buff, bitArray);

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
 * Returns expected header of the UMPHIO file.
 * @returns {bitArray}
 * @private
 */
EnigmaDownloader.prototype.getExpectedHeader_ = function(){
    var w = sjcl.bitArray;
    return w.concat(sjcl.codec.utf8String.toBits(EnigmaUploader.MAGIC_STRING), [w.partial(8, 1)]);
};

/**
 * Processing of the download buffer.
 * @private
 */
EnigmaDownloader.prototype.processDownloadBuffer_ = function(){
    var w = sjcl.bitArray;
    this.changeState_(EnigmaDownloader.STATE_PROCESSING);

    // If we are on the beginning of the stream, determine file type we are parsing.
    if (this.inputParser == undefined){
        // If there is not enough data for parser initialization, keep downloading.
        if (!this.downloaded && this.downloadedSize < 128){
            log("Not initialized, not enough data");
            this.bufferProcessed_();
            return;
        }

        // PNG, UMPHIO supported for now.
        var expectedHeader = this.getExpectedHeader_();
        var expectedHeaderBl = w.bitLength(expectedHeader);
        if (this.pngParser.isSupportedFormat(this.cached.buff)){
            log("Input is a PNG file");
            this.inputParser = this.pngParser_;

        } else if (w.equal(expectedHeader, w.clamp(this.cached.buff, expectedHeaderBl))){
            log("Input is raw UMPHIO file");
            this.inputParser = this.baseParser_;

        } else {
            throw new eb.exception.invalid("Unrecognized input file");
        }
    }

    // Pass downloaded data through parser.
    this.inputParser(this.cached, this.bufferProcessed_.bind(this), this.onPlainUpdated_.bind(this));
};

/**
 * Merges argument to the plain chunk & starts parsing of the plain buffer.
 *
 * @param buffer
 * @private
 */
EnigmaDownloader.prototype.onPlainUpdated_ = function(buffer){
    this.plain.buff = eb.sh.misc.concatSelf(this.plain.buff, buffer);
    this.plain.totalSize += sjcl.bitArray.bitLength(buffer)/8;

    // Start processing of the plain buffer.
    this.processPlainBuffer_();
};

/**
 * Simple parser of the raw UMPHIO file.
 *
 * @param {object} cached
 * @param {bitArray} cached.buff
 * @param {Number} cached.offset
 * @param {Number} cached.end
 * @param {Function} onNeedMoreData
 * @param {Function} onPlainUpdated
 * @private
 */
EnigmaDownloader.prototype.baseParser_ = function(cached, onNeedMoreData, onPlainUpdated){
    // Simply pass all downloaded data to the plain handler.
    var buffer = cached.buff;

    cached.offset = cached.end;
    cached.buff = [];

    onPlainUpdated(buffer);
};

/**
 * PNG parser
 * @param {object} cached
 * @param {bitArray} cached.buff
 * @param {Number} cached.offset
 * @param {Number} cached.end
 * @param {Function} onNeedMoreData
 * @param {Function} onPlainUpdated
 * @private
 */
EnigmaDownloader.prototype.pngParser_ = function(cached, onNeedMoreData, onPlainUpdated){
    // Use PNG parser to do the job.
    this.pngParser.process(cached, onNeedMoreData, onPlainUpdated);
};

/**
 * Processing of the download buffer.
 * @private
 */
EnigmaDownloader.prototype.processPlainBuffer_ = function(){
    var w = sjcl.bitArray;

    // If the first block has not been processed yet - process encryption block, get IV, encKey.
    if (!this.encryptionInitialized){
        // If there is not enough data for encryption initialization, keep downloading.
        if (!this.downloaded && this.plain.totalSize < 128){
            log("Not initialized, not enough data");
            this.bufferProcessed_();
            return;
        }

        // Read encryption block, process data.
        log("Reading encryption data.");
        this.processEncryptionBlock_();

        // Abort the processing. Encryption callback will call processing function again as
        // all key material is ready to use.
        return;
    }

    // If here, the buffer was processed until TAG_ENCWRAP.
    log(sprintf("ToProcess with parsers: buffSize: %s", w.bitLength(this.plain.buff)/8));

    // We still need to decrypt ENCWRAP block.
    // Finalizing will be done after finding TAG_GCMTAG.
    if (this.encWrapLengthProcessed < this.encWrapLength && w.bitLength(this.plain.buff) > 0){
        var toProcessSize = Math.min(this.encWrapLength - this.encWrapLengthProcessed, w.bitLength(this.plain.buff)/8);
        log(sprintf("To process with GCM: %s", toProcessSize));

        if (toProcessSize > 0){
            // Async decryption.
            var onDecrypted = (function(decrypted, last){
                // Merge decrypted data buffer with the previously decrypted data.
                this.mergeDecryptedBuffers_(decrypted);

                if (last){
                    // Slice of the GCM processed data from the download buffer, update state.
                    this.plain.buff = w.bitSlice(this.plain.buff, toProcessSize*8);
                    this.encWrapLengthProcessed += toProcessSize;

                    // Trigger processing of dec buffer.
                    this.processPlainBuffer_();
                }

            }).bind(this);

            // Start async decryption.
            this.decryptDataAsync_(w.clamp(this.plain.buff, toProcessSize*8), onDecrypted);
            return;
        }
    }

    // If there is some data in decrypted buffer, process it.
    if (w.bitLength(this.dec.buff) > 0){
        // Process decrypted data block.
        this.processDecryptedBlock_();
    }

    // Meta ready?
    if (this.metaMacShow){
        this.metaMacShow = false;
        if (this.onMetaReady){
            this.onMetaReady(this, this.processPlainBuffer_.bind(this), this.cancel.bind(this));
            // Do not process any further. Wait for signal we can process it.
            return;
        }
    }

    // If ENCWRAP processing completed and still any data left, process with another parser, for outer block.
    if (this.encWrapLengthProcessed >= this.encWrapLength && w.bitLength(this.plain.buff) > 0) {
        this.processOuterBlock_();
    }

    // Last step:
    // Download next chunk, if any.
    this.bufferProcessed_();
};

EnigmaDownloader.prototype.decryptDataAsync_ = function(ba, onChunkDone){
    // Trigger async cipher update.
    eb.sh.misc.updateCipherAsync(this.gcm, ba, onChunkDone, {async:true});
};

/**
 * Merge currently decrypted data with the decrypted buffer.
 * @param buffer
 * @private
 */
EnigmaDownloader.prototype.mergeDecryptedBuffers_ = function(buffer){
    this.dec.buff = eb.sh.misc.concatSelf(this.dec.buff, buffer);
    this.dec.totalSize += sjcl.bitArray.bitLength(buffer)/8;
};

/**
 * Processing decrypted data, TLV records.
 * @private
 */
EnigmaDownloader.prototype.processDecryptedBlock_ = function(){
    var decLen, cpos = 0, ctag = -1, lenToTagFinish = 0, toConsume = 0, w = sjcl.bitArray;
    decLen = w.bitLength(this.dec.buff)/8;
    log(sprintf("To parse decBlock: %s B", decLen));

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

            // If there is not enough data for parsing length field, abort parsing. We need more data then.
            var longLen = (ctag & 0x80) > 0;
            var lenBytes = longLen ? 8 : 4;
            var lenFnc = longLen ? eb.misc.deserialize64bit : w.extract32;
            if ((cpos + lenBytes) > decLen){
                log("Not enough bytes to parse the length field. Need more data");
                cpos -= 1; // Tag length, keep in the buffer.
                break;
            }

            this.tps.tlen = lenFnc(this.dec.buff, cpos*8);
            this.tps.clen = 0;
            cpos += lenBytes;

            if (this.tps.tlen < 0){
                throw new eb.exception.invalid("Negative length detected, field too big");
            }

            // Parser can accept this tag, change the parser state.
            this.tps.ctag = ctag;
            this.tps.cdata = [];
        }

        // Check if we can process it all in one.
        // If not, add data to the cdata buffer and wait until we can process it all in one (unless we can process it
        // in a streaming fashion - or skip in case of the padding).
        lenToTagFinish = this.tps.tlen - this.tps.clen;
        toConsume = Math.min(lenToTagFinish, decLen - cpos);

        // Padding can be processed in the streaming fashion.
        if (this.tps.ctag == EnigmaUploader.TAG_PADDING){
            cpos += toConsume;

            // Current tag parsed? tlen==clen? -> reset tag.
            this.tps.clen += toConsume;
            continue;
        }

        // TAG_ENC can be processed in the streaming fashion.
        if (this.tps.ctag == EnigmaUploader.TAG_ENC){
            var fileData = w.bitSlice(this.dec.buff, cpos*8, (cpos+toConsume)*8);
            var csize = w.bitLength(fileData)/8;

            // Async hashing.
            this.hashDataAsync_(fileData);

            var arrayBuffer = sjcl.codec.arrayBuffer.fromBits(fileData, 0, 0);
            log(sprintf("Processing %s B of data, totally have: %s. ArrayBuffer: %s B", csize, this.fsize + csize, arrayBuffer.byteLength));

            fileData = undefined;
            this.blobs.push(arrayBuffer);
            this.fsize += csize;

            cpos += csize;
            this.tps.clen += csize;
            continue;
        }

        // Process tag with defined length which can be processed only when the whole buffer is loaded.
        // Add toConsume bytes to the cdata buffer.
        this.tps.cdata = eb.sh.misc.concatSelf(this.tps.cdata, w.bitSlice(this.dec.buff, cpos*8, (cpos+toConsume)*8));

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

            case EnigmaUploader.TAG_TIME:
                if (this.tps.tlen == 8){
                    this.uploadTime = eb.misc.deserialize64bit(this.tps.cdata);
                    if (this.uploadTime > eb.misc.MAX_SAFE_INTEGER){
                        throw new eb.exception.invalid("Upload timestamp too big");
                    }
                }

                break;

            case EnigmaUploader.TAG_FSIZE:
                if (this.tps.tlen == 8){
                    this.fsizeMeta = eb.misc.deserialize64bit(this.tps.cdata);
                    if (this.fsizeMeta > eb.misc.MAX_SAFE_INTEGER){
                        throw new eb.exception.invalid("File size too big");
                    }
                }

                break;
            case EnigmaUploader.TAG_MSG:
                this.extraMessage = sjcl.codec.utf8String.fromBits(this.tps.cdata);
                break;

            case EnigmaUploader.TAG_METAMAC:
                if (this.metaMacEngine) {
                    this.metaMacOk = w.equal(this.tps.cdata, this.metaMacEngine.digest());
                    this.metaMacEngine = undefined; // Block from further HMAC-ing.
                    this.metaMacShow = this.metaMacOk; // For simplicity, finish decrypted block processing.
                }
                break;

            default:
                log(sprintf("Unsupported tag detected: %s, len: %s", this.tps.ctag, this.tps.clen));
                break;
        }

        //Update Meta MAC
        if (this.metaMacEngine
            &&  (this.tps.ctag & 0x80) == 0
            && !(this.tps.ctag in [EnigmaUploader.TAG_ENC, EnigmaUploader.TAG_METAMAC]))
        {
            // update: (TAG-1B | LEN-4B | DATA)
            this.metaMacEngine.update(w.concat([w.partial(8, this.tps.ctag)], [this.tps.tlen]));
            this.metaMacEngine.update(this.tps.cdata);
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
 * Async hash computation.
 *
 * @param fileData
 * @private
 */
EnigmaDownloader.prototype.hashDataAsync_ = function(fileData) {
    eb.sh.misc.updateHashAsync([this.sha1Digest, this.sha256Digest], fileData, undefined, {async:true});
};

/**
 * Processing decrypted data, TLV records.
 * @private
 */
EnigmaDownloader.prototype.processOuterBlock_ = function(){
    var bufLen, cpos = 0, ctag = -1, lenToTagFinish = 0, toConsume = 0, w = sjcl.bitArray;
    bufLen = w.bitLength(this.plain.buff)/8;
    log(sprintf("To parse outerBlock: %s B", bufLen));

    if (bufLen < 0){
        return;
    }

    // Parser is fed with the downloaded data buffer.
    // This parser is stateful, processes data in a streaming mode, keeps state across multiple requests.
    do {
        // End of the buffer?
        if (cpos == bufLen){
            log("End of the cache buffer");
            break;
        }
        if (cpos > bufLen){
            log("Invalid buffer state");
            throw new eb.exception.invalid("Invalid plain buffer state");
        }

        // Previous tag can be closed?
        if (this.tpo.tlen == this.tpo.clen){
            this.tpo.ctag = -1;
        }

        // Process the buffer. We may be left in the state from the previous processing - unfinished tag processing.
        if (this.tpo.ctag == -1){
            // Previous tag finished cleanly, read the next tag + length field (if applicable).
            ctag = w.extract(this.plain.buff, cpos*8, 8);
            cpos += 1;

            // Check for weird tags that should not be present in this buffer.
            if (ctag == EnigmaUploader.TAG_ENCWRAP || ctag == EnigmaUploader.TAG_SEC || ctag == EnigmaUploader.TAG_ENC){
                throw new eb.exception.invalid("Invalid tag detected");
            }

            // If there is not enough data for parsing length field, abort parsing. We need more data then.
            var longLen = (ctag & 0x80) > 0;
            var lenBytes = longLen ? 8 : 4;
            var lenFnc = longLen ? eb.misc.deserialize64bit : w.extract32;
            if ((cpos + lenBytes) > bufLen){
                log("Not enough bytes to parse the length field. Need more data");
                cpos -= 1; // Tag length, keep in the buffer.
                break;
            }

            this.tpo.tlen = lenFnc(this.plain.buff, cpos*8);
            this.tpo.clen = 0;
            cpos += lenBytes;

            if (this.tpo.tlen < 0){
                throw new eb.exception.invalid("Negative length detected, field too big");
            }

            // Parser can accept this tag, change the parser state.
            this.tpo.ctag = ctag;
            this.tpo.cdata = [];
        }

        // Check if we can process it all in one.
        // If not, add data to the cdata buffer and wait until we can process it all in one (unless we can process it
        // in a streaming fashion - or skip in case of the padding).
        lenToTagFinish = this.tpo.tlen - this.tpo.clen;
        toConsume = Math.min(lenToTagFinish, bufLen - cpos);

        // Padding can be processed in the streaming fashion.
        if (this.tpo.ctag == EnigmaUploader.TAG_PADDING){
            cpos += toConsume;

            // Current tag parsed? tlen==clen? -> reset tag.
            this.tpo.clen += toConsume;
            continue;
        }

        // Process tag with defined length which can be processed only when the whole buffer is loaded.
        // Add toConsume bytes to the cdata buffer.
        this.tpo.cdata = eb.sh.misc.concatSelf(this.tpo.cdata, w.bitSlice(this.plain.buff, cpos*8, (cpos+toConsume)*8));

        cpos += toConsume;
        this.tpo.clen += toConsume;
        if (this.tpo.clen != this.tpo.tlen){
            log("Not enough data");
            continue;
        }

        // Tag was processed completely.
        switch(this.tpo.ctag){
            case EnigmaUploader.TAG_GCMTAG:
                log("GCM tag found");
                // Finalize with tag data.
                // If tag is invalid, exception is thrown from finalize()
                var finalBlock = this.gcm.finalize(this.tpo.cdata, {returnTag:true});

                // Merge decrypted data buffer with the previously decrypted data.
                this.mergeDecryptedBuffers_(finalBlock.data);

                // Finish processing of decrypted buffer.
                this.processDecryptedBlock_();
                break;

            case EnigmaUploader.TAG_END:
                log("END tag found");
                this.endTagDetected = true;
                break;

            default:
                log(sprintf("Unsupported tag detected: %s, len: %s", this.tpo.ctag, this.tpo.clen));
                break;
        }
    } while(!this.endTagDetected);

    // Slice off the processed part of the buffer.
    this.plain.buff = w.bitSlice(this.plain.buff, cpos*8);
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
    var cpos=0, ctag=-1, tlen=-1, secBlock, w=sjcl.bitArray, bufLen = w.bitLength(this.plain.buff)/8;

    // Header check. Magic string. In future here we can process PNGs, PDFs, ...
    var expectedHeader = this.getExpectedHeader_();
    var expectedHeaderBl = w.bitLength(expectedHeader);
    if (!w.equal(expectedHeader, w.clamp(this.plain.buff, expectedHeaderBl))){
        throw new eb.exception.invalid("Unrecognized input file");
    }
    cpos += expectedHeaderBl/8;

    // AAD building - authenticate magic string + version + security context.
    this.aad = expectedHeader;

    // Process tags.
    do {
        if (cpos > bufLen){
            throw new eb.exception.invalid("Input data invalid - reading out of bounds");
        } else if (cpos == bufLen){
            break;
        }

        // Get tag.
        ctag = w.extract(this.plain.buff, cpos*8, 8);
        cpos += 1;
        switch(ctag){
            case EnigmaUploader.TAG_ENCWRAP:
                tlen = eb.misc.deserialize64bit(this.plain.buff, cpos*8);
                cpos += 8;
                this.encWrapDetected = true;
                this.encWrapLength = tlen;
                log(sprintf("ENCWRAP detected, pos: %s", cpos));
                break;

            case EnigmaUploader.TAG_PADDING:
                tlen = w.extract32(this.plain.buff, cpos*8);
                cpos += EnigmaUploader.LENGTH_BYTES + tlen;
                break;

            case EnigmaUploader.TAG_SEC:
                tlen = w.extract32(this.plain.buff, cpos*8);
                cpos += EnigmaUploader.LENGTH_BYTES;
                if (this.encryptionInitialized || secBlock !== undefined){
                    throw new eb.exception.invalid("Sec block already seen");
                }

                secBlock = w.bitSlice(this.plain.buff, cpos*8, (cpos+tlen)*8);
                cpos += tlen;

                if (w.bitLength(secBlock) != tlen*8){
                    throw new eb.exception.invalid("Sec block size does not match");
                }

                break;

            default:
                var longLen = (ctag & 0x80) > 0;
                if (longLen){
                    tlen = eb.misc.deserialize64bit(this.plain.buff, cpos*8);
                    cpos += 8 + tlen;
                } else {
                    tlen = w.extract32(this.plain.buff, cpos * 8);
                    cpos += EnigmaUploader.LENGTH_BYTES + tlen;
                }
                log(sprintf("Unsupported tag detected: %s, len: %s", ctag, tlen));
                break;
        }

    } while(!this.encWrapDetected);

    // Throw an exception if ENCWRAP was not detected by the end of this call. Simple parser.
    if (!this.encWrapDetected){
        throw new eb.exception.invalid("ENCWRAP tag was not detected in the data. Parser does not support chunked data");
    }

    // Slice off the processed part of the buffer.
    this.plain.buff = w.bitSlice(this.plain.buff, cpos*8);

    if (secBlock === undefined){
        throw new eb.exception.invalid("Security block not found");
    }

    this.aad = w.concat(this.aad, [w.partial(8, EnigmaUploader.TAG_SEC)]);
    this.aad = w.concat(this.aad, [w.bitLength(secBlock)/8]);
    this.aad = w.concat(this.aad, secBlock);
    this.processSecCtx_(secBlock);
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
    this.iv = w.clamp(buffer, 16*8);
    cpos += 16;

    // Security context, contains decryption key, wrapped.
    this.secCtx = w.bitSlice(buffer, cpos*8);
    log(sprintf("IV: %s", eb.misc.inputToHex(this.iv)));
    log(sprintf("SecCtx: %s", eb.misc.inputToHex(this.secCtx)));

    this.encScheme.onComplete = (function(data){
        this.encKey = this.encScheme.fKey;
        log(sprintf("Scheme finished. encKey: %s", eb.misc.inputToHex(this.encKey)));

        // Initialize cipher, engines.
        this.aes = new sjcl.cipher.aes(this.encKey);    // AES cipher instance to be used with GCM for data encryption.
        this.gcm = sjcl.mode.gcmProgressive.create(this.aes, false, this.iv, this.aad, 128); // GCM encryption mode, initialized now.
        this.metaMacEngine = new sjcl.misc.hmac(sjcl.hash.sha256.hash(w.concat(this.encKey, sjcl.codec.utf8String.toBits("metahmac"))));
        this.encryptionInitialized = true;

        // Finish the processing of current download chunk. Continues in download operation.
        this.changeState_(EnigmaDownloader.STATE_SECURITY_BLOCK_FINISHED);
        this.processPlainBuffer_();

    }).bind(this);

    this.encScheme.onError = (function(data){
        log("Failed to compute encryption key.");
        this.onError(data);
    }).bind(this);

    this.encScheme.onPasswordNeeded = (function(data){
        this.onPasswordNeeded(data);
    }).bind(this);

    this.encScheme.onPasswordOK = (function(data){
        this.onPasswordOK(data);
    }).bind(this);

    this.encScheme.onPasswordFail = (function(data){
        this.onPasswordFail(data);
    }).bind(this);

    // Process security block, async call.
    this.changeState_(EnigmaDownloader.STATE_SECURITY_BLOCK_PROCESSING);
    this.encScheme.process(this.secCtx);
};

/**
 * Function called when password is entered by the user and should be tried by the encryption scheme.
 * This function can be called only after callback onPasswordNeeded was signaled.
 * @param password
 */
EnigmaDownloader.prototype.tryPassword = function(password){
    this.encScheme.passwordProvided(password);
};

/**
 * On downloaded data is processed.
 * Invokes new file chunk download.
 * @private
 */
EnigmaDownloader.prototype.bufferProcessed_ = function(){
    // All buffers processed, nothing to process more.
    // If downloading is not completed yet, fetch the next chunk of the data.
    if (!this.downloaded && !this.endTagDetected){
        this.fetchFile_();
    }

    // Once the download is completed, signalize process has finished.
    if (this.downloaded && this.endTagDetected) {
        // If hash is computed in async way, enqueue so we know for sure the last block was updated.
        // Same for onComplete() invocation. After all tasks were processed before, then process onComplete task.
        eb.sh.misc.async((function (){
            if (!this.sha1){
                this.sha1 = this.sha1Digest.finalize();
            }

            if (!this.sha256){
                this.sha256 = this.sha256Digest.finalize();
            }
            this.onComplete();
        }).bind(this));
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
    var xhr = new XMLHttpRequest();

    xhr.open("GET", this.proxyRedirUrl, true);
    xhr.onload = function(e) {
        if (e.target.status < 400) {
            this.retryHandler.reset();
            try {
                var json = JSON.parse(xhr.responseText);
                console.log(json);

            } catch(e){
                log("Exception when processing the JSON response: " + e);
                this.onDownloadError_({'reason':'Could not fetch the file information', 'exception': e, 'code':EnigmaDownloader.ERROR_CODE_PROXY_JSON});
                return;
            }

            if (!json.url){
                this.onDownloadError_({'reason':'Could not fetch the file information', 'code':EnigmaDownloader.ERROR_CODE_PROXY_INVALID_URL});
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
            this.onDownloadError_({'e': e, 'reason':'Could not fetch the file information', 'code':EnigmaDownloader.ERROR_CODE_PROXY_FAILED});
        }
    }.bind(this);
    xhr.onerror = this.onDownloadError_.bind(this);

    this.changeState_(EnigmaDownloader.STATE_PROXY_FETCH);
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
    if (e && e.target && e.target.status && e.target.status < 400) {
        this.changeState_(EnigmaDownloader.STATE_ERROR);
        this.onError(e.target.response);
    } else {
        this.chunkAdaptiveStep_(false);
        this.changeState_(EnigmaDownloader.STATE_BACKOFF);
        this.retryHandler.retry(this.resume_.bind(this));
    }
};

/**
 * Handles errors for the initial request / proxy request.
 *
 * @private
 * @param {object} data aux data
 */
EnigmaDownloader.prototype.onDownloadError_ = function(data) {
    if (this.retryHandler.limitReached()){
        this.changeState_(EnigmaDownloader.STATE_ERROR);
        this.onError(data);
    } else {
        this.changeState_(EnigmaDownloader.STATE_BACKOFF);
        this.retryHandler.retry(this.fetchProxyRedir_.bind(this));
    }
};

EnigmaDownloader.prototype.progressHandler_ = function(meta, evt){
    this.onProgress(evt, meta);
};

EnigmaDownloader.prototype.changeState_ = function(newState, data){
    this.curState = newState;
    this.onStateChange({'state':newState, data:data||{}});
};
