<?php
/**
 * GrayTech Systems - Contact Form Processor
 * Enhanced Version with SMTP, CSRF, and Better Security
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
    'rate_limit' => 5, // Max submissions per hour per IP
    // SMTP Configuration - Update these with your email provider details
    'smtp_host' => 'smtp.gmail.com', // e.g., smtp.gmail.com, smtp.office365.com, smtp.sendgrid.net
    'smtp_username' => 'your-email@gmail.com', // Your SMTP username/email
    'smtp_password' => 'your-app-password', // Your SMTP password or app-specific password
    'smtp_port' => 587, // 587 for TLS, 465 for SSL
    'smtp_secure' => 'tls', // 'tls' or 'ssl'
    'smtp_auth' => true,
    'recaptcha_secret' => 'YOUR_RECAPTCHA_SECRET_KEY', // Optional: Add if using reCAPTCHA
    'enable_recaptcha' => false, // Set to true to enable reCAPTCHA
];

// ============================================
// ERROR HANDLING
// ============================================
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'logs/contact_errors.log');

// Create logs directory if it doesn't exist
if (!is_dir('logs')) {
    mkdir('logs', 0755, true);
}

// ============================================
// SESSION START (for CSRF)
// ============================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Generate CSRF token if not exists
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ============================================
// FUNCTIONS
// ============================================

/**
 * Validate and sanitize input
 */
function validateInput($data) {
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate email address
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) && 
           preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $email);
}

/**
 * Validate phone number
 */
function validatePhone($phone) {
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    return preg_match('/^[0-9+]{10,15}$/', $phone);
}

/**
 * Rate limiting - prevents abuse
 */
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
        $count = 0;
        foreach ($entries as $entry) {
            if ($entry['ip'] === $ip) {
                $count++;
            }
        }
        if ($count >= $limit) {
            return false;
        }
    }
    
    $entries[] = ['ip' => $ip, 'time' => $now];
    file_put_contents($logFile, json_encode($entries));
    return true;
}

/**
 * Send email using SMTP via PHPMailer
 */
function sendEmail($to, $subject, $body, $replyTo = null) {
    global $config;
    
    // Check if PHPMailer is available
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            
            // Server settings
            $mail->isSMTP();
            $mail->Host       = $config['smtp_host'];
            $mail->SMTPAuth   = $config['smtp_auth'];
            $mail->Username   = $config['smtp_username'];
            $mail->Password   = $config['smtp_password'];
            
            if ($config['smtp_secure'] === 'tls') {
                $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            } elseif ($config['smtp_secure'] === 'ssl') {
                $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            }
            
            $mail->Port       = $config['smtp_port'];
            
            // Recipients
            $mail->setFrom($config['from_email'], $config['site_name']);
            $mail->addAddress($to);
            if ($replyTo) {
                $mail->addReplyTo($replyTo);
            }
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $body;
            $mail->AltBody = strip_tags($body);
            
            $mail->send();
            return true;
            
        } catch (Exception $e) {
            error_log("SMTP Email failed: " . $mail->ErrorInfo);
            // Fallback to PHP mail() function
            return fallbackMail($to, $subject, $body);
        }
    } else {
        // PHPMailer not installed, use fallback
        return fallbackMail($to, $subject, $body);
    }
}

/**
 * Fallback mail function if SMTP fails
 */
function fallbackMail($to, $subject, $body) {
    $headers = [
        'From: noreply@graytechsystems.co.za',
        'X-Mailer: PHP/' . phpversion(),
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
    ];
    
    return mail($to, $subject, $body, implode("\r\n", $headers));
}

/**
 * Verify reCAPTCHA (optional)
 */
function verifyRecaptcha($response) {
    global $config;
    
    if (!$config['enable_recaptcha']) {
        return true;
    }
    
    $url = 'https://www.google.com/recaptcha/api/siteverify';
    $data = [
        'secret' => $config['recaptcha_secret'],
        'response' => $response,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ];
    
    $options = [
        'http' => [
            'method' => 'POST',
            'content' => http_build_query($data)
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    if ($result === false) {
        return false;
    }
    
    $resultData = json_decode($result, true);
    return $resultData['success'] ?? false;
}

/**
 * Get client IP address (with proxy support)
 */
function getClientIP() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    
    // Check for proxy headers
    $headers = [
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_X_CLUSTER_CLIENT_IP',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED'
    ];
    
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ips = explode(',', $_SERVER[$header]);
            foreach ($ips as $ipAddress) {
                $ipAddress = trim($ipAddress);
                if (filter_var($ipAddress, FILTER_VALIDATE_IP)) {
                    return $ipAddress;
                }
            }
        }
    }
    
    return $ip;
}

// ============================================
// PROCESS FORM
// ============================================
$response = ['success' => false, 'message' => '', 'errors' => []];

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method.';
    echo json_encode($response);
    exit;
}

// CSRF Protection - Verify token
if (!isset($_POST['csrf_token']) || !isset($_SESSION['csrf_token']) || 
    $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
    $response['message'] = 'Security validation failed. Please refresh the page and try again.';
    echo json_encode($response);
    exit;
}

// CSRF token regeneration to prevent reuse
unset($_SESSION['csrf_token']);
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// Honeypot (anti-spam) - silently ignore
if (!empty($_POST[$config['honeypot_field']])) {
    // Return success to confuse bots
    $response['success'] = true;
    $response['message'] = 'Thank you for your message. We will get back to you soon.';
    echo json_encode($response);
    exit;
}

// reCAPTCHA verification (optional)
if ($config['enable_recaptcha']) {
    if (!isset($_POST['g-recaptcha-response']) || !verifyRecaptcha($_POST['g-recaptcha-response'])) {
        $response['message'] = 'Please complete the security verification.';
        echo json_encode($response);
        exit;
    }
}

// Rate limiting
$clientIP = getClientIP();
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
$consent = isset($_POST['consent']) ? filter_var($_POST['consent'], FILTER_VALIDATE_BOOLEAN) : false;

// Validation
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

if (!$consent) {
    $errors['consent'] = 'You must consent to being contacted.';
}

if (!empty($errors)) {
    $response['message'] = 'Please fix the errors below.';
    $response['errors'] = $errors;
    echo json_encode($response);
    exit;
}

// ============================================
// PREPARE EMAIL CONTENT
// ============================================
$subjectLine = "Contact Form Submission: " . ucfirst($subject);
$reference = "#" . date('Ymd') . "-" . strtoupper(substr(uniqid(), -6));

// Admin HTML email
$htmlBody = "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #0a0f1e; color: #60a5fa; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .message-box { background: #fff; padding: 15px; border-left: 4px solid #2563eb; }
        .footer { font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
        .label { font-weight: bold; color: #0a0f1e; }
    </style>
</head>
<body>
    <div class='header'>
        <h2>🔵 GrayTech Systems - Contact Form</h2>
        <p>New message received on " . date('Y-m-d H:i:s') . "</p>
        <p><strong>Reference:</strong> $reference</p>
    </div>
    <div class='section'>
        <h3>👤 Contact Information</h3>
        <p><span class='label'>Name:</span> $name</p>
        <p><span class='label'>Email:</span> <a href='mailto:$email'>$email</a></p>
        <p><span class='label'>Phone:</span> <a href='tel:$phone'>$phone</a></p>
        <p><span class='label'>Subject:</span> $subject</p>
        <p><span class='label'>IP Address:</span> $clientIP</p>
        <p><span class='label'>User Agent:</span> " . ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown') . "</p>
    </div>
    <div class='section'>
        <h3>📝 Message</h3>
        <div class='message-box'>" . nl2br($message) . "</div>
    </div>
    <div class='footer'>
        <p>This message was sent from the GrayTech Systems website.</p>
        <p>To reply directly, click the email address above.</p>
    </div>
</body>
</html>
";

// User auto-reply HTML email
$userHtmlBody = "
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
        <p><strong>Your reference:</strong> $reference</p>
        <p><strong>Subject:</strong> $subject</p>
        <hr>
        <p><strong>Your message:</strong></p>
        <p>" . nl2br($message) . "</p>
        <hr>
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
        <p>&copy; " . date('Y') . " GrayTech Systems (Pty) Ltd. All rights reserved.</p>
        <p>100 Waterford Drive, Fourways, Sandton, 2191</p>
    </div>
</body>
</html>
";

// ============================================
// SEND EMAILS
// ============================================

// Send to admin
$adminSent = sendEmail($config['to_email'], $subjectLine, $htmlBody, $email);

// Send auto-reply to user
$userSent = sendEmail($email, "Thank you for contacting GrayTech Systems", $userHtmlBody);

// ============================================
// LOG SUBMISSION
// ============================================
$logData = [
    'timestamp' => date('Y-m-d H:i:s'),
    'reference' => $reference,
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'subject' => $subject,
    'ip' => $clientIP,
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
    'success' => $adminSent
];

$logFile = 'logs/submissions.log';
$logEntries = [];
if (file_exists($logFile)) {
    $logEntries = json_decode(file_get_contents($logFile), true) ?: [];
}
$logEntries[] = $logData;
// Keep last 1000 entries
if (count($logEntries) > 1000) {
    $logEntries = array_slice($logEntries, -1000);
}
file_put_contents($logFile, json_encode($logEntries, JSON_PRETTY_PRINT));

// ============================================
// RESPONSE
// ============================================
if ($adminSent) {
    $response['success'] = true;
    $response['message'] = 'Thank you! Your message has been sent successfully. We\'ll get back to you within 24 hours.';
    $response['reference'] = $reference;
} else {
    $response['message'] = 'There was an error sending your message. Please try again or call us directly.';
    error_log("Contact form submission failed for: $email", 3, 'logs/contact_errors.log');
}

// Generate new CSRF token for next request
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

echo json_encode($response);
exit;
?>