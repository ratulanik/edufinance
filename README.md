# EduFinance BD

A student budgeting app for Bangladeshi university students — track mess
rent, tuition income, canteen spending, and savings goals in BDT.

This is a rewrite of an earlier front-end-only mockup. Every number on
screen now comes from a real MySQL database through a small PHP JSON API;
nothing is hardcoded.

## Stack

- PHP 8.1+ (PDO, sessions) — no framework, no Composer dependencies
- MySQL / MariaDB (as shipped with XAMPP)
- Vanilla HTML/CSS/JS on the front end — no build step

## Setup (XAMPP)

1. **Copy the project** into `htdocs`, e.g. `C:\xampp\htdocs\edufinance`
   (or `/opt/lampp/htdocs/edufinance` on Linux).
2. **Start Apache and MySQL** from the XAMPP control panel.
3. **Create the database.** Easiest via phpMyAdmin (Import tab) or DBeaver
   (new MariaDB connection, `localhost:3306`, user `root`, empty password):
   run `database/schema.sql`, then `database/seed.sql`.
4. **Create a dedicated database user** — don't run the app as `root`:
   ```sql
   CREATE USER 'edufinance_app'@'localhost' IDENTIFIED BY 'ChangeMe123!';
   GRANT ALL PRIVILEGES ON edufinance.* TO 'edufinance_app'@'localhost';
   FLUSH PRIVILEGES;
   ```
5. **Configure the app:** copy `config.sample.php` to `config.php` and fill
   in the user/password from step 4. `config.php` is git-ignored — never
   commit real credentials.
6. **Open** `http://localhost/edufinance/` in your browser.

**Demo login:** `tanvir@du.ac.bd` / `password123`

## Project structure

```
index.html          One-page app shell; JS swaps which <main> is visible
assets/app.css       All styles
assets/app.js        API client + page renderers, wired via data-action
api/                 One PHP file per resource, returns JSON
  bootstrap.php       Session, DB connection, auth/CSRF helpers (shared)
  auth.php            register / login / logout / me
  transactions.php     list / create / delete (income & expense)
  budgets.php          list with real spend totals / update a limit
  categories.php       list built-in + your own categories / add a custom one
  goals.php             list / create / deposit
  summary.php           dashboard totals, 6-month chart, insights
  notifications.php     list / clear
  profile.php            get / update
  export.php              CSV download for a given month
database/
  schema.sql          Table definitions
  migrations/          One-off ALTERs for databases created before a change
  seed.sql            One demo user + realistic BDT transactions
config.sample.php    Template — copy to config.php (git-ignored)
```

## How data flows

Income and expenses share one `transactions` table (a `type` column tells
them apart), so the dashboard balance, the budget bars, the 6-month chart,
and the monthly reports are all computed from the same rows with SQL
aggregates — they can't disagree with each other the way the original
hardcoded mockup did.

## Security notes

- Passwords are hashed with `password_hash()` / verified with
  `password_verify()` — never stored in plain text.
- Every query uses PDO prepared statements.
- Every state-changing request (POST/PUT/DELETE) requires an
  `X-CSRF-Token` header matching the session's token, obtained from
  `auth.php?action=login` or `?action=me`.
- The session cookie is `HttpOnly` + `SameSite=Lax`.
- All user-entered text is rendered with `textContent`-safe templating on
  the front end (never `innerHTML` with raw input), so a title like
  `<script>...</script>` displays literally instead of executing.
- `database/.htaccess` blocks direct web access to the `.sql` files as a
  defense-in-depth measure — they shouldn't be reachable through Apache
  regardless of document root layout.

## Testing this yourself

With PHP's built-in server (no Apache needed) and a MySQL/MariaDB server
running and matching your `config.php`:

```
php -S localhost:8000
```

Then open `http://localhost:8000/`.

## Known gaps / next steps

- "Sign in with Google" was intentionally removed — it was previously a
  fake button. Real OAuth would need a registered Google app + client ID.
- PDF export isn't implemented; CSV export (Reports page, per month) is.
- No password-reset flow yet ("Forgot Password?" is a placeholder link).
