-- EduFinance schema
-- SET NAMES tells the server what charset THIS SESSION is sending, regardless
-- of the client tool's own default — without it, emoji/Bangla text below can
-- get mangled on insert even though the columns are utf8mb4.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS edufinance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edufinance;

CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    student_id    VARCHAR(50)  NOT NULL DEFAULT '',
    phone         VARCHAR(30)  NOT NULL DEFAULT '',
    university    VARCHAR(150) NOT NULL DEFAULT '',
    major         VARCHAR(100) NOT NULL DEFAULT '',
    grad_year     VARCHAR(10)  NOT NULL DEFAULT '',
    alerts_on     TINYINT(1)   NOT NULL DEFAULT 1,
    avatar_url    VARCHAR(255) NOT NULL DEFAULT '',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categories (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10)  NOT NULL DEFAULT '💳',
    type ENUM('income','expense') NOT NULL,
    -- NULL = built-in category shared by everyone; otherwise a custom
    -- category owned (and visible only to) that user.
    user_id INT NULL,
    UNIQUE KEY uniq_cat_user_name (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE transactions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    category_id INT NULL,
    type        ENUM('income','expense') NOT NULL,
    title       VARCHAR(150) NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    method      VARCHAR(30) NOT NULL DEFAULT 'Cash',
    occurred_on DATE NOT NULL,
    status      ENUM('completed','pending') NOT NULL DEFAULT 'completed',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, occurred_on)
) ENGINE=InnoDB;

CREATE TABLE budgets (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    category_id  INT NOT NULL,
    month        CHAR(7) NOT NULL,
    amount_limit DECIMAL(12,2) NOT NULL,
    UNIQUE KEY uniq_budget (user_id, category_id, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE goals (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id  INT NOT NULL,
    name     VARCHAR(150) NOT NULL,
    tag      VARCHAR(50)  NOT NULL DEFAULT 'Goal',
    icon     VARCHAR(10)  NOT NULL DEFAULT '🎯',
    target   DECIMAL(12,2) NOT NULL,
    saved    DECIMAL(12,2) NOT NULL DEFAULT 0,
    deadline DATE NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    icon       VARCHAR(10) NOT NULL DEFAULT '🔔',
    title      VARCHAR(150) NOT NULL,
    body       VARCHAR(255) NOT NULL,
    is_read    TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
