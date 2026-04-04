/**
 * 构建后自动修复配置的脚本
 * 运行: node fix-config.js
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build', 'wechatgame');
const configPath = path.join(buildDir, 'project.config.json');
const settingsPath = path.join(buildDir, 'src', 'settings.json');

// 读取 project.config.json
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 修复 AppID
config.appid = 'wxf3a9485d556f9136';
// 修复 urlCheck
config.setting.urlCheck = false;
// 修复 libVersion (微信小程序库版本)
config.libVersion = '2.01.25';

// 写回
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// 读取 settings.json
let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

// 修复屏幕适配
settings.screen = {
    exactFitScreen: false,
    designResolution: { width: 1280, height: 720, policy: 1 }
};

// 写回
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

console.log('配置已修复:');
console.log('  - AppID:', config.appid);
console.log('  - urlCheck:', config.setting.urlCheck);
console.log('  - libVersion:', config.libVersion);
console.log('  - 屏幕适配: policy=1 (SHOW_ALL)');
