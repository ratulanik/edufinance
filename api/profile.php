<?php
require __DIR__ . '/bootstrap.php';
$uid = require_auth();

if (method() === 'GET') {
    $stmt = db()->prepare(
        'SELECT full_name, email, student_id, phone, university, major, grad_year, alerts_on
         FROM users WHERE id = ?'
    );
    $stmt->execute([$uid]);
    json_out(['profile' => $stmt->fetch()]);
}

if (method() === 'PUT' || method() === 'POST') {
    require_csrf();
    $in = json_in();

    $name = trim($in['full_name'] ?? '');
    if ($name === '') {
        fail('Full name is required.');
    }

    $stmt = db()->prepare(
        'UPDATE users SET full_name = ?, university = ?, grad_year = ?, alerts_on = ? WHERE id = ?'
    );
    $stmt->execute([
        $name,
        trim($in['university'] ?? ''),
        trim($in['grad_year'] ?? ''),
        !empty($in['alerts_on']) ? 1 : 0,
        $uid,
    ]);
    json_out(['ok' => true]);
}

fail('Method not allowed', 405);
