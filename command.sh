#!/bin/zsh

###
# 一键启动脚本（适用于 macOS）
# 功能：
# 1. 基础环境检查：Node / npm 是否存在
# 2. 自动安装依赖（如果 node_modules 不存在）
# 3. 检查关键配置文件是否存在（package.json / tsconfig.json / vite.config.ts / .env.local）
#    - 若缺失 .env.local，则自动创建模板文件
# 4. 最后启动开发服务器：npm run dev
###

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "====== Grader_AI 启动助手（macOS）======"

check_command() {
  local cmd="$1"
  local install_hint="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ 未找到命令：$cmd"
    if [ -n "$install_hint" ]; then
      echo "   安装提示：$install_hint"
    fi
    return 1
  fi
  return 0
}

echo ">> 检查 Node / npm 环境..."
check_command node "建议使用 homebrew 安装：brew install node" || exit 1
check_command npm "Node 安装后应自带 npm，请检查 PATH 设置" || exit 1

echo "Node 版本：$(node -v)"
echo "npm  版本：$(npm -v)"

echo ""
echo ">> 检查依赖是否已安装..."
if [ ! -d "node_modules" ]; then
  echo "未检测到 node_modules，正在执行 npm install..."
  npm install
else
  echo "已检测到 node_modules，跳过依赖安装。"
fi

echo ""
echo ">> 检查关键配置文件..."

REQUIRED_FILES=("package.json" "tsconfig.json" "vite.config.ts")
MISSING_CRITICAL=0

for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "✅ 已找到配置文件：$f"
  else
    echo "❌ 缺少关键配置文件：$f"
    MISSING_CRITICAL=1
  fi
done

if [ "$MISSING_CRITICAL" -eq 1 ]; then
  echo ""
  echo "存在缺失的关键配置文件，上述文件需要你手动恢复或从备份 / 模板重新生成。"
  echo "为避免破坏现有逻辑，本脚本不会自动生成这些关键配置。"
  echo "请修复配置后重新运行 ./command.sh"
  exit 1
fi

echo ""
echo ">> 检查环境变量配置文件 .env.local..."
if [ ! -f ".env.local" ]; then
  echo "未找到 .env.local，正在创建模板文件..."
  cat > .env.local <<'EOF'
# Gemini API Key 配置
# 请将下面的占位符替换为你自己的密钥
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
EOF
  echo "已创建 .env.local 模板，请根据需要填入真实的 GEMINI_API_KEY。"
else
  echo "✅ 已找到 .env.local"
fi

echo ""
echo ">> 检查 package.json 中是否存在 dev 脚本..."

if ! node -e "const p=require('./package.json'); if(!p.scripts || !p.scripts.dev) process.exit(1);" 2>/dev/null; then
  echo "❌ package.json 中缺少 scripts.dev（dev 启动脚本）。"
  echo "当前脚本不会自动修改 package.json，请手动确认并添加，例如："
  echo '  "scripts": { "dev": "vite", ... }'
  exit 1
else
  echo "✅ 已检测到 scripts.dev"
fi

echo ""
echo ">> 所有检查通过，准备启动开发服务器：npm run dev"
echo "（如需停止，请在终端按 Ctrl + C）"
echo ""

npm run dev

