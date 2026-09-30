<?php
require __DIR__ . '/bootstrap.php';
$uid   = require_auth();
$month = $_GET['month'] ?? date('Y-m');

$stmt = db()->prepare(
    'SELECT occurred_on, type, title, method, amount, status FROM transactions
     WHERE user_id = ? AND DATE_FORMAT(occurred_on, "%Y-%m") = ? ORDER BY occurred_on'
);
$stmt->execute([$uid, $month]);

header('Content-Type: text/csv; charset=utf-8');
header("Content-Disposition: attachment; filename=edufinance-$month.csv");

$out = fopen('php://output', 'w');
fputcsv($out, ['Date', 'Type', 'Title', 'Method', 'Amount (BDT)', 'Status']);
foreach ($stmt->fetchAll() as $row) {
    fputcsv($out, $row);
}
fclose($out);
