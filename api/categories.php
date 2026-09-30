<?php
require __DIR__ . '/bootstrap.php';
$uid = require_auth();

// Built-in categories (user_id IS NULL) + this user's own custom ones.
if (method() === 'GET') {
    $type = $_GET['type'] ?? 'expense';
    if (!in_array($type, ['income', 'expense'], true)) {
        fail('Invalid type.');
    }
    $stmt = db()->prepare(
        'SELECT id, name, icon, type FROM categories
         WHERE type = ? AND (user_id IS NULL OR user_id = ?)
         ORDER BY user_id IS NOT NULL, id'
    );
    $stmt->execute([$type, $uid]);
    json_out(['categories' => $stmt->fetchAll()]);
}

// Create a custom expense category and (optionally) give it a budget limit
// for the month, in one transaction.
if (method() === 'POST') {
    require_csrf();
    $in    = json_in();
    $name  = trim((string) ($in['name'] ?? ''));
    $icon  = trim((string) ($in['icon'] ?? '')) ?: '💳';
    $month = $_GET['month'] ?? date('Y-m');
    $limit = isset($in['amount_limit']) && $in['amount_limit'] !== '' ? (float) $in['amount_limit'] : null;

    if ($name === '' || mb_strlen($name) > 100) {
        fail('Category name is required (max 100 characters).');
    }
    // Icons are rendered into the page, so keep them short and markup-free.
    if (mb_strlen($icon) > 8 || preg_match('/[<>&"\']/', $icon)) {
        fail('Invalid icon.');
    }
    if ($limit !== null && $limit < 0) {
        fail('Limit must be zero or more.');
    }
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        fail('Invalid month.');
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        // Reuse an existing category with the same name (built-in or yours)
        // instead of creating a duplicate.
        $find = $pdo->prepare(
            'SELECT id FROM categories
             WHERE type = "expense" AND name = ? AND (user_id IS NULL OR user_id = ?) LIMIT 1'
        );
        $find->execute([$name, $uid]);
        $catId   = (int) $find->fetchColumn();
        $existed = $catId > 0;

        if (!$existed) {
            $ins = $pdo->prepare('INSERT INTO categories (name, icon, type, user_id) VALUES (?, ?, "expense", ?)');
            $ins->execute([$name, $icon, $uid]);
            $catId = (int) $pdo->lastInsertId();
        }

        if ($limit !== null) {
            $bud = $pdo->prepare(
                'INSERT INTO budgets (user_id, category_id, month, amount_limit) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE amount_limit = VALUES(amount_limit)'
            );
            $bud->execute([$uid, $catId, $month, $limit]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        fail('Could not save the category.', 500);
    }
    json_out(['ok' => true, 'category_id' => $catId, 'existed' => $existed], $existed ? 200 : 201);
}

// Delete one of YOUR custom categories. Built-in categories are shared by
// everyone, so they can't be deleted here. Budgets for it are removed
// automatically; past expenses just become uncategorized.
if (method() === 'DELETE') {
    require_csrf();
    $id = (int) ($_GET['id'] ?? 0);
    $stmt = db()->prepare('DELETE FROM categories WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $uid]);
    if ($stmt->rowCount() === 0) {
        fail('Only your own custom categories can be deleted.', 404);
    }
    json_out(['ok' => true]);
}

fail('Method not allowed', 405);