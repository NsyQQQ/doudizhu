-- 创建数据库
CREATE DATABASE IF NOT EXISTS doudizhu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE doudizhu;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `openid` VARCHAR(64) NOT NULL UNIQUE COMMENT '微信openid',
    `nickname` VARCHAR(32) DEFAULT '' COMMENT '昵称',
    `avatar` VARCHAR(256) DEFAULT '' COMMENT '头像URL',
    `room_id` INT UNSIGNED DEFAULT 0 COMMENT '当前所在房间ID',
    `total_games` INT UNSIGNED DEFAULT 0 COMMENT '总局数',
    `win_games` INT UNSIGNED DEFAULT 0 COMMENT '胜利局数',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 房间表
CREATE TABLE IF NOT EXISTS `rooms` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `room_code` VARCHAR(6) NOT NULL UNIQUE COMMENT '房间号(6位)',
    `type` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '房间类型(1-6)',
    `status` ENUM('waiting', 'playing', 'ended') DEFAULT 'waiting' COMMENT '房间状态',
    `host_id` INT UNSIGNED NOT NULL COMMENT '房主用户ID',
    `players` JSON NOT NULL COMMENT '玩家列表JSON',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_room_code` (`room_code`),
    INDEX `idx_host_id` (`host_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 游戏记录表
CREATE TABLE IF NOT EXISTS `game_records` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `room_id` INT UNSIGNED NOT NULL COMMENT '房间ID',
    `room_code` VARCHAR(6) NOT NULL COMMENT '房间号',
    `landlord_id` INT UNSIGNED NOT NULL COMMENT '地主玩家ID',
    `winner_id` INT UNSIGNED NOT NULL COMMENT '胜利玩家ID',
    `player_scores` JSON NOT NULL COMMENT '玩家分数变化{playerId: scoreChange}',
    `base_score` INT NOT NULL DEFAULT 1 COMMENT '基础分数',
    `multiple` INT NOT NULL DEFAULT 1 COMMENT '倍数',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_room_id` (`room_id`),
    INDEX `idx_room_code` (`room_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户战绩表
CREATE TABLE IF NOT EXISTS `user_records` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `game_id` INT UNSIGNED NOT NULL COMMENT '游戏记录ID',
    `is_landlord` BOOLEAN DEFAULT FALSE COMMENT '是否是地主',
    `is_win` BOOLEAN DEFAULT FALSE COMMENT '是否胜利',
    `score_change` INT NOT NULL COMMENT '分数变化',
    `cards_count` INT COMMENT '手牌数(地主获胜时显示)',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_game_id` (`game_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;