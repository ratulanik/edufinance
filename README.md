# 💸 EduFinance

A personal finance management web app for students — track transactions, manage budgets, set savings goals, and get a clear summary of spending, all from a lightweight PHP + JS stack.

## ✨ Features
- User authentication
- Transaction tracking (add, view, categorize)
- Monthly budgets — create, edit, and delete budget categories
- Custom categories (add and remove your own)
- Savings goals tracking
- Spending summary and export (CSV/report export)
- Notifications
- User profile management

## 🛠️ Tech Stack
- **Backend:** PHP (REST-style JSON API)
- **Database:** MariaDB (via XAMPP), managed with DBeaver
- **Frontend:** Vanilla JavaScript, HTML, CSS (single-page app)

## 🗄️ Database
Schema, seed data, and migrations are included under `database/` — run `database/schema.sql` followed by `database/seed.sql` on a fresh MariaDB instance to get started, then apply any files in `database/migrations/`.

## 🚀 Getting Started
```bash
git clone https://github.com/ratulanik/edufinance.git
```
1. Place the project folder inside your XAMPP `htdocs` directory
2. Import `database/schema.sql` and `database/seed.sql` into MariaDB (via phpMyAdmin or DBeaver)
3. Update `config.php` with your local database credentials if different from XAMPP defaults
4. Start Apache & MySQL from the XAMPP control panel, then visit `localhost/edufinance`

## 📸 Screenshots
_(coming soon)_

---
Built by [Anik Chakraborty](https://github.com/ratulanik)
