'use strict';

/* ===== API client ===================================================== */

const state = { user: null, csrf: '', month: new Date().toISOString().slice(0, 7) };

async function api(path, options = {}) {
    const opts = { headers: { 'Content-Type': 'application/json' }, ...options };
    if (opts.method && opts.method !== 'GET' && state.csrf) {
        opts.headers['X-CSRF-Token'] = state.csrf;
    }
    const res = await fetch(`api/${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
}

const bdt = (n) => '৳' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(message, isError = false) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.toggle('toast-error', isError);
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ===== Auth screen ===================================================== */

function showAuthView(view) {
    document.getElementById('login-card').classList.toggle('hidden', view !== 'login');
    document.getElementById('register-card').classList.toggle('hidden', view !== 'register');
    document.getElementById('reg-success-msg').classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const errorBox = document.getElementById('login-error');
    errorBox.classList.add('hidden');
    button.disabled = true;
    try {
        const { user, csrf } = await api('auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({
                email: document.getElementById('login-email').value,
                password: document.getElementById('login-password').value,
            }),
        });
        state.user = user;
        state.csrf = csrf;
        await enterDashboard();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
    } finally {
        button.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const errorBox = document.getElementById('register-error');
    errorBox.classList.add('hidden');
    button.disabled = true;
    try {
        await api('auth.php?action=register', {
            method: 'POST',
            body: JSON.stringify({
                full_name: document.getElementById('reg-name').value,
                student_id: document.getElementById('reg-student-id').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value,
                confirm_password: document.getElementById('reg-confirm-password').value,
            }),
        });
        document.getElementById('login-email').value = document.getElementById('reg-email').value;
        document.getElementById('reg-success-msg').classList.remove('hidden');
        showAuthView('login');
        form.reset();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
    } finally {
        button.disabled = false;
    }
}

async function enterDashboard() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-dashboard').classList.remove('hidden');
    document.getElementById('profile-name').textContent = state.user.full_name;
    document.getElementById('profile-role').textContent = state.user.university || 'Student';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await loadCategories();
    await navigateTo('dashboard');
}

async function exitToLogin() {
    try { await api('auth.php?action=logout', { method: 'POST' }); } catch (_) { /* proceed regardless */ }
    state.user = null;
    state.csrf = '';
    document.getElementById('app-dashboard').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    showAuthView('login');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

/* ===== Navigation ===================================================== */

const pageLoaders = {
    dashboard: loadDashboard,
    'expense-tracking': loadExpenses,
    'income-management': loadIncome,
    'monthly-budget': loadBudgets,
    'savings-goals': loadGoals,
    'spending-insights': loadInsights,
    reports: loadReports,
    notifications: loadNotifications,
    profile: loadProfile,
    settings: () => {},
};

async function navigateTo(pageId) {
    document.querySelectorAll('.page-content').forEach((p) => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach((item) => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
    document.getElementById('sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
        await pageLoaders[pageId]?.();
    } catch (err) {
        toast(err.message, true);
    }
}

function toggleModal(id) {
    document.getElementById(id)?.classList.toggle('hidden');
}

/* ===== Categories (shared by expense form + budgets) =================== */

let categories = [];

async function loadCategories() {
    // Built-in categories plus the ones this user created, whether or not
    // they have a budget set for the current month.
    const data = await api('categories.php?type=expense');
    categories = data.categories;
    const options = categories.map((c) => `<option value="${c.id}">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`).join('');
    ['exp-category', 'budget-category'].forEach((id) => {
        const select = document.getElementById(id);
        if (select && categories.length) select.innerHTML = options;
    });
}

/* ===== Dashboard ======================================================= */

async function loadDashboard() {
    const [summary, { transactions }] = await Promise.all([
        api('summary.php'),
        api('transactions.php'),
    ]);

    document.getElementById('stat-balance').textContent = bdt(summary.balance);
    document.getElementById('stat-income').textContent = bdt(summary.month_income);
    document.getElementById('stat-expense').textContent = bdt(summary.month_expense);
    document.getElementById('stat-savings').textContent = bdt(summary.total_savings);

    const chart = document.getElementById('expense-chart');
    const max = Math.max(1, ...summary.expense_series.map((r) => Number(r.total)));
    chart.innerHTML = summary.expense_series.length
        ? summary.expense_series.map((r, i) => {
            const isLast = i === summary.expense_series.length - 1;
            const height = Math.max(4, Math.round((Number(r.total) / max) * 100));
            const label = new Date(r.ym + '-01').toLocaleDateString('en-US', { month: 'short' });
            return `<div class="bar-col ${isLast ? 'active-bar' : ''}">
                        ${isLast ? `<div class="tooltip">${bdt(r.total)}</div>` : ''}
                        <div class="bar" style="height:${height}%"></div><span>${label}</span>
                    </div>`;
        }).join('')
        : '<p class="text-muted">No expenses recorded yet.</p>';

    const recent = document.getElementById('recent-transactions');
    recent.innerHTML = transactions.slice(0, 5).map(transactionRow).join('') || emptyRow(4);
}

function transactionRow(t) {
    const sign = t.type === 'income' ? '+' : '-';
    const cls = t.type === 'income' ? 'text-green' : 'text-red';
    return `<tr>
                <td>${dateLabel(t.occurred_on)}</td>
                <td><span class="row-icon">${escapeHtml(t.icon || '')}</span> ${escapeHtml(t.title)}</td>
                <td class="${cls}">${sign}${bdt(t.amount)}</td>
                <td><span class="status-pill ${t.status === 'completed' ? 'status-success' : 'status-warning'}">${escapeHtml(t.method)}</span></td>
            </tr>`;
}

function emptyRow(colspan) {
    return `<tr class="empty-row"><td colspan="${colspan}">Nothing here yet.</td></tr>`;
}

function notifTone(icon) {
    const warn = ['⚠️', '🚨', '❌'];
    const good = ['🎉', '✅', '💰'];
    if (warn.includes(icon)) return 'bg-orange-soft';
    if (good.includes(icon)) return 'bg-green-soft';
    return 'bg-primary-soft';
}

/* ===== Expense tracking ================================================ */

async function loadExpenses(q = '') {
    const { transactions } = await api(`transactions.php?type=expense${q ? `&q=${encodeURIComponent(q)}` : ''}`);
    const body = document.querySelector('#expense-table tbody');
    body.innerHTML = transactions.map((t) => `
        <tr data-id="${t.id}">
            <td>${dateLabel(t.occurred_on)}</td>
            <td><span class="row-icon">${escapeHtml(t.icon || '')}</span> ${escapeHtml(t.title)}${t.category ? ` — ${escapeHtml(t.category)}` : ''}</td>
            <td>${escapeHtml(t.method)}</td>
            <td class="text-red">-${bdt(t.amount)}</td>
            <td><span class="status-pill ${t.status === 'completed' ? 'status-success' : 'status-warning'}">${t.status === 'completed' ? 'Completed' : 'Pending'}</span></td>
            <td><button type="button" class="icon-action" data-action="delete-transaction" data-id="${t.id}" aria-label="Delete entry"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button></td>
        </tr>`).join('') || emptyRow(6);
}

function filterExpenses(e) {
    clearTimeout(filterExpenses._t);
    const q = e.target.value;
    filterExpenses._t = setTimeout(() => loadExpenses(q).catch((err) => toast(err.message, true)), 250);
}

async function addExpenseRow(e) {
    e.preventDefault();
    const form = e.target;
    try {
        await api('transactions.php', {
            method: 'POST',
            body: JSON.stringify({
                type: 'expense',
                title: document.getElementById('exp-title').value,
                category_id: Number(document.getElementById('exp-category').value) || null,
                amount: Number(document.getElementById('exp-amount').value),
                occurred_on: document.getElementById('exp-date').value,
                method: document.getElementById('exp-method').value,
            }),
        });
        toggleModal('add-expense-card');
        form.reset();
        toast('Expense added.');
        await Promise.all([loadExpenses(), loadDashboard().catch(() => {})]);
    } catch (err) {
        toast(err.message, true);
    }
}

async function deleteTransaction(id) {
    if (!confirm('Delete this entry?')) return;
    try {
        await api(`transactions.php?id=${id}`, { method: 'DELETE' });
        toast('Deleted.');
        document.querySelector(`tr[data-id="${id}"]`)?.remove();
        loadDashboard().catch(() => {});
    } catch (err) {
        toast(err.message, true);
    }
}

/* ===== Income management ================================================ */

async function loadIncome() {
    const { transactions } = await api('transactions.php?type=income');
    const body = document.querySelector('#income-table tbody');
    body.innerHTML = transactions.map((t) => `
        <tr>
            <td>${dateLabel(t.occurred_on)}</td>
            <td><span class="row-icon">${escapeHtml(t.icon || '•')}</span> ${escapeHtml(t.title)}</td>
            <td>${escapeHtml(t.category || '—')}</td>
            <td class="text-green">+${bdt(t.amount)}</td>
            <td><span class="status-pill status-success">${escapeHtml(t.method)}</span></td>
        </tr>`).join('') || emptyRow(5);

    const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    document.getElementById('income-total').textContent = bdt(total);
}

async function addIncomeRow(e) {
    e.preventDefault();
    const form = e.target;
    try {
        await api('transactions.php', {
            method: 'POST',
            body: JSON.stringify({
                type: 'income',
                title: document.getElementById('inc-title').value,
                amount: Number(document.getElementById('inc-amount').value),
                method: 'bKash',
            }),
        });
        toggleModal('add-income-card');
        form.reset();
        toast('Income added.');
        await Promise.all([loadIncome(), loadDashboard().catch(() => {})]);
    } catch (err) {
        toast(err.message, true);
    }
}

/* ===== Monthly budget ================================================ */

async function loadBudgets() {
    const { budgets, month } = await api('budgets.php');
    document.getElementById('budget-month-label').textContent = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const list = document.getElementById('budget-list');
    list.innerHTML = budgets.map((b) => {
        const pct = b.amount_limit > 0 ? Math.round((b.spent / b.amount_limit) * 100) : 0;
        const over = Number(b.spent) > Number(b.amount_limit);
        const status = over ? 'status-over' : pct >= 80 ? 'status-warn' : 'status-ok';
        return `<div class="budget-item ${status}">
                    <div class="flex-between">
                        <span><span class="row-icon">${escapeHtml(b.icon)}</span> ${escapeHtml(b.name)}</span>
                        <span><strong>${bdt(b.spent)}</strong> / ${bdt(b.amount_limit)}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:${Math.min(pct, 100)}%"></div>
                    </div>
                    ${over ? `<span class="text-red font-xs">⚠️ Overbudget by ${bdt(b.spent - b.amount_limit)}</span>` : ''}
                </div>`;
    }).join('') || '<p class="text-muted">No budgets set for this month yet.</p>';

}

async function updateBudgetCap(e) {
    e.preventDefault();
    try {
        await api('budgets.php', {
            method: 'POST',
            body: JSON.stringify({
                category_id: Number(document.getElementById('budget-category').value),
                amount_limit: Number(document.getElementById('budget-limit').value),
            }),
        });
        toast('Budget cap updated.');
        await loadBudgets();
    } catch (err) {
        toast(err.message, true);
    }
}


async function addBudgetCategory(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
        const res = await api("categories.php", {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('cat-name').value,
                icon: document.getElementById('cat-icon').value,
                amount_limit: Number(document.getElementById('cat-limit').value),
            }),
        });
        toggleModal('add-category-card');
        form.reset();
        toast(res.existed ? 'That category already existed — budget limit set.' : 'Category added.');
        await loadCategories();
        await loadBudgets();
    } catch (err) {
        toast(err.message, true);
    } finally {
        button.disabled = false;
    }
}
/* ===== Savings goals ================================================ */

async function loadGoals() {
    const { goals } = await api('goals.php');
    const grid = document.getElementById('goals-grid');
    grid.innerHTML = goals.map((g) => {
        const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
        return `<div class="card goal-card">
                    <div class="goal-badge">${g.icon} ${escapeHtml(g.tag)}</div>
                    <h4>${escapeHtml(g.name)}</h4>
                    <p class="goal-amount">${bdt(g.saved)} saved of ${bdt(g.target)} target</p>
                    <div class="progress-bar-bg margin-top"><div class="progress-bar-fill bg-primary" style="width:${Math.min(pct, 100)}%"></div></div>
                    <div class="flex-between margin-top font-xs">
                        <span>${pct}% Completed</span>
                        <span>${g.deadline ? 'Target: ' + dateLabel(g.deadline) : 'No deadline'}</span>
                    </div>
                    <button type="button" class="btn btn-goal full-width-btn margin-top" data-action="deposit-goal" data-id="${g.id}">+ Deposit ৳500</button>
                </div>`;
    }).join('') || '<p class="text-muted">No savings goals yet — add one to get started.</p>';
}

async function depositGoal(id) {
    try {
        await api('goals.php', { method: 'POST', body: JSON.stringify({ action: 'deposit', id: Number(id), amount: 500 }) });
        toast('Deposited ৳500.');
        await loadGoals();
    } catch (err) {
        toast(err.message, true);
    }
}

async function createGoal(e) {
    e.preventDefault();
    const form = e.target;
    try {
        await api('goals.php', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('goal-name').value,
                tag: document.getElementById('goal-tag').value || 'Goal',
                target: Number(document.getElementById('goal-target').value),
                deadline: document.getElementById('goal-deadline').value || null,
            }),
        });
        toggleModal('add-goal-card');
        form.reset();
        toast('Goal created.');
        await loadGoals();
    } catch (err) {
        toast(err.message, true);
    }
}

/* ===== Spending insights ================================================ */

async function loadInsights() {
    const summary = await api('summary.php');
    const box = document.getElementById('insights-list');
    box.innerHTML = summary.insights.length
        ? summary.insights.map((i) => `
            <div class="insight-alert-box bg-orange-soft">
                <h5>${i.icon} ${escapeHtml(i.title)}</h5>
                <p>${escapeHtml(i.body)}</p>
            </div>`).join('')
        : '<p class="text-muted">Log a few expenses this month to see insights here.</p>';

    const top = document.getElementById('top-categories');
    top.innerHTML = summary.top_categories.map((c) => `
        <li class="flex-between"><span><span class="row-icon">${escapeHtml(c.icon)}</span> ${escapeHtml(c.name)}</span> <strong>${bdt(c.total)}</strong></li>
    `).join('') || '<li class="text-muted">No expenses this month yet.</li>';
}

/* ===== Reports ================================================ */

async function loadReports() {
    const { transactions } = await api('transactions.php');
    const byMonth = {};
    transactions.forEach((t) => {
        const ym = t.occurred_on.slice(0, 7);
        byMonth[ym] ??= { income: 0, expense: 0 };
        byMonth[ym][t.type] += Number(t.amount);
    });

    const rows = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
    const body = document.querySelector('#reports-table tbody');
    body.innerHTML = rows.map(([ym, v]) => {
        const net = v.income - v.expense;
        const label = new Date(ym + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return `<tr>
                    <td>${label}</td>
                    <td>${bdt(v.income)}</td>
                    <td>${bdt(v.expense)}</td>
                    <td class="${net >= 0 ? 'text-green' : 'text-red'}">${net >= 0 ? '+' : ''}${bdt(net)}</td>
                    <td><a href="api/export.php?month=${ym}" class="link-text">Export CSV</a></td>
                </tr>`;
    }).join('') || emptyRow(5);
}

/* ===== Notifications ================================================ */

async function loadNotifications() {
    const { notifications } = await api('notifications.php');
    const list = document.getElementById('notifications-list');
    list.innerHTML = notifications.length
        ? notifications.map((n) => `
            <div class="notification-item">
                <span class="notif-icon ${notifTone(n.icon)}">${n.icon}</span>
                <div class="notif-text">
                    <strong>${escapeHtml(n.title)}</strong>
                    <p>${escapeHtml(n.body)}</p>
                    <span class="text-muted font-xs">${new Date(n.created_at).toLocaleString()}</span>
                </div>
            </div>`).join('')
        : '<p class="text-muted text-center" style="padding:32px 0">No notifications remaining.</p>';
}

async function clearNotifications() {
    try {
        await api('notifications.php', { method: 'POST', body: JSON.stringify({ action: 'clear' }) });
        await loadNotifications();
    } catch (err) {
        toast(err.message, true);
    }
}

/* ===== Profile & settings ================================================ */

async function loadProfile() {
    const { profile } = await api('profile.php');
    document.getElementById('profile-view-name').textContent = profile.full_name;
    document.getElementById('profile-view-meta').textContent = `${profile.major || 'Student'} • ${profile.university || ''}`;
    document.getElementById('profile-view-roll').textContent = `Reg ID: ${profile.student_id || '—'}`;
    document.getElementById('profile-full-name').value = profile.full_name;
    document.getElementById('profile-university').value = profile.university;
    document.getElementById('profile-email').value = profile.email;
    document.getElementById('profile-grad-year').value = profile.grad_year;
    document.getElementById('settings-alerts').checked = !!profile.alerts_on;
}

async function saveProfile(e) {
    e.preventDefault();
    try {
        await api('profile.php', {
            method: 'PUT',
            body: JSON.stringify({
                full_name: document.getElementById('profile-full-name').value,
                university: document.getElementById('profile-university').value,
                grad_year: document.getElementById('profile-grad-year').value,
                alerts_on: document.getElementById('settings-alerts').checked,
            }),
        });
        toast('Profile updated.');
        await loadProfile();
    } catch (err) {
        toast(err.message, true);
    }
}

/* ===== Wiring ================================================ */

// A few buttons (quick actions, "See all", banner CTAs) navigate with a
// fixed known page id, so a plain global call is simpler than a data-action
// entry per target page.
window.navigateTo = navigateTo;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('add-expense-form').addEventListener('submit', addExpenseRow);
    document.getElementById('add-income-form').addEventListener('submit', addIncomeRow);
    document.getElementById('budget-form').addEventListener('submit', updateBudgetCap);
    document.getElementById('add-category-form').addEventListener('submit', addBudgetCategory);
    document.getElementById('add-goal-form').addEventListener('submit', createGoal);
    document.getElementById('profile-form').addEventListener('submit', saveProfile);
    document.getElementById('expense-search').addEventListener('input', filterExpenses);
    document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

    document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Single delegated listener for every data-action button in the app,
    // instead of a global onclick per element.
    document.body.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const { action, id } = el.dataset;
        const handlers = {
            'show-login': () => showAuthView('login'),
            'show-register': () => showAuthView('register'),
            'toggle-password': () => togglePassword(el.dataset.target),
            'toggle-modal': () => toggleModal(el.dataset.target),
            'logout': exitToLogin,
            'delete-transaction': () => deleteTransaction(id),
            'deposit-goal': () => depositGoal(id),
            'clear-notifications': clearNotifications,
        };
        handlers[action]?.();
    });

    try {
        const { user, csrf } = await api('auth.php?action=me');
        if (user) {
            state.user = user;
            state.csrf = csrf;
            await enterDashboard();
        }
    } catch (_) {
        // Not logged in — auth screen stays visible.
    }
});
