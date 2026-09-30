<?php
require __DIR__ . '/bootstrap.php';
$uid = require_auth();

if (method() === 'GET') {
    $stmt = db()->prepare(
        'SELECT id, icon, title, body, is_read, created_at FROM notifications
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    );
    $stmt->execute([$uid]);
    json_out(['notifications' => $stmt->fetchAll()]);
}

if (method() === 'POST') {
    require_csrf();
    $action = json_in()['action'] ?? '';

    if ($action === 'clear') {
        $stmt = db()->prepare('DELETE FROM notifications WHERE user_id = ?');
        $stmt->execute([$uid]);
        json_out(['ok' => true]);
    }

    fail('Unknown action');
}

fail('Method not allowed', 405);
