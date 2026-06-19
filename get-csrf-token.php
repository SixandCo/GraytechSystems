<?php
/**
 * Get CSRF Token - Returns new token for AJAX requests
 */
session_start();

header('Content-Type: application/json');

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

echo json_encode(['token' => $_SESSION['csrf_token']]);
exit;
?>