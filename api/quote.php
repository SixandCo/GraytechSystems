<?php
// ================================================================
// GRAYTECH SYSTEMS - QUOTE FORM HANDLER
// Production Grade
// ================================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// ================================================================
// CONFIGURATION
// ================================================================

$config = [
    'to_email' => 'info@graytechsystems.co.za',
    'from_email' => 'noreply@graytechsystems.co.za',
    'site_name' => 'GrayTech Systems',
    'rate_limit' => 5, // Max submissions per IP per hour
];

// ================================================================
// RATE LIMITING
// ================================================================

function checkRateLimit($ip, $limit = 5, $timeframe = 3600) {
    $logFile = 'rate_quotes.log';
    $now = time();
    $entries = [];
    
    if (file_exists($logFile)) {
        $entries = json_decode(file_get_contents($logFile), true) ?: [];
        $entries = array_filter($entries, function($entry) use ($now, $timeframe) {
            return ($now - $entry['time']) < $timeframe;
        });
        $count = array_count_values(array_column($entries, 'ip'))[$ip] ?? 0;
        if ($count >= $limit) {
            return false;
        }
    }
    
    $entries[] = ['ip' => $ip, 'time' => $now];
    file_put_contents($logFile, json_encode($entries));
    return true;
}

// ================================================================
// INPUT VALIDATION
// ================================================================

function validateInput($data) {
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validatePhone($phone) {
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    return preg_match('/^[0-9+]{10,15}$/', $phone);
}

// ================================================================
// PROCESS REQUEST
// ================================================================

$response = ['success' => false, 'message' => ''];

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method.';
    echo json_encode($response);
    exit;
}

// Get input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $response['message'] = 'Invalid request data.';
    echo json_encode($response);
    exit;
}

// Rate limiting
$clientIP = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
if (!checkRateLimit($clientIP, $config['rate_limit'])) {
    $response['message'] = 'Too many requests. Please try again later.';
    echo json_encode($response);
    exit;
}

// Validate fields
$name = isset($input['name']) ? validateInput($input['name']) : '';
$email = isset($input['email']) ? validateInput($input['email']) : '';
$phone = isset($input['phone']) ? validateInput($input['phone']) : '';
$service = isset($input['service']) ? validateInput($input['service']) : '';
$message = isset($input['message']) ? validateInput($input['message']) : '';
$consent = isset($input['consent']) ? (bool)$input['consent'] : false;

$errors = [];

if (strlen($name) < 2) {
    $errors[] = 'Name is required (minimum 2 characters).';
}

if (!validateEmail($email)) {
    $errors[] = 'Please enter a valid email address.';
}

if (!validatePhone($phone)) {
    $errors[] = 'Please enter a valid phone number.';
}

if (strlen($message) < 10) {
    $errors[] = 'Message is required (minimum 10 characters).';
}

if (!$consent) {
    $errors[] = 'You must consent to being contacted.';
}

if (!empty($errors)) {
    $response['message'] = implode(' ', $errors);
    echo json_encode($response);
    exit;
}

// ================================================================
// FORMAT & SEND EMAIL
// ================================================================

$subject = "Quote Request from $name - GrayTech Systems";

$serviceLabel = $service ? ucfirst($service) : 'Not specified';

$emailBody = "
===============================================
GRAYTECH SYSTEMS - QUOTE REQUEST
===============================================

DATE: " . date('Y-m-d H:i:s') . "
IP: " . $_SERVER['REMOTE_ADDR'] . "

-----------------------------------------------
CONTACT INFORMATION
-----------------------------------------------

NAME: $name
EMAIL: $email
PHONE: $phone

-----------------------------------------------
SERVICE REQUESTED
-----------------------------------------------

Service: $serviceLabel

-----------------------------------------------
MESSAGE
-----------------------------------------------

$message

-----------------------------------------------
END OF REQUEST
-----------------------------------------------

This quote request was submitted from the GrayTech Systems website.
";

// HTML version
$htmlBody = "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .header { background: #0a0f1e; color: #60a5fa; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .label { font-weight: bold; color: #0a0f1e; }
        .value { margin-left: 10px; }
        .message-box { background: #fff; padding: 15px; border-left: 4px solid #2563eb; margin: 10px 0; }
        .footer { font-size: 12px; color: #888; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
    </style>
</head>
<body>
    <div class='header'>
        <h2>🔵 GrayTech Systems - Quote Request</h2>
        <p>New quote request received on " . date('Y-m-d H:i:s') . "</p>
    </div>

    <div class='section'>
        <h3>👤 Contact Information</h3>
        <p><span class='label'>Name:</span> <span class='value'>$name</span></p>
        <p><span class='label'>Email:</span> <span class='value'><a href='mailto:$email'>$email</a></span></p>
        <p><span class='label'>Phone:</span> <span class='value'><a href='tel:$phone'>$phone</a></span></p>
        <p><span class='label'>IP:</span> <span class='value'>" . $_SERVER['REMOTE_ADDR'] . "</span></p>
    </div>

    <div class='section'>
        <h3>📋 Service Requested</h3>
        <p><span class='label'>Service:</span> <span class='value'>$serviceLabel</span></p>
    </div>

    <div class='section'>
        <h3>📝 Message</h3>
        <div class='message-box'>
            <p>" . nl2br($message) . "</p>
        </div>
    </div>

    <div class='footer'>
        <p>This quote request was sent from the GrayTech Systems website.</p>
        <p>To reply directly, click the email address above.</p>
    </div>
</body>
</html>
";

// Email headers
$headers = [
    'From: ' . $config['from_email'],
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . phpversion(),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'X-Priority: 1',
];

// Send to admin
$success = mail($config['to_email'], $subject, $htmlBody, implode("\r\n", $headers));

// Auto-reply to user
$userSubject = "Thank you for your quote request - GrayTech Systems";
$userMessage = "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #0a0f1e; color: #60a5fa; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; }
        .highlight { color: #2563eb; font-weight: bold; }
        .footer { font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; text-align: center; }
    </style>
</head>
<body>
    <div class='header'>
        <h2>🚀 GrayTech Systems</h2>
        <p>Thank You for Your Quote Request</p>
    </div>
    <div class='content'>
        <p>Dear <strong>$name</strong>,</p>
        <p>Thank you for requesting a quote from GrayTech Systems. We have received your enquiry and one of our team members will get back to you within <span class='highlight'>24 hours</span>.</p>
        <p><strong>Your request summary:</strong></p>
        <ul>
            <li>📧 Email: $email</li>
            <li>📞 Phone: $phone</li>
            <li>📋 Service: $serviceLabel</li>
        </ul>
        <p><br>In the meantime, feel free to:</p>
        <ul>
            <li>📞 Call us: <strong>087 701 9055</strong></li>
            <li>💬 WhatsApp: <strong>071 234 4476</strong></li>
            <li>🌐 Visit: <a href='https://graytechsystems.co.za'>graytechsystems.co.za</a></li>
        </ul>
        <p>We look forward to assisting you!</p>
        <p>Warm regards,<br><strong>The GrayTech Systems Team</strong></p>
    </div>
    <div class='footer'>
        <p>&copy; 2025 GrayTech Systems. All rights reserved.</p>
    </div>
</body>
</html>
";

$userHeaders = [
    'From: ' . $config['from_email'],
    'Reply-To: ' . $config['to_email'],
    'X-Mailer: PHP/' . phpversion(),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
];

mail($email, $userSubject, $userMessage, implode("\r\n", $userHeaders));

// ================================================================
// RESPONSE
// ================================================================

if ($success) {
    $response['success'] = true;
    $response['message'] = 'Quote request submitted successfully!';
} else {
    $response['message'] = 'There was an error sending your request. Please try again or call us directly.';
}

echo json_encode($response);
exit;
?>