<?php
require __DIR__ . '/bootstrap.php';
$uid = require_auth();

if (method() === 'GET') {
    $stmt = db()->prepare(
        'SELECT id, name, tag, icon, target, saved, deadline FROM goals WHERE user_id = ? ORDER BY deadline'
    );
    $stmt->execute([$uid]);
    json_out(['goals' => $stmt->fetchAll()]);
}

if (method() === 'POST') {
    require_csrf();
    $in     = json_in();
    $action = $in['action'] ?? 'create';

    if ($action === 'deposit') {
        $id     = (int) ($in['id'] ?? 0);
        $amount = (float) ($in['amount'] ?? 0);
        if ($amount <= 0) {
            fail('Deposit amount must be positive.');
        }
        $stmt = db()->prepare('UPDATE goals SET saved = saved + ? WHERE id = ? AND user_id = ?');
        $stmt->execute([$amount, $id, $uid]);
        json_out(['ok' => $stmt->rowCount() > 0]);
    }

    $name   = trim($in['name'] ?? '');
    $target = (float) ($in['target'] ?? 0);
    if ($name === '' || $target <= 0) {
        fail('Name and a positive target amount are required.');
    }

    $stmt = db()->prepare(
        'INSERT INTO goals (user_id, name, tag, icon, target, saved, deadline) VALUES (?, ?, ?, ?, ?, 0, ?)'
    );
    $stmt->execute([
        $uid,
        $name,
        trim($in['tag'] ?? 'Goal'),
        trim($in['icon'] ?? '🎯'),
        $target,
        $in['deadline'] ?? null,
    ]);
    json_out(['ok' => true], 201);
}

fail('Method not allowed', 405);
