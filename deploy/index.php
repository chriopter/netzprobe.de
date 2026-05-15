<?php
$logFile = '/tmp/netzprobe-deploy.log';
$log = function($message) use ($logFile) {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $message . "\n", FILE_APPEND);
};

$secretFile = '/var/www/netzprobe/deploy/.secret';
$deployScript = '/var/www/netzprobe/deploy/deploy';
$maxPayloadBytes = 4096;

$log('Webhook received');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    die('Method not allowed');
}

if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $maxPayloadBytes) {
    http_response_code(413);
    $log('Payload too large');
    die('Payload too large');
}

if (!file_exists($secretFile)) {
    http_response_code(500);
    $log('Missing secret file');
    die('Missing secret');
}

$secret = trim(file_get_contents($secretFile));
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

if (!$signature) {
    http_response_code(403);
    $log('Missing signature');
    die('No signature');
}

$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
if (!hash_equals($expected, $signature)) {
    http_response_code(403);
    $log('Invalid signature');
    die('Invalid signature');
}

$data = json_decode($payload, true);
if (!is_array($data)) {
    http_response_code(400);
    $log('Invalid JSON');
    die('Invalid JSON');
}

if (($data['repository'] ?? '') !== 'chriopter/netzprobe') {
    http_response_code(403);
    $log('Invalid repository ' . ($data['repository'] ?? 'unknown'));
    die('Invalid repository');
}

if (($data['ref'] ?? '') !== 'refs/heads/main') {
    $log('Ignored ref ' . ($data['ref'] ?? 'unknown'));
    die('Not main branch');
}

$log('Starting deploy');
$output = [];
exec('sudo ' . escapeshellarg($deployScript) . ' 2>&1', $output, $code);
$log('Deploy finished code=' . $code . ' output=' . implode(' | ', $output));

http_response_code($code === 0 ? 200 : 500);
header('Content-Type: text/plain; charset=utf-8');
echo implode("\n", $output);
