<?php
// Enable CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the target URL
$url = isset($_GET['url']) ? $_GET['url'] : null;

if (!$url) {
    http_response_code(400);
    echo json_encode(['error' => 'URL parameter is required']);
    exit();
}

// Initialize cURL session
$ch = curl_init($url);

// Set cURL options for streaming
curl_setopt($ch, CURLOPT_WRITEFUNCTION, 'stream_output'); // Callback for streaming
curl_setopt($ch, CURLOPT_HEADER, false); // Exclude headers from the output
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_BUFFERSIZE, 1024); // Small buffer for chunked data

// Fetch headers separately
curl_setopt($ch, CURLOPT_HEADERFUNCTION, 'process_headers');

// Disable PHP output buffering
ob_implicit_flush(true);
ob_end_flush();
flush();

// Execute the request
$response = curl_exec($ch);

// Check for errors
if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL error: ' . curl_error($ch)]);
}

curl_close($ch);

// Callback to process headers
function process_headers($ch, $header) {
    // Extract status code
    static $status_code = 0;
    if (strpos($header, 'HTTP/') === 0) {
        $status_code = (int)explode(' ', $header)[1];
        header("Proxy-Status: $header"); // Optional: Log status
    }

    // Pass through relevant headers (e.g., Content-Type, Content-Length)
    $allowed_headers = ['Content-Type', 'Content-Length', 'Cache-Control'];
    foreach ($allowed_headers as $key) {
        if (stripos($header, $key . ':') === 0) {
            header($header);
            break;
        }
    }

    return strlen($header);
}

// Callback to stream output
function stream_output($ch, $data) {
    echo $data;
    flush(); // Send data immediately
    return strlen($data);
}
?>