<?php
require __DIR__ . '/bootstrap.php';
$uid = require_auth();
$pdo = db();

$balanceStmt = $pdo->prepare(
    'SELECT COALESCE(SUM(CASE WHEN type = "income" THEN amount ELSE -amount END), 0) AS balance
     FROM transactions WHERE user_id = ?'
);
$balanceStmt->execute([$uid]);
$balance = (float) $balanceStmt->fetch()['balance'];

$month = date('Y-m');
$monthStmt = $pdo->prepare(
    'SELECT type, COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE user_id = ? AND DATE_FORMAT(occurred_on, "%Y-%m") = ? GROUP BY type'
);
$monthStmt->execute([$uid, $month]);
$monthTotals = ['income' => 0.0, 'expense' => 0.0];
foreach ($monthStmt->fetchAll() as $row) {
    $monthTotals[$row['type']] = (float) $row['total'];
}

$savingsStmt = $pdo->prepare('SELECT COALESCE(SUM(saved), 0) AS total FROM goals WHERE user_id = ?');
$savingsStmt->execute([$uid]);
$totalSavings = (float) $savingsStmt->fetch()['total'];

$seriesStmt = $pdo->prepare(
    'SELECT DATE_FORMAT(occurred_on, "%Y-%m") AS ym, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ? AND type = "expense" AND occurred_on >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY ym ORDER BY ym'
);
$seriesStmt->execute([$uid]);
$expenseSeries = $seriesStmt->fetchAll();

$topStmt = $pdo->prepare(
    'SELECT c.name, c.icon, SUM(t.amount) AS total FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = "expense" AND DATE_FORMAT(t.occurred_on, "%Y-%m") = ?
     GROUP BY c.id ORDER BY total DESC LIMIT 5'
);
$topStmt->execute([$uid, $month]);
$topCategories = $topStmt->fetchAll();

// Simple rule-based insight, computed from real totals rather than invented text.
$insights = [];
if (!empty($topCategories)) {
    $biggest = $topCategories[0];
    $share   = $monthTotals['expense'] > 0 ? round($biggest['total'] / $monthTotals['expense'] * 100) : 0;
    $insights[] = [
        'icon'  => $biggest['icon'],
        'title' => "High {$biggest['name']} spending",
        'body'  => "{$biggest['name']} is {$share}% of this month's spending (৳" . number_format((float) $biggest['total'], 2) . ').',
    ];
}

json_out([
    'balance'        => $balance,
    'month_income'   => $monthTotals['income'],
    'month_expense'  => $monthTotals['expense'],
    'total_savings'  => $totalSavings,
    'expense_series' => $expenseSeries,
    'top_categories' => $topCategories,
    'insights'       => $insights,
]);
