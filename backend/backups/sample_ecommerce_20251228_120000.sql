-- ========================================
-- Sample E-Commerce Database Backup
-- Database: ecommerce_db
-- Date: 2025-12-28 12:00:00
-- ========================================

-- Create Database
CREATE DATABASE IF NOT EXISTS `ecommerce_db`;
USE `ecommerce_db`;

-- ========================================
-- Table: users
-- ========================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Data for users
INSERT INTO `users` (`user_id`, `username`, `email`, `password_hash`, `first_name`, `last_name`, `phone`, `created_at`, `is_active`) VALUES
(1, 'admin', 'admin@example.com', '$2a$10$hash1234567890', 'Admin', 'User', '123-456-7890', '2025-01-01 10:00:00', 1),
(2, 'john_doe', 'john@example.com', '$2a$10$hash1234567891', 'John', 'Doe', '123-456-7891', '2025-01-05 14:30:00', 1),
(3, 'jane_smith', 'jane@example.com', '$2a$10$hash1234567892', 'Jane', 'Smith', '123-456-7892', '2025-01-10 09:15:00', 1),
(4, 'bob_wilson', 'bob@example.com', '$2a$10$hash1234567893', 'Bob', 'Wilson', '123-456-7893', '2025-01-15 16:45:00', 1),
(5, 'alice_brown', 'alice@example.com', '$2a$10$hash1234567894', 'Alice', 'Brown', '123-456-7894', '2025-01-20 11:20:00', 1);

-- ========================================
-- Table: categories
-- ========================================
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` text,
  `parent_category_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  KEY `parent_category_id` (`parent_category_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Data for categories
INSERT INTO `categories` (`category_id`, `category_name`, `description`, `parent_category_id`) VALUES
(1, 'Electronics', 'Electronic devices and accessories', NULL),
(2, 'Clothing', 'Apparel and fashion items', NULL),
(3, 'Books', 'Physical and digital books', NULL),
(4, 'Smartphones', 'Mobile phones and accessories', 1),
(5, 'Laptops', 'Portable computers', 1),
(6, 'Men Clothing', 'Clothing for men', 2),
(7, 'Women Clothing', 'Clothing for women', 2);

-- ========================================
-- Table: products
-- ========================================
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `product_name` varchar(200) NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `stock_quantity` int DEFAULT '0',
  `sku` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Data for products
INSERT INTO `products` (`product_id`, `product_name`, `category_id`, `description`, `price`, `stock_quantity`, `sku`, `is_active`) VALUES
(1, 'iPhone 15 Pro', 4, 'Latest Apple smartphone with A17 chip', 999.99, 50, 'IPH-15-PRO-001', 1),
(2, 'Samsung Galaxy S24', 4, 'Flagship Samsung smartphone', 899.99, 75, 'SAM-S24-001', 1),
(3, 'MacBook Pro 16"', 5, 'Professional laptop with M3 chip', 2499.99, 25, 'MBP-16-M3-001', 1),
(4, 'Dell XPS 15', 5, 'High-performance Windows laptop', 1799.99, 40, 'DELL-XPS15-001', 1),
(5, 'Men T-Shirt Blue', 6, 'Cotton t-shirt for men', 29.99, 200, 'TSH-MEN-BLU-001', 1),
(6, 'Women Dress Red', 7, 'Elegant red dress', 89.99, 100, 'DRS-WOM-RED-001', 1),
(7, 'Python Programming Book', 3, 'Learn Python programming', 49.99, 150, 'BK-PY-001', 1),
(8, 'Wireless Earbuds', 4, 'Bluetooth wireless earbuds', 79.99, 300, 'EAR-WRL-001', 1);

-- ========================================
-- Table: orders
-- ========================================
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `order_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  `shipping_address` text,
  `payment_method` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Data for orders
INSERT INTO `orders` (`order_id`, `user_id`, `order_date`, `total_amount`, `status`, `shipping_address`, `payment_method`) VALUES
(1, 2, '2025-12-20 10:30:00', 999.99, 'delivered', '123 Main St, City, Country', 'Credit Card'),
(2, 3, '2025-12-22 14:15:00', 2499.99, 'shipped', '456 Oak Ave, Town, Country', 'PayPal'),
(3, 4, '2025-12-25 09:45:00', 119.98, 'processing', '789 Pine Rd, Village, Country', 'Credit Card'),
(4, 5, '2025-12-26 16:20:00', 1799.99, 'pending', '321 Elm St, City, Country', 'Debit Card');

-- ========================================
-- Table: order_items
-- ========================================
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Data for order_items
INSERT INTO `order_items` (`order_item_id`, `order_id`, `product_id`, `quantity`, `unit_price`, `subtotal`) VALUES
(1, 1, 1, 1, 999.99, 999.99),
(2, 2, 3, 1, 2499.99, 2499.99),
(3, 3, 5, 2, 29.99, 59.98),
(4, 3, 8, 1, 79.99, 79.99),
(5, 4, 4, 1, 1799.99, 1799.99);

-- ========================================
-- STORED PROCEDURES
-- ========================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `GetUserOrders`$$
CREATE PROCEDURE `GetUserOrders`(IN userId INT)
BEGIN
    SELECT
        o.order_id,
        o.order_date,
        o.total_amount,
        o.status,
        COUNT(oi.order_item_id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.user_id = userId
    GROUP BY o.order_id
    ORDER BY o.order_date DESC;
END$$

DROP PROCEDURE IF EXISTS `GetProductsByCategory`$$
CREATE PROCEDURE `GetProductsByCategory`(IN catId INT)
BEGIN
    SELECT
        p.product_id,
        p.product_name,
        p.description,
        p.price,
        p.stock_quantity,
        c.category_name
    FROM products p
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.category_id = catId AND p.is_active = 1
    ORDER BY p.product_name;
END$$

DELIMITER ;

-- ========================================
-- VIEWS
-- ========================================

DROP VIEW IF EXISTS `vw_order_summary`;
CREATE VIEW `vw_order_summary` AS
SELECT
    o.order_id,
    u.username,
    u.email,
    o.order_date,
    o.total_amount,
    o.status,
    COUNT(oi.order_item_id) as total_items
FROM orders o
JOIN users u ON o.user_id = u.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id, u.username, u.email, o.order_date, o.total_amount, o.status;

DROP VIEW IF EXISTS `vw_product_inventory`;
CREATE VIEW `vw_product_inventory` AS
SELECT
    p.product_id,
    p.product_name,
    p.sku,
    c.category_name,
    p.price,
    p.stock_quantity,
    CASE
        WHEN p.stock_quantity = 0 THEN 'Out of Stock'
        WHEN p.stock_quantity < 10 THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id
WHERE p.is_active = 1;

-- ========================================
-- FUNCTIONS
-- ========================================

DELIMITER $$

DROP FUNCTION IF EXISTS `CalculateOrderTotal`$$
CREATE FUNCTION `CalculateOrderTotal`(orderId INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(10,2);
    SELECT SUM(subtotal) INTO total
    FROM order_items
    WHERE order_id = orderId;
    RETURN IFNULL(total, 0);
END$$

DELIMITER ;

-- ========================================
-- TRIGGERS
-- ========================================

DELIMITER $$

DROP TRIGGER IF EXISTS `before_order_insert`$$
CREATE TRIGGER `before_order_insert`
BEFORE INSERT ON `orders`
FOR EACH ROW
BEGIN
    SET NEW.created_at = CURRENT_TIMESTAMP;
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

DROP TRIGGER IF EXISTS `after_order_item_insert`$$
CREATE TRIGGER `after_order_item_insert`
AFTER INSERT ON `order_items`
FOR EACH ROW
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
END$$

DELIMITER ;

-- ========================================
-- Database Summary
-- ========================================
-- Tables: 5 (users, categories, products, orders, order_items)
-- Records: ~20 sample records
-- Stored Procedures: 2
-- Views: 2
-- Functions: 1
-- Triggers: 2
-- ========================================
