-- Demo data for EduFinance. Login: tanvir@du.ac.bd / password123
SET NAMES utf8mb4;
USE edufinance;

INSERT INTO users (full_name, email, password_hash, student_id, phone, university, major, grad_year, alerts_on)
VALUES ('Tanvir Ahmed', 'tanvir@du.ac.bd',
        '$2y$10$bC8zTjz18jQOsS6XMgQpI.oTwOmVHBcjyetujY9sYJCaVMSN9Srfy',
        'DU-2026-1042', '+880 1712-345678', 'University of Dhaka', 'Computer Science', '2028', 1);

SET @uid := LAST_INSERT_ID();

INSERT INTO categories (name, icon, type) VALUES
    ('Mess Rent & Utility',       '🏠', 'expense'),
    ('Hall Canteen & Dining',     '🍽️', 'expense'),
    ('Books & Photocopy',         '📚', 'expense'),
    ('Bus, Train & Rickshaw',     '🚌', 'expense'),
    ('Hangout & Tea',             '🎉', 'expense'),
    ('Private Tuition',           '💼', 'income'),
    ('Scholarship / Waiver',      '🎓', 'income'),
    ('Freelance / Gig Work',      '💻', 'income'),
    ('Family Allowance',          '👪', 'income');

SET @cat_mess := (SELECT id FROM categories WHERE name = 'Mess Rent & Utility');
SET @cat_food := (SELECT id FROM categories WHERE name = 'Hall Canteen & Dining');
SET @cat_books := (SELECT id FROM categories WHERE name = 'Books & Photocopy');
SET @cat_bus := (SELECT id FROM categories WHERE name = 'Bus, Train & Rickshaw');
SET @cat_hangout := (SELECT id FROM categories WHERE name = 'Hangout & Tea');
SET @cat_tuition := (SELECT id FROM categories WHERE name = 'Private Tuition');
SET @cat_scholarship := (SELECT id FROM categories WHERE name = 'Scholarship / Waiver');
SET @cat_freelance := (SELECT id FROM categories WHERE name = 'Freelance / Gig Work');

INSERT INTO transactions (user_id, category_id, type, title, amount, method, occurred_on, status) VALUES
    (@uid, @cat_food,   'expense', 'Hall Canteen Breakfast',      240.00, 'bKash', CURDATE() - INTERVAL 1 DAY, 'completed'),
    (@uid, @cat_books,  'expense', 'CSE Lab Manual Print',        850.00, 'Cash',  CURDATE() - INTERVAL 4 DAY, 'completed'),
    (@uid, @cat_mess,   'expense', 'Monthly Mess Shared Rent',   4500.00, 'Nagad', CURDATE() - INTERVAL 7 DAY, 'completed'),
    (@uid, @cat_bus,    'expense', 'Rickshaw & Bus Fare',         450.00, 'Cash',  CURDATE() - INTERVAL 10 DAY, 'pending'),
    (@uid, @cat_hangout,'expense', 'Campus Adda & Tea',           620.00, 'bKash', CURDATE() - INTERVAL 12 DAY, 'completed'),
    (@uid, @cat_tuition,'income',  'HSC Physics Private Tuition', 8000.00, 'bKash', CURDATE() - INTERVAL 3 DAY, 'completed'),
    (@uid, @cat_scholarship, 'income', 'Semester Merit Waiver',  10000.00, 'Bank Transfer', CURDATE() - INTERVAL 14 DAY, 'completed'),
    (@uid, @cat_freelance, 'income', 'Web Development Gig',       6500.00, 'Nagad', CURDATE() - INTERVAL 18 DAY, 'completed');

INSERT INTO budgets (user_id, category_id, month, amount_limit) VALUES
    (@uid, @cat_food,    DATE_FORMAT(CURDATE(), '%Y-%m'), 5000.00),
    (@uid, @cat_books,   DATE_FORMAT(CURDATE(), '%Y-%m'), 2000.00),
    (@uid, @cat_hangout, DATE_FORMAT(CURDATE(), '%Y-%m'), 2000.00),
    (@uid, @cat_mess,    DATE_FORMAT(CURDATE(), '%Y-%m'), 4500.00);

INSERT INTO goals (user_id, name, tag, icon, target, saved, deadline) VALUES
    (@uid, 'Coding Laptop',        'Tech Upgrade',    '💻', 100000.00, 45000.00, '2026-12-31'),
    (@uid, 'Emergency Fund',       'Safety Net',       '🛡️', 15000.00, 12000.00, '2026-10-31'),
    (@uid, 'Sajek Valley Tour',    'Travel',           '✈️',   8000.00,  3000.00, '2026-11-30');

INSERT INTO notifications (user_id, icon, title, body) VALUES
    (@uid, '⚠️', 'Mess Rent Due Soon', 'Monthly mess utility bill payment deadline is in 2 days.'),
    (@uid, '🎉', 'Tuition Payment Received', 'Received ৳8,000 from HSC Physics Tuition via bKash.');
