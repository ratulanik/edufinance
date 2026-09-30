<?php
// Shared setup for every api/*.php endpoint: session, DB connection, and
// small JSON/auth helpers so each endpoint file stays focused on its own logic.

session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
]);

header('Content-Type: application/json; charset=utf-8');

function db(): PDO
{
    static $pdo;
    if ($pdo) {
        return $pdo;
    }
    $cfg = require __DIR__ . '/../config.php';
    $dsn = "mysql:host={$cfg['host']};dbname={$cfg['db']};charset={$cfg['charset']}";
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_in(): array
{
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

function fail(string $message, int $code = 400)
{
    json_out(['error' => $message], $code);
}

function method(): string
{
    return $_SERVER['REQUEST_METHOD'];
}

function require_auth(): int
{
    if (empty($_SESSION['user_id'])) {
        fail('Not authenticated', 401);
    }
    return (int) $_SESSION['user_id'];
}

function require_csrf(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if ($sent === '' || !hash_equals($_SESSION['csrf'] ?? '', $sent)) {
        fail('Invalid or missing CSRF token', 419);
    }
}

// Called after an expense is logged. Writes a notification if it pushes
// the category's monthly budget over its limit.
function check_budget_alert(int $userId, int $categoryId, string $date): void
{
    $month = substr($date, 0, 7);
    $stmt = db()->prepare(
        'SELECT b.amount_limit, c.name, c.icon,
                (SELECT COALESCE(SUM(amount), 0) FROM transactions
                 WHERE user_id = b.user_id AND category_id = b.category_id AND type = "expense"
                   AND DATE_FORMAT(occurred_on, "%Y-%m") = b.month) AS spent
         FROM budgets b
         JOIN categories c ON c.id = b.category_id
         WHERE b.user_id = ? AND b.category_id = ? AND b.month = ?'
    );
    $stmt->execute([$userId, $categoryId, $month]);
    $row = $stmt->fetch();

    if ($row && (float) $row['spent'] > (float) $row['amount_limit']) {
        $insert = db()->prepare(
            'INSERT INTO notifications (user_id, icon, title, body) VALUES (?, ?, ?, ?)'
        );
        $insert->execute([
            $userId,
            '⚠️',
            "{$row['name']} is over budget",
            "You've gone over your {$row['name']} limit of ৳" . number_format((float) $row['amount_limit'], 2) . ' this month.',
        ]);
    }
}
