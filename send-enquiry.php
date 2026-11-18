<?php
/**
 * WanderOza Travels — Flight enquiry mail handler.
 * Upload this file beside index.html on a PHP-enabled hosting account.
 * For reliable delivery, configure the hosting account's authenticated SMTP/mail service.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid enquiry details.']);
    exit;
}

// Quietly accept bot submissions without sending mail.
if (!empty($data['website'])) {
    echo json_encode(['success' => true]);
    exit;
}

$name = trim((string)($data['name'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
$phone = trim((string)($data['phone'] ?? ''));
$consent = !empty($data['consent']);
$search = $data['searchDetails'] ?? [];

if ($name === '' || strlen($name) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 180 || $phone === '' || !preg_match('/^[0-9+().\s-]{7,25}$/', $phone) || !$consent || !is_array($search)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please check your name, email, mobile number and consent.']);
    exit;
}

$to = 'avinashkmr09xm@gmail.com';
$subject = 'New Flight Enquiry | WanderOza Travels';
$escape = static function ($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
};

$rows = '';
$allowedLabels = ['from' => 'Departure city / airport', 'to' => 'Arrival city / airport', 'departure' => 'Departure date', 'return' => 'Return date', 'travellers' => 'Travellers', 'Trip type' => 'Trip type', 'Cabin class' => 'Cabin class'];
foreach ($allowedLabels as $key => $label) {
    $value = trim((string)($search[$key] ?? ''));
    if ($value !== '') {
        $rows .= '<tr><td style="padding:11px 13px;border-bottom:1px solid #e8eef4;color:#687b8d;font-size:13px;width:40%">' . $escape($label) . '</td><td style="padding:11px 13px;border-bottom:1px solid #e8eef4;color:#173653;font-size:13px;font-weight:700">' . $escape($value) . '</td></tr>';
    }
}

$html = '<!doctype html><html><body style="margin:0;padding:28px;background:#f2f6fa;font-family:Arial,sans-serif;color:#18344e">'
    . '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:650px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">'
    . '<tr><td style="padding:27px 30px;background:#082b4d;color:#fff"><div style="font-size:11px;letter-spacing:2px;color:#8edcff;font-weight:bold">WANDEROZA TRAVELS</div><h1 style="margin:10px 0 4px;font-size:23px;color:#fff">New flight enquiry</h1><p style="margin:0;color:#d7e6f2;font-size:13px">A traveller has submitted a flight request through your website.</p></td></tr>'
    . '<tr><td style="padding:25px 30px"><h2 style="margin:0 0 13px;font-size:16px">Traveller contact details</h2><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e8eef4;border-radius:8px">'
    . '<tr><td style="padding:11px 13px;border-bottom:1px solid #e8eef4;color:#687b8d;font-size:13px;width:40%">Full name</td><td style="padding:11px 13px;border-bottom:1px solid #e8eef4;color:#173653;font-size:13px;font-weight:bold">' . $escape($name) . '</td></tr>'
    . '<tr><td style="padding:11px 13px;border-bottom:1px solid #e8eef4;color:#687b8d;font-size:13px">Email address</td><td style="padding:11px 13px;border-bottom:1px solid #e8eef4;font-size:13px"><a href="mailto:' . $escape($email) . '" style="color:#087fbd">' . $escape($email) . '</a></td></tr>'
    . '<tr><td style="padding:11px 13px;color:#687b8d;font-size:13px">Mobile number</td><td style="padding:11px 13px;color:#173653;font-size:13px;font-weight:bold">' . $escape($phone) . '</td></tr></table>'
    . '<h2 style="margin:25px 0 13px;font-size:16px">Flight search details</h2><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e8eef4;border-radius:8px">' . $rows . '</table>'
    . '<p style="margin:23px 0 0;padding:14px 16px;background:#f3f8fc;border-radius:8px;color:#63788b;font-size:12px;line-height:1.6">Please contact the traveller to discuss availability, fares and suitable options. This is an enquiry request, not a confirmed booking.</p></td></tr>'
    . '<tr><td style="padding:17px 30px;background:#f8fafc;border-top:1px solid #edf1f5;color:#82909d;font-size:11px">Website enquiry · WanderOza Travels</td></tr></table></body></html>';

$fromHost = preg_replace('/[^a-z0-9.-]/i', '', (string)($_SERVER['HTTP_HOST'] ?? 'wanderozatravels.com'));
$fromAddress = 'website@' . ($fromHost ?: 'wanderozatravels.com');
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: WanderOza Website <' . $fromAddress . '>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . phpversion(),
];

$sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, implode("\r\n", $headers));
if (!$sent) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Email could not be sent from the server. Please configure SMTP/mail on your hosting account.']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Enquiry sent successfully.']);
