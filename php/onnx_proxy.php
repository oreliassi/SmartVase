<?php

ini_set('display_errors', 1);
error_log("ONNX Proxy request received: " . $_SERVER['REQUEST_METHOD'] . " " . $_GET['endpoint']);


header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}


$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';


$api_base_url = 'https://onnx-api.onrender.com/';


$url = $api_base_url . $endpoint;


error_log("Forwarding to: " . $url);


$input = file_get_contents('php://input');


$ch = curl_init($url);


curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15); // Increased timeout
curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Increased timeout


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    curl_setopt($ch, CURLOPT_HTTPGET, true);
}


$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);


if (curl_errno($ch)) {
    error_log("cURL Error: " . curl_error($ch));
    echo json_encode(['error' => 'Curl error: ' . curl_error($ch)]);
    exit;
}


error_log("Response code: " . $httpCode);


curl_close($ch);


http_response_code($httpCode);

echo $response;