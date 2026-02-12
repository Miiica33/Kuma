#!/usr/bin/env node
/**
 * Kuma PWA 语音助手 - 跨平台一键环境准备
 * 用法: node setup.js [--download-asr]
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = __dirname;
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const colors = { reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m' };
function log(c, msg) { console.log(colors[c] + msg + colors.reset); }

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: 'pipe', ...opts });
    return true;
  } catch {
    return false;
  }
}

function checkPython() {
  const isWin = process.platform === 'win32';
  const py = isWin ? 'python' : 'python3';
  if (!run(`${py} --version`, { encoding: 'utf8' })) {
    log('red', '未检测到 Python。请安装 Python 3.10+：https://www.python.org/downloads/');
    process.exit(1);
  }
  let ver = '';
  try {
    ver = execSync(`${py} -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"`, { encoding: 'utf8' }).trim();
  } catch {
    ver = execSync(`${py} --version 2>&1`, { encoding: 'utf8' }).match(/(\d+\.\d+)/)?.[1] || '';
  }
  const [major, minor] = ver.split('.').map(Number);
  if (major < 3 || (major === 3 && minor < 10)) {
    log('red', `需要 Python 3.10+，当前: ${ver}`);
    process.exit(1);
  }
  log('green', `✓ Python ${ver}`);
}

function checkNode() {
  const v = process.version.replace('v', '').split('.').map(Number)[0];
  if (v < 18) {
    log('red', `需要 Node.js 18+，当前: ${process.version}`);
    process.exit(1);
  }
  log('green', `✓ Node.js ${process.version}`);
}

function checkFfmpeg() {
  const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
  if (!run(cmd)) {
    log('yellow', '未检测到 ffmpeg，语音识别可能不可用。请从 https://ffmpeg.org/download.html 安装');
  } else {
    log('green', '✓ ffmpeg');
  }
}

function ensureEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const examplePath = path.join(ROOT_DIR, '.env.example');
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath);
    log('blue', '已创建 .env');
    log('yellow', '请编辑 .env，填入 ARK_API_KEY');
  } else {
    log('green', '✓ .env 已存在');
  }
}

function setupBackend() {
  log('blue', '准备后端环境...');
  const venvPath = path.join(BACKEND_DIR, 'venv');
  const isWin = process.platform === 'win32';
  const py = isWin ? 'python' : 'python3';

  if (!fs.existsSync(venvPath)) {
    log('yellow', '创建 Python 虚拟环境...');
    execSync(`${py} -m venv "${venvPath}"`, { stdio: 'inherit', cwd: BACKEND_DIR });
  }

  const pip = isWin ? path.join(venvPath, 'Scripts', 'pip') : path.join(venvPath, 'bin', 'pip');
  const python = isWin ? path.join(venvPath, 'Scripts', 'python') : path.join(venvPath, 'bin', 'python');
  try {
    execSync(`"${python}" -c "import uvicorn"`, { stdio: 'pipe' });
  } catch {
    log('yellow', '安装后端依赖（首次较慢）...');
    execSync(`"${pip}" install -q -r requirements.txt`, { stdio: 'inherit', cwd: BACKEND_DIR });
  }
  log('green', '✓ 后端环境就绪');
  return { venvPath, python };
}

function downloadAsr(pythonPath) {
  const modelPath = path.join(BACKEND_DIR, 'models', 'SenseVoiceSmall', 'model.pt');
  if (fs.existsSync(modelPath)) {
    log('green', '✓ ASR 模型已存在');
    return;
  }
  const scriptPath = path.join(BACKEND_DIR, 'scripts', 'download_sense_voice_small.py');
  log('blue', '下载语音识别模型 SenseVoiceSmall（约 893MB）...');
  execSync(`"${pythonPath}" "${scriptPath}"`, { stdio: 'inherit', cwd: BACKEND_DIR });
  log('green', '✓ ASR 模型已就绪');
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, ans => {
      rl.close();
      resolve((ans || '').trim().toLowerCase());
    });
  });
}

function setupFrontend() {
  log('blue', '准备前端环境...');
  if (!fs.existsSync(path.join(FRONTEND_DIR, 'node_modules'))) {
    log('yellow', '安装前端依赖（首次较慢）...');
    execSync('npm install --silent', { stdio: 'inherit', cwd: FRONTEND_DIR });
  }
  log('green', '✓ 前端环境就绪');
}

async function main() {
  console.log(colors.green + '\n==========================================\n  Kuma - 一键环境准备\n==========================================' + colors.reset + '\n');

  checkPython();
  checkNode();
  checkFfmpeg();
  ensureEnv();
  const { python } = setupBackend();

  const downloadAsrArg = process.argv.includes('--download-asr');
  const modelPath = path.join(BACKEND_DIR, 'models', 'SenseVoiceSmall', 'model.pt');
  if (downloadAsrArg) {
    downloadAsr(python);
  } else if (!fs.existsSync(modelPath)) {
    const ans = await ask('是否下载语音识别模型（约 893MB）？[y/N]: ');
    if (ans === 'y' || ans === 'yes') downloadAsr(python);
    else log('yellow', '已跳过。可稍后运行: node setup.js --download-asr');
  } else {
    log('green', '✓ ASR 模型已存在');
  }

  setupFrontend();

  console.log(colors.green + '\n==========================================\n  环境准备完成\n==========================================\n' + colors.reset);
  console.log('  1. 若尚未填写，请编辑 .env 填入 ARK_API_KEY\n  2. 启动应用: ./start.sh 或 node start.js\n  或一键部署并启动: ./deploy.sh 或 node deploy.js\n');
}

main().catch(err => {
  log('red', err.message || err);
  process.exit(1);
});
