<?php
require __DIR__ . '/bootstrap.php';

$action = $_GET['action'] ?? '';

if ($action === 'me' && method() === 'GET') {
    if (empty($_SESSION['user_id'])) {
        json_out(['user' => null]);
    }
    $stmt = db()->prepare(
        'SELECT id, full_name, email, student_id, phone, university, major, grad_year, alerts_on, avatar_url
         FROM users WHERE id = ?'
    );
    $stmt->execute([$_SESSION['user_id']]);
    json_out(['user' => $stmt->fetch(), 'csrf' => $_SESSION['csrf'] ?? '']);
}

if (method() !== 'POST') {
    fail('Method not allowed', 405);
}

$in = json_in();

if ($action === 'register') {
    $name     = trim($in['full_name'] ?? '');
    $email    = trim(strtolower($in['email'] ?? ''));
    $password = $in['password'] ?? '';
    $confirm  = $in['confirm_password'] ?? '';

    if ($name === '' || $email === '' || strlen($password) < 6) {
        fail('Full name, email, and a password of at least 6 characters are required.');
    }
    if ($password !== $confirm) {
        fail('Passwords do not match.');
    }

    $dupe = db()->prepare('SELECT id FROM users WHERE email = ?');
    $dupe->execute([$email]);
    if ($dupe->fetch()) {
        fail('An account with this email already exists.');
    }

    $stmt = db()->prepare(
        'INSERT INTO users (full_name, email, password_hash, student_id, phone) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $name,
        $email,
        password_hash($password, PASSWORD_DEFAULT),
        trim($in['student_id'] ?? ''),
        trim($in['phone'] ?? ''),
    ]);

    json_out(['ok' => true], 201);
}

if ($action === 'login') {
    $email    = trim(strtolower($in['email'] ?? ''));
    $password = $in['password'] ?? '';

    $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        fail('Incorrect email or password.', 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['csrf']    = bin2hex(random_bytes(24));
    unset($user['password_hash']);

    json_out(['user' => $user, 'csrf' => $_SESSION['csrf']]);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    json_out(['ok' => true]);
}

fail('Unknown action', 404);
