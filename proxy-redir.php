<?php
//    PHP following location redirect.
//    Motivation:
//
//    HTTP Status for: "https://drive.google.com/uc?export=download&id=0B4ObafdOo3JwbWtYa2ZjNWxRUk0"
//
//    HTTP/1.0 302 Moved Temporarily
//    Content-Type: text/html; charset=UTF-8
//    Cache-Control: no-cache, no-store, max-age=0, must-revalidate
//    Pragma: no-cache
//    Expires: Mon, 01 Jan 1990 00:00:00 GMT
//    Date: Mon, 16 May 2016 12:31:40 GMT
//    Location: https://doc-00-a8-docs.googleusercontent.com/docs/securesc/ha0ro937gcuc7l7deffksulhg5h7mbp1/o67lipkenkdscrb093772hg3cvptel00/1463400000000/03824231233236046308/*/0B4ObafdOo3JwbWtYa2ZjNWxRUk0?e=download
//    P3P: CP="This is not a P3P policy! See https://support.google.com/accounts/answer/151657?hl=en for more info."
//    X-Content-Type-Options: nosniff
//    X-Frame-Options: SAMEORIGIN
//    X-XSS-Protection: 1; mode=block
//    Server: GSE
//    Set-Cookie: NID=79=aZdIAPcmfNJegSmVGgWvn14auo1uc4u-UwDFwiwtPMPZhjwMbcNTTP8g_nc1wvfQqnrX500JZI24L4FMfnmJyqo7jxva1wnLEeLe9ZUJm-mkHvd5HBs1rsRVWoiYoT8q;Domain=.google.com;Path=/;Expires=Tue, 15-Nov-2016 12:31:40 GMT;HttpOnly
//    Alternate-Protocol: 443:quic
//    Alt-Svc: quic=":443"; ma=2592000; v="33,32,31,30,29,28,27,26,25"
//    Accept-Ranges: none
//    Vary: Accept-Encoding
//
//    HTTP/1.0 200 OK
//    X-GUploader-UploadID: AEnB2UrrK4ETC0yBhk8Qicj2TE6lb8daG0mkaMbzgM467nqYU-8iUTJS8qE3ZrG36nAR7_5zMm_OpiLZHin8_NNXa-z1orscTw
//    Access-Control-Allow-Origin: *
//    Access-Control-Allow-Credentials: false
//    Access-Control-Allow-Methods: GET,OPTIONS
//    Content-Type: application/octet-stream
//    Content-Disposition: attachment;filename="uf7bv2kqsdro";filename*=UTF-8''uf7bv2kqsdro
//    Date: Mon, 16 May 2016 12:31:40 GMT
//    Expires: Mon, 16 May 2016 12:31:40 GMT
//    Cache-Control: private, max-age=0
//    X-Goog-Hash: crc32c=4Dbqog==
//        Content-Length: 1024
//    Server: UploadServer
//    Alternate-Protocol: 443:quic
//    Alt-Svc: quic=":443"; ma=2592000; v="33,32,31,30,29,28,27,26,25"

$id = getReq('id');
$mode = getReq('mode', 1);
$fetchLen = getReq('fetchLen', 1);
$fetchChunk = getReq('fetchChunk', -1);

if (empty($id)){
    $id = "0B4ObafdOo3JwbWtYa2ZjNWxRUk0";
//    header($_SERVER["SERVER_PROTOCOL"]." 404 Not Found", true, 404);
//    die("ID not specified");
}

if ($fetchChunk > 1024*256){
    $fetchChunk = 1024*256;
}

$tstart = microtime(true);
$url = "https://drive.google.com/uc?export=download&id=" . urlencode($id);

// CORS
$ourHeaders = 'X-Content-Range, X-Content-Length, X-Total-Length, X-Time-Elapsed, X-Redir, X-Cookies';

header('Access-Control-Allow-Origin: *'); // TODO: add our domains.
header('Access-Control-Allow-Credentials: false');
header('Access-Control-Allow-Methods: GET,OPTIONS');
header('Access-Control-Allow-Headers: Accept, Accept-Language, Authorization, Cache-Control, Content-Disposition, Content-Encoding, Content-Language, Content-Length, Content-MD5, Content-Range, Content-Type, Date, GData-Version, Host, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since, Origin, OriginToken, Pragma, Range, Slug, Transfer-Encoding, Want-Digest, X-ClientDetails, X-GData-Client, X-GData-Key, X-Goog-AuthUser, X-Goog-PageId, X-Goog-Encode-Response-If-Executable, X-Goog-Correlation-Id, X-Goog-Request-Info, X-Goog-Experiments, x-goog-iam-authority-selector, x-goog-iam-authorization-token, X-Goog-Spatula, X-Goog-Upload-Command, X-Goog-Upload-Content-Disposition, X-Goog-Upload-Content-Length, X-Goog-Upload-Content-Type, X-Goog-Upload-File-Name, X-Goog-Upload-Offset, X-Goog-Upload-Protocol, X-Goog-Visitor-Id, X-HTTP-Method-Override, X-JavaScript-User-Agent, X-Pan-Versionid, X-Origin, X-Referer, X-Upload-Content-Length, X-Upload-Content-Type, X-Use-HTTP-Status-Code-Override, X-Ios-Bundle-Identifier, X-Android-Package, X-YouTube-VVT, X-YouTube-Page-CL, X-YouTube-Page-Timestamp, ' . $ourHeaders);
header('Access-Control-Expose-Headers: Content-Encoding, Content-Language, Content-Length, Content-MD5, Content-Range, Content-Type, Date, GData-Version, Host, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since, Origin, OriginToken, Pragma, Range, Slug, Transfer-Encoding, Want-Digest, ' . $ourHeaders);

// Do the request to obtain redirected address.
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
setCommonCurl($ch);

$response = curl_exec($ch);

// Get & parse headers.
$bh = explode("\r\n\r\n", $response, 3);
$header = parseHeaders($bh[0]);
$status = $header['status'];
if ($header['status']==100){ //use the other "header"
    $header=parseHeaders($bh[1]);
}

if ($status!=302){
    die("{'status': 'error', 'error':'Unsupported'}");
}

if ($mode == 2) {
    header('Location: ' . $header['Location'][0], true, 302);
} else {
    header("HTTP/1.1 200 OK");
}

// Construct response JSON.
$json = new stdClass();
$json->status = 'ok';
$json->url = $header['Location'][0];
if (isset($header['Set-Cookie'])) {
    $json->cookie = $header['Set-Cookie'];
}

// Get length - if applicable
if ($fetchLen == 1){
    $json->size = getFileSizeRange($json->url, $ch);

} else if ($fetchLen == 2){
    $json->size = getFileSizeHead($json->url, $ch);
}

// Cookies, location
setHeaderIfAny($header, 'Set-Cookie', 'X-Cookies');
header('X-Redir: ' . $json->url);
if ($fetchLen>0){
    header('X-Total-Length: ' . $json->size);
}

//$json->headers = print_r($header, true);
if ($fetchChunk <= 0) {
    // No chunk proxy download - output JSON.
    $json->elapsed = microtime(true) - $tstart;
    die(json_encode($json));
}

// Output downloaded chunk.
getFileChunk($json->url, 0, $fetchChunk);
$json->elapsed = microtime(true) - $tstart;

// ---------------------------------------------------------------------------------------------------------------------
// TODO: Streaming proxy read with: CURLOPT_WRITEFUNCTION,
// TODO: Streaming: http://stackoverflow.com/questions/10991443/curl-get-remote-file-and-force-download-at-same-time

/**
 * Function to get a range of bytes from the remote file
 *
 * @param $file
 * @param $start
 * @param $end
 */
function getFileChunk($file, $start, $end){
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $file);
    curl_setopt($ch, CURLOPT_RANGE, $start.'-'.$end);
    curl_setopt($ch, CURLOPT_BINARYTRANSFER, 1);
    curl_setopt($ch, CURLOPT_WRITEFUNCTION, 'chunkFnc');
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, 'headerFnc');
    // CURLOPT_HEADER = NO.

    $result = curl_exec($ch);
    curl_close($ch);
}

/**
 * CURLOPT_HEADERFUNCTION
 * Modifies global state.
 *
 * @param $ch
 * @param $hdr
 * @return int
 */
function headerFnc($ch, $hdr){
    global $json;
    $header = parseHeaders($hdr);
    if (isset($header['Content-Range'])){
        $json->size = intval(explode("/", $header['Content-Range'][0], 2)[1]);
        header('X-Total-Length: ' . $json->size);
        header('X-Content-Range: ' . $header['Content-Range'][0]);
    }
    setHeaderIfAny($header, 'Content-Disposition');
    setHeaderIfAny($header, 'Content-Encoding');
    setHeaderIfAny($header, 'Content-Type');

    return strlen($hdr);
}

/**
 * CURLOPT_WRITEFUNCTION, outputs loaded chunk to the browser.
 *
 * @param $ch
 * @param $str
 * @return int
 */
function chunkFnc($ch, $str) {
    print($str);
    return strlen($str);
}

/**
 * Tries to fetch size of the file using Range request.
 *
 * @param $url
 * @return int
 */
function getFileSizeRange($url, $ch=null){
    if (empty($ch)){
        $ch = curl_init();
    }

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_RANGE, "0-0");
    setCommonCurl($ch);
    $response = curl_exec($ch);
    //var_dump($response);

    // Get & parse headers.
    $bh = explode("\r\n\r\n", $response, 3);
    $header = parseHeaders($bh[0]);
    $status = $header['status'];
    if ($header['status']==100){ //use the other "header"
        $header=parseHeaders($bh[1]);
    }

    if (empty($header['Content-Range'])){
        return -1;
    }

    return intval(explode("/", $header['Content-Range'][0], 2)[1]);
}

/**
 * Tries to fetch size of the file using HEAD request.
 *
 * @param $url
 * @return int
 */
function getFileSizeHead($url, $ch=null){
    if (empty($ch)){
        $ch = curl_init();
    }

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);

    setCommonCurl($ch);
    $res = curl_exec($ch);
    //var_dump($res);

    $size = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
    return intval($size);
}

/**
 * Common cURL settings.
 * @param $ch
 */
function setCommonCurl($ch){
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
}

/**
 * Reads _REQUEST
 * @param $param
 * @param $default
 */
function getReq($param, $default = null){
    return isset($_REQUEST[$param]) ? $_REQUEST[$param] : $default;
}

/**
 * Sets header to current connection if present in the header array.
 */
function setHeaderIfAny($headers, $header, $auxSetHeader=null){
    if (!isset($headers[$header])){
        return;
    }

    foreach($headers[$header] as $value){
        header($header . ': ' . $value);
        if (!empty($auxSetHeader)){
            header($auxSetHeader . ': ' . $value);
        }
    }
}

/**
 * Parse a set of HTTP headers
 *
 * @param array The php headers to be parsed
 * @param [string] The name of the header to be retrieved
 * @return A header value if a header is passed;
 *         An array with all the headers otherwise
 */
function parseHeaders($headers, $header = null)
{
    $output = array();
    $headers = explode("\r\n", $headers);

    if ('HTTP' === substr($headers[0], 0, 4)) {
        list(, $output['status'], $output['status_text']) = explode(' ', $headers[0]);
        unset($headers[0]);
    }

    foreach ($headers as $v) {
        $h = preg_split('/:\s*/', $v, 2);
        $output[$h[0]][] = $h[1];
    }

    if (null !== $header) {
        if (isset($output[$header])) {
            return $output[$header];
        }

        return;
    }

    return $output;
}


