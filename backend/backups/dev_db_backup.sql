-- Database Backup
-- Database: dev_db
-- Date: 2025-12-26T18:11:21.185Z

CREATE DATABASE IF NOT EXISTS `dev_db`;
USE `dev_db`;

-- Table structure for `products`
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `stock` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `products`
INSERT INTO `products` (`id`, `name`, `price`, `stock`) VALUES
(1, 'Laptop', '999.99', 10),
(2, 'Mouse', '29.99', 50);

-- Table structure for `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `users`
INSERT INTO `users` (`id`, `name`, `email`, `created_at`) VALUES
(1, 'John Doe', 'john@example.com', '2025-12-26T18:10:17.000Z'),
(2, 'Jane Smith', 'jane@example.com', '2025-12-26T18:10:17.000Z');

