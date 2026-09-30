<?php
require __DIR__ . '/bootstrap.php';
$uid = require_auth();

if (method() === 'GET') {
    $type = $_GET['type'] ?? '';
    $q    = trim($_GET['q'] ?? '');

    $sql = 'SELECT t.id, t.type, t.title, t.amount, t.method, t.occurred_on, t.status, c.name AS category, c.icon
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = ?';
    $params = [$uid];

    if ($type === 'income' || $type === 'expense') {
        $sql .= ' AND t.type = ?';
        $params[] = $type;
    }
    if ($q !== '') {
        $sql .= ' AND (t.title LIKE ? OR c.name LIKE ?)';
        $params[] = "%$q%";
        $params[] = "%$q%";
    }
    $sql .= ' ORDER BY t.occurred_on DESC, t.id DESC LIMIT 200';

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_out(['transactions' => $stmt->fetchAll()]);
}

if (method() === 'POST') {
    require_csrf();
    $in = json_in();

    $type     = $in['type'] ?? '';
    $title    = trim($in['title'] ?? '');
    $amount   = (float) ($in['amount'] ?? 0);
    $date     = $in['occurred_on'] ?? date('Y-m-d');
    $paymentMethod = trim($in['method'] ?? 'Cash');
    $catId    = $in['category_id'] ?? null;

    if (!in_array($type, ['income', 'expense'], true)) {
        fail('Type must be "income" or "expense".');
    }
    if ($title === '' || $amount <= 0) {
        fail('Title and a positive amount are required.');
    }

    $stmt = db()->prepare(
        'INSERT INTO transactions (user_id, category_id, type, title, amount, method, occurred_on, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, "completed")'
    );
    $stmt->execute([$uid, $catId ?: null, $type, $title, $amount, $paymentMethod, $date]);
    $id = (int) db()->lastInsertId();

    if ($type === 'expense' && $catId) {
        check_budget_alert($uid, (int) $catId, $date);
    }

    $stmt = db()->prepare(
        'SELECT t.id, t.type, t.title, t.amount, t.method, t.occurred_on, t.status, c.name AS category, c.icon
         FROM transactions t LEFT JOIN categories c ON c.id = t.category_id WHERE t.id = ?'
    );
    $stmt->execute([$id]);
    json_out(['transaction' => $stmt->fetch()], 201);
}

if (method() === 'DELETE') {
    require_csrf();
    $id = (int) ($_GET['id'] ?? 0);
    $stmt = db()->prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $uid]);
    json_out(['ok' => $stmt->rowCount() > 0]);
}

fail('Method not allowed', 405);
