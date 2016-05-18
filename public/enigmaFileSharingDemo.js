"use strict";
var defaults = {
    site: 'site2.enigmabridge.com',
    site1: 'site1.enigmabridge.com',
    site2: 'site2.enigmabridge.com'
};

// configuration
var shareConfig = {
    baseUrl: 'https://expert.enigmabridge.com/sharing',
    shareFolderName: 'EnigmaShares',
    clientId: '1044449456843-q4lt3nk61gulb67irbr45jvcr2siqfks.apps.googleusercontent.com'
};

function getProxyRedirLink(fileId){
    //return sprintf("http://deadcode.me/proxy-redir.php?id=%s", encodeURIComponent(fileId));
    return sprintf("https://expert.enigmabridge.com/cgi-bin/proxy-redir.php?id=%s", encodeURIComponent(fileId));
}

