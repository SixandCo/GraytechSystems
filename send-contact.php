<?php
/**
 * GrayTech Systems - Contact Form Processor
 * Production Grade - With Error Handling, Validation, Spam Protection
 */

// ============================================
// CONFIGURATION
// ============================================
$config = [
    'to_email' => 'info@graytechsystems.co.za',
    'from_email' => 'noreply@graytechsystems.co.za',
    'site_name' => 'GrayTech Systems',
    'admin_email' => 'info@graytechsystems.co.za',
    'honeypot_field' => 'website',
    'max_message_length' => 5000,
    'rate_limit' => 5, // Max submissions per hour
];

// ============================================
// ERROR HANDLING & SECURITY
// ============================================
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'logs/contact_errors.log');

// Rate limiting
function checkRateLimit($ip, $limit = 5, $timeframe = 3600) {
    $logFile = 'logs/contact_rate.log';
    $now = time();
    $entries = [];
    
    if (file_exists($logFile)) {
        $entries = json_decode(file_get_contents($logFile), true) ?: [];
        // Clean old entries
        $entries = array_filter($entries, function($entry) use ($now, $timeframe) {
            return ($now - $entry['time']) < $timeframe;
        });
        // Count entries from this IP
        $count = array_count_values(array_column($entries, 'ip'))[$ip] ?? 0;
        if ($count >= $limit) {
            return false;
        }
    }
    
    $entries[] = ['ip' => $ip, 'time' => $now];
    file_put_contents($logFile, json_encode($entries));
    return true;
}

// ============================================
// INPUT VALIDATION
// ============================================
function validateInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) && 
           preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $email);
}

function validatePhone($phone) {
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    return preg_match('/^[0-9+]{10,15}$/', $phone);
}

// ============================================
// PROCESS FORM
// ============================================
$response = ['success' => false, 'message' => '', 'errors' => []];

// Check if form was submitted
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method.';
    echo json_encode($response);
    exit;
}

// Check honeypot (anti-spam)
if (!empty($_POST[$config['honeypot_field']])) {
    $response['message'] = 'Spam detected.';
    echo json_encode($response);
    exit;
}

// Rate limiting
$clientIP = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
if (!checkRateLimit($clientIP, $config['rate_limit'])) {
    $response['message'] = 'Too many submissions. Please try again later.';
    echo json_encode($response);
    exit;
}

// Validate required fields
$name = isset($_POST['name']) ? validateInput($_POST['name']) : '';
$email = isset($_POST['email']) ? validateInput($_POST['email']) : '';
$phone = isset($_POST['phone']) ? validateInput($_POST['phone']) : '';
$subject = isset($_POST['subject']) ? validateInput($_POST['subject']) : '';
$message = isset($_POST['message']) ? validateInput($_POST['message']) : '';

// Validation rules
$errors = [];

if (empty($name) || strlen($name) < 2) {
    $errors['name'] = 'Please enter your full name (minimum 2 characters).';
} elseif (strlen($name) > 100) {
    $errors['name'] = 'Name is too long (maximum 100 characters).';
}

if (empty($email)) {
    $errors['email'] = 'Please enter your email address.';
} elseif (!validateEmail($email)) {
    $errors['email'] = 'Please enter a valid email address.';
}

if (empty($phone)) {
    $errors['phone'] = 'Please enter your phone number.';
} elseif (!validatePhone($phone)) {
    $errors['phone'] = 'Please enter a valid phone number (10-15 digits).';
}

if (empty($subject) || $subject === 'Select a subject...') {
    $errors['subject'] = 'Please select a subject.';
}

if (empty($message) || strlen($message) < 10) {
    $errors['message'] = 'Please enter a message (minimum 10 characters).';
} elseif (strlen($message) > $config['max_message_length']) {
    $errors['message'] = 'Message is too long (maximum ' . $config['max_message_length'] . ' characters).';
}

// If errors exist, return them
if (!empty($errors)) {
    $response['message'] = 'Please fix the errors below.';
    $response['errors'] = $errors;
    echo json_encode($response);
    exit;
}

// ============================================
// FORMAT EMAIL
// ============================================
$subject = "Contact Form Submission: " . ucfirst($subject);

$emailBody = "
===============================================
GRAYTECH SYSTEMS - CONTACT FORM SUBMISSION
===============================================

DATE: " . date('Y-m-d H:i:s') . "
IP ADDRESS: " . $_SERVER['REMOTE_ADDR'] . "

-----------------------------------------------
CONTACT INFORMATION
-----------------------------------------------

NAME: $name
EMAIL: $email
PHONE: $phone

-----------------------------------------------
MESSAGE
-----------------------------------------------

Subject: $subject

Message:
$message

-----------------------------------------------
END OF MESSAGE
-----------------------------------------------

This email was sent from the GrayTech Systems website contact form.
";

// HTML version for email clients that support it
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
        <h2>🔵 GrayTech Systems - Contact Form</h2>
        <p>New message received on " . date('Y-m-d H:i:s') . "</p>
    </div>

    <div class='section'>
        <h3>👤 Contact Information</h3>
        <p><span class='label'>Name:</span> <span class='value'>$name</span></p>
        <p><span class='label'>Email:</span> <span class='value'><a href='mailto:$email'>$email</a></span></p>
        <p><span class='label'>Phone:</span> <span class='value'><a href='tel:$phone'>$phone</a></span></p>
        <p><span class='label'>IP:</span> <span class='value'>" . $_SERVER['REMOTE_ADDR'] . "</span></p>
    </div>

    <div class='section'>
        <h3>📝 Message Details</h3>
        <p><span class='label'>Subject:</span> <span class='value'>$subject</span></p>
        <div class='message-box'>
            <p><strong>Message:</strong></p>
            <p>" . nl2br($message) . "</p>
        </div>
    </div>

    <div class='footer'>
        <p>This message was sent from the GrayTech Systems website contact form.</p>
        <p>To reply directly, click the email address above.</p>
    </div>
</body>
</html>
";

// ============================================
// SEND EMAIL (Both Plain & HTML)
// ============================================
$headers = [
    'From: ' . $config['from_email'],
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . phpversion(),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'X-Priority: 1',
    'X-MSMail-Priority: High',
];

// Email headers for admin
$adminHeaders = $headers;
$adminHeaders[] = 'CC: ' . $config['admin_email'];

// Send to admin
$success = mail($config['to_email'], $subject, $htmlBody, implode("\r\n", $adminHeaders));

// Send auto-reply to user
$userSubject = "Thank you for contacting GrayTech Systems";
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
        <p>Thank You for Contacting Us</p>
    </div>
    <div class='content'>
        <p>Dear <strong>$name</strong>,</p>
        <p>Thank you for reaching out to GrayTech Systems. We have received your inquiry and one of our team members will get back to you within <span class='highlight'>24 hours</span>.</p>
        <p>Here's a summary of your message:</p>
        <p><strong>Subject:</strong> $subject</p>
        <p><strong>Message:</strong><br>" . nl2br($message) . "</p>
        <p><br>In the meantime, feel free to:</p>
        <ul>
            <li>📞 Call us: <strong>087 701 9055</strong></li>
            <li>💬 WhatsApp: <strong>071 234 4476</strong></li>
            <li>🌐 Visit our website: <a href='https://graytechsystems.co.za'>graytechsystems.co.za</a></li>
        </ul>
        <p>We look forward to assisting you!</p>
        <p>Warm regards,<br><strong>The GrayTech Systems Team</strong></p>
    </div>
    <div class='footer'>
        <p>&copy; 2025 GrayTech Systems. All rights reserved.</p>
        <p>100 Waterford Drive, Fourways, Sandton, 2191</p>
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

// ============================================
// RESPONSE
// ============================================
if ($success) {
    $response['success'] = true;
    $response['message'] = 'Thank you! Your message has been sent successfully. We\'ll get back to you within 24 hours.';
} else {
    $response['message'] = 'There was an error sending your message. Please try again or call us directly.';
    // Log error
    error_log("Contact form submission failed for: $email", 3, 'logs/contact_errors.log');
}

echo json_encode($response);
exit;
?>