<?php
require __DIR__ . '/bootstrap.php';
$uid   = require_auth();
$month = $_GET['month'] ?? date('Y-m');

if (method() === 'GET') {
    $sql = 'SELECT b.id, b.category_id, c.name, c.icon, b.amount_limit, (c.user_id IS NOT NULL) AS is_custom,
                   COALESCE(SUM(t.amount), 0) AS spent
            FROM budgets b
            JOIN categories c ON c.id = b.category_id
            LEFT JOIN transactions t ON t.category_id = b.category_id AND t.user_id = b.user_id
                   AND t.type = "expense" AND DATE_FORMAT(t.occurred_on, "%Y-%m") = b.month
            WHERE b.user_id = ? AND b.month = ?
            GROUP BY b.id
            ORDER BY spent DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute([$uid, $month]);
    json_out(['budgets' => $stmt->fetchAll(), 'month' => $month]);
}

// Remove this month's budget for a category (the category itself stays).
if (method() === 'DELETE') {
    require_csrf();
    $catId = (int) ($_GET['category_id'] ?? 0);
    if (!$catId) {
        fail('A category is required.');
    }
    $stmt = db()->prepare('DELETE FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?');
    $stmt->execute([$uid, $catId, $month]);
    json_out(['ok' => true]);
}

if (method() === 'POST' || method() === 'PUT') {
    require_csrf();
    $in    = json_in();
    $catId = (int) ($in['category_id'] ?? 0);
    $limit = (float) ($in['amount_limit'] ?? -1);

    if (!$catId || $limit < 0) {
        fail('A category and a valid limit are required.');
    }

    $chk = db()->prepare(
        'SELECT 1 FROM categories WHERE id = ? AND type = "expense" AND (user_id IS NULL OR user_id = ?)'
    );
    $chk->execute([$catId, $uid]);
    if (!$chk->fetchColumn()) {
        fail('Unknown category.', 404);
    }

    $stmt = db()->prepare(
        'INSERT INTO budgets (user_id, category_id, month, amount_limit) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount_limit = VALUES(amount_limit)'
    );
    $stmt->execute([$uid, $catId, $month, $limit]);
    json_out(['ok' => true]);
}

fail('Method not allowed', 405);