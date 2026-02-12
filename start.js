#!/usr/bin/env node

/**
 * Kuma PWA 语音助手 - 跨平台一键启动脚本
 * 使用方法: node start.js 或 npm start
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// 颜色输出（简化版）
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 项目路径
const ROOT_DIR = __dirname;
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

// 端口配置
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3000;

// 进程管理
let backendProcess = null;
let frontendProcess = null;

// 清理函数
function cleanup() {
  log('yellow', '\n正在停止服务...');
  
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
  }
  
  log('green', '服务已停止');
  process.exit(0);
}

// 注册清理
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// 检查命令是否存在
function checkCommand(command) {
  return new Promise((resolve, reject) => {
    exec(`which ${command} || where ${command}`, (error) => {
      if (error) {
        log('red', `错误: ${command} 未安装`);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// 等待服务就绪
function waitForService(url, name, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      const req = http.get(url, (res) => {
        log('green', `${name} 已就绪`);
        resolve();
      });
      
      req.on('error', () => {
        attempts++;
        if (attempts >= maxAttempts) {
          log('red', `${name} 启动超时`);
          reject(new Error(`${name} 启动超时`));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    
    check();
  });
}

// 检查并安装后端依赖
async function setupBackend() {
  log('blue', '检查后端环境...');
  
  const venvPath = path.join(BACKEND_DIR, 'venv');
  const isWindows = process.platform === 'win32';
  const pythonCmd = isWindows ? 'python' : 'python3';
  const activateScript = isWindows 
    ? path.join(venvPath, 'Scripts', 'activate.bat')
    : path.join(venvPath, 'bin', 'activate');
  
  // 创建虚拟环境
  if (!fs.existsSync(venvPath)) {
    log('yellow', '创建 Python 虚拟环境...');
    await new Promise((resolve, reject) => {
      exec(`${pythonCmd} -m venv "${venvPath}"`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  
  // 检查依赖
  const uvicornPath = isWindows
    ? path.join(venvPath, 'Scripts', 'uvicorn.exe')
    : path.join(venvPath, 'bin', 'uvicorn');
  
  if (!fs.existsSync(uvicornPath)) {
    log('yellow', '安装后端依赖...');
    const pipCmd = isWindows
      ? path.join(venvPath, 'Scripts', 'pip')
      : path.join(venvPath, 'bin', 'pip');
    
    await new Promise((resolve, reject) => {
      exec(`"${pipCmd}" install -q -r "${path.join(BACKEND_DIR, 'requirements.txt')}"`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  
  log('green', '后端环境检查完成');
  return { venvPath, isWindows };
}

// 检查并安装前端依赖
async function setupFrontend() {
  log('blue', '检查前端环境...');
  
  const nodeModulesPath = path.join(FRONTEND_DIR, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    log('yellow', '安装前端依赖...');
    await new Promise((resolve, reject) => {
      exec('npm install --silent', { cwd: FRONTEND_DIR }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  
  log('green', '前端环境检查完成');
}

// 启动后端
function startBackend(venvPath, isWindows) {
  log('blue', `启动后端服务 (端口 ${BACKEND_PORT})...`);
  
  const uvicornCmd = isWindows
    ? path.join(venvPath, 'Scripts', 'uvicorn')
    : path.join(venvPath, 'bin', 'uvicorn');
  
  backendProcess = spawn(uvicornCmd, [
    'app.main:app',
    '--host', '0.0.0.0',
    '--port', BACKEND_PORT.toString()
  ], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
    shell: isWindows
  });
  
  backendProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  backendProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log('red', `后端服务意外退出 (代码: ${code})`);
    }
  });
  
  log('green', `后端服务已启动 (PID: ${backendProcess.pid})`);
}

// 启动前端
function startFrontend() {
  log('blue', `启动前端服务 (端口 ${FRONTEND_PORT})...`);
  
  process.env.NEXT_PUBLIC_API_URL = `http://localhost:${BACKEND_PORT}`;
  
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    stdio: 'pipe',
    shell: true
  });
  
  frontendProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  frontendProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  frontendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log('red', `前端服务意外退出 (代码: ${code})`);
    }
  });
  
  log('green', `前端服务已启动 (PID: ${frontendProcess.pid})`);
}

// 打开浏览器
function openBrowser(url) {
  const platform = process.platform;
  let command;
  
  switch (platform) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default:
      command = `xdg-open "${url}"`;
  }
  
  exec(command, (error) => {
    if (error) {
      log('yellow', `无法自动打开浏览器，请手动访问: ${url}`);
    } else {
      log('green', `浏览器已打开: ${url}`);
    }
  });
}

// 主函数
async function main() {
  console.log(colors.green);
  console.log('==================================');
  console.log('  Kuma PWA 语音助手 - 启动脚本');
  console.log('==================================');
  console.log(colors.reset);
  
  try {
    // 检查命令
    await checkCommand('python3').catch(() => checkCommand('python'));
    await checkCommand('npm');
    
    // 设置环境
    const backendSetup = await setupBackend();
    await setupFrontend();
    
    // 检查 .env 文件
    const envPath = path.join(ROOT_DIR, '.env');
    if (!fs.existsSync(envPath)) {
      log('yellow', '警告: .env 文件不存在，使用 .env.example');
      const envExamplePath = path.join(ROOT_DIR, '.env.example');
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
      }
    }
    
    // 启动服务
    startBackend(backendSetup.venvPath, backendSetup.isWindows);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    startFrontend();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 打开浏览器
    const url = `http://localhost:${FRONTEND_PORT}`;
    try {
      await waitForService(url, '前端服务', 30);
      openBrowser(url);
    } catch (error) {
      log('yellow', `无法自动打开浏览器，请手动访问: ${url}`);
    }
    
    console.log(colors.green);
    console.log('\n==================================');
    console.log('  服务运行中...');
    console.log(`  前端: http://localhost:${FRONTEND_PORT}`);
    console.log(`  后端: http://localhost:${BACKEND_PORT}`);
    console.log('');
    console.log('  按 Ctrl+C 停止所有服务');
    console.log('==================================');
    console.log(colors.reset);
    
  } catch (error) {
    log('red', `启动失败: ${error.message}`);
    cleanup();
    process.exit(1);
  }
}

// 运行
main();
