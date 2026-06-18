<?php
// ================================================================
// GRAYTECH SYSTEMS - Lead Capture API
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
    'admin_email' => 'info@graytechsystems.co.za',
    'site_name' => 'GrayTech Systems',
    'lead_file' => 'leads.json', // For local storage
];

// ================================================================
// VALIDATE INPUT
// ================================================================

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$required = ['name', 'email', 'phone', 'area', 'segmentation'];
foreach ($required as $field) {
    if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing field: $field"]);
        exit;
    }
}

// ================================================================
// VALIDATE EMAIL
// ================================================================

if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

// ================================================================
// SAVE LEAD (Option 1: File Storage)
// ================================================================

$lead = [
    'id' => uniqid('lead_'),
    'timestamp' => date('Y-m-d H:i:s'),
    'name' => $input['name'],
    'email' => $input['email'],
    'phone' => $input['phone'],
    'area' => $input['area'],
    'segmentation' => $input['segmentation'],
    'message' => $input['message'] ?? '',
];

// Save to file (simple option)
$leads = [];
if (file_exists($config['lead_file'])) {
    $leads = json_decode(file_get_contents($config['lead_file']), true) ?: [];
}
$leads[] = $lead;
file_put_contents($config['lead_file'], json_encode($leads, JSON_PRETTY_PRINT));

// ================================================================
// SEND EMAIL NOTIFICATION
// ================================================================

$subject = "New Lead: " . $lead['name'] . " - " . $lead['area'];

$emailBody = "
===============================================
GRAYTECH SYSTEMS - NEW LEAD
===============================================

Timestamp: " . $lead['timestamp'] . "
Lead ID: " . $lead['id'] . "

-----------------------------------------------
CONTACT INFORMATION
-----------------------------------------------

Name: " . $lead['name'] . "
Email: " . $lead['email'] . "
Phone: " . $lead['phone'] . "

-----------------------------------------------
COVERAGE DETAILS
-----------------------------------------------

Area: " . $lead['area'] . "
Segmentation: " . $lead['segmentation'] . "

-----------------------------------------------
MESSAGE
-----------------------------------------------

" . ($lead['message'] ?: 'No message provided.') . "

-----------------------------------------------
END OF LEAD
-----------------------------------------------

This lead was captured from the GrayTech Systems website.
";

// Send email (configure your SMTP settings)
$headers = [
    'From: noreply@graytechsystems.co.za',
    'Reply-To: ' . $lead['email'],
    'X-Mailer: PHP/' . phpversion(),
];

mail($config['to_email'], $subject, $emailBody, implode("\r\n", $headers));

// ================================================================
// SEND AUTO-REPLY TO USER
// ================================================================

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
        <p>Thank You for Your Interest</p>
    </div>
    <div class='content'>
        <p>Dear <strong>" . $lead['name'] . "</strong>,</p>
        <p>Thank you for contacting GrayTech Systems regarding fibre coverage in <strong>" . $lead['area'] . "</strong>.</p>
        <p>One of our team members will contact you within <span class='highlight'>24 hours</span> to discuss your options.</p>
        <p><strong>Your reference:</strong> " . $lead['id'] . "</p>
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
    'From: noreply@graytechsystems.co.za',
    'Reply-To: info@graytechsystems.co.za',
    'X-Mailer: PHP/' . phpversion(),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
];

mail($lead['email'], $userSubject, $userMessage, implode("\r\n", $userHeaders));

// ================================================================
// RESPONSE
// ================================================================

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Lead captured successfully!',
    'lead_id' => $lead['id']
]);