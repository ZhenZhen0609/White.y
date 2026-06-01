-- 创建数据库
CREATE DATABASE IF NOT EXISTS tuanzi_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tuanzi_diary;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 情绪日记表
CREATE TABLE IF NOT EXISTS emotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('happy', 'worry') NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    position_x DECIMAL(10, 6),
    position_y DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
);

-- 插入默认用户（密码是 'tuanzi123' 的bcrypt加密）
-- 你可以删除这行，让用户自己注册
INSERT INTO users (username, password, nickname) 
VALUES ('tuanzi', '$2a$10$YourHashedPasswordHere', '团子小伙伴')
ON DUPLICATE KEY UPDATE nickname='团子小伙伴';