<?php
$reqEnc = 'https://site1.enigmabridge.com:11180/1.0/TEST_API000000007d/ProcessData/0419b9a2fcae6edd/Packet0_PLAINAES_0000d4e4748b78444d4e2e3f5a51b03c4b087041e7b29a5924e65b5880c9886115a560332bf8e2d4064ca37e273fd0ba4a06';
$reqDec = 'https://site1.enigmabridge.com:11180/1.0/TEST_API000000007f/ProcessData/7d555e4e2f13a2cb/Packet0_PLAINAESDECRYPT_00000c85a521509775382a1e9c59862312c36bd61a6d7e64f2269df05b6ee73a04729f9e2b6c0e646544c39452cac313cd1d';

visit($reqEnc);
visit($reqDec);
sleep(5);

visit($reqEnc);
visit($reqDec);
sleep(10);

visit($reqEnc);
visit($reqDec);


function visit($url){
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    $response = curl_exec($ch);
    $error = curl_errno($ch);
    if ($error != 0){
        echo 'Curl error: ' . curl_error($ch) . ' on url: ' . $url . "\n";
    }

    curl_close($ch);
}
