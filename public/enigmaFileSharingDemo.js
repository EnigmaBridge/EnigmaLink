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
    clientId: '1044449456843-q4lt3nk61gulb67irbr45jvcr2siqfks.apps.googleusercontent.com',
    ebConfigUpload: {
        remoteEndpoint:'site2.enigmabridge.com',
        userObjectId: 'EE01',
        method:       'PLAINAES',
        encKey:       'e134567890123456789012345678901234567890123456789012345678901234',
        macKey:       'e224262820223456789012345678901234567890123456789012345678901234'
    },
    ebConfigDownload: {
        remoteEndpoint:'site2.enigmabridge.com',
        userObjectId: 'EE02',
        method:       'PLAINAES',
        encKey:       'e134567890123456789012345678901234567890123456789012345678901234',
        macKey:       'e224262820223456789012345678901234567890123456789012345678901234'
    }
};

shareConfig.sharedFolderQuery = {
        'q': "mimeType='application/vnd.google-apps.folder'" +
        " and name='" + shareConfig.shareFolderName + "' " +
        " and trashed=false " +
        " and 'root' in parents",
        'fields': "nextPageToken, files(id, name)"
};

shareConfig.shareFolderCreate = {
    resource: {
        'name' : shareConfig.shareFolderName,
        'mimeType' : 'application/vnd.google-apps.folder'
    },
    fields: 'id'
};

function getProxyRedirLink(fileId){
    //return sprintf("http://deadcode.me/proxy-redir.php?id=%s", encodeURIComponent(fileId));
    return sprintf("https://expert.enigmabridge.com/cgi-bin/proxy-redir.php?id=%s", encodeURIComponent(fileId));
}

