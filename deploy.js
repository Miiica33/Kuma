#!/usr/bin/env node
/**
 * Kuma PWA 语音助手 - 跨平台一键部署并启动
 * 用法: node deploy.js [--download-asr]
 */

const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = __dirname;

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, ans => {
      rl.close();
      resolve((ans || '').trim());
    });
  });
}

function needApiKeyPrompt() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return true;
  const content = fs.readFileSync(envPath, 'utf8');
  const m = content.match(/ARK_API_KEY=(.+)/m);
  if (!m) return true;
  const val = (m[1] || '').trim();
  return !val || val === 'your_ark_api_key_here';
}

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--download-asr');
  if (process.argv.includes('--download-asr')) args.push('--download-asr');

  // 1. 环境准备
  const r = spawnSync('node', [path.join(ROOT_DIR, 'setup.js'), ...args], {
    stdio: 'inherit',
    cwd: ROOT_DIR
  });
  if (r.status !== 0) process.exit(r.status || 1);

  // 2. 若未填写 API Key 则提示
  if (needApiKeyPrompt()) {
    console.log('\x1b[33m请在 .env 中填入 ARK_API_KEY（火山引擎方舟 API Key）后按回车继续...\x1b[0m');
    await ask('');
  }

  // 3. 启动服务
  const child = spawn('node', [path.join(ROOT_DIR, 'start.js')], {
    stdio: 'inherit',
    cwd: ROOT_DIR,
    shell: false
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error('\x1b[31m' + (err.message || err) + '\x1b[0m');
  process.exit(1);
});
