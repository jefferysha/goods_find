#!/bin/bash

# 闲鱼监控系统本地启动脚本
# 功能：清理旧构建、安装依赖、构建前端、启动服务

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}闲鱼监控系统 - 本地启动脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 0. 环境与依赖检查
echo -e "\n${YELLOW}[1/6] 检查环境与依赖...${NC}"

OS_FAMILY="unknown"
LINUX_ID=""
LINUX_LIKE=""
PYTHON_CMD="python3"
PIP_CMD="python3 -m pip"

if [ -f /etc/os-release ]; then
    . /etc/os-release
    LINUX_ID="$ID"
    LINUX_LIKE="$ID_LIKE"
fi

case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin)
        OS_FAMILY="macos"
        ;;
    Linux)
        if grep -qi microsoft /proc/version 2>/dev/null; then
            OS_FAMILY="wsl"
        else
            OS_FAMILY="linux"
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        OS_FAMILY="windows"
        ;;
    *)
        OS_FAMILY="unknown"
        ;;
esac

MISSING_ITEMS=()

if ! command -v uv >/dev/null 2>&1; then
    MISSING_ITEMS+=("uv (https://docs.astral.sh/uv/)")
fi

if ! command -v node >/dev/null 2>&1; then
    MISSING_ITEMS+=("node")
fi

if ! command -v pnpm >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
    MISSING_ITEMS+=("pnpm 或 npm")
fi


print_install_hints() {
    cat <<'EOF'
安装缺失的依赖:

1) 安装 uv (Python 包管理器):
   curl -LsSf https://astral.sh/uv/install.sh | sh
   # 或 macOS: brew install uv

2) 安装 Node.js + pnpm:
   # macOS: brew install node && npm install -g pnpm
   # Linux: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt install -y nodejs && npm install -g pnpm

3) 安装 Playwright 浏览器:
   uv run playwright install chromium

4) 安装浏览器 (Chrome 或 Edge)

5) 配置文件（可选）:
   cp .env.example .env
   cp config.json.example config.json
EOF
}

if [ "${#MISSING_ITEMS[@]}" -ne 0 ]; then
    echo -e "${RED}✗ 检测到缺失的环境/依赖:${NC}"
    for item in "${MISSING_ITEMS[@]}"; do
        echo "  - $item"
    done
    echo ""
    print_install_hints
    exit 1
fi

echo -e "${GREEN}✓ 环境与依赖检查通过${NC}"

# 1. 清理旧的 dist 目录
echo -e "\n${YELLOW}[2/6] 清理旧的构建产物...${NC}"
if [ -d "dist" ]; then
    rm -rf dist
    echo -e "${GREEN}✓ 已删除旧的 dist 目录${NC}"
else
    echo -e "${GREEN}✓ dist 目录不存在，跳过清理${NC}"
fi

# 2. 安装 Python 依赖 (uv)
echo -e "\n${YELLOW}[3/6] 安装 Python 依赖 (uv sync)...${NC}"
uv sync
echo -e "${GREEN}✓ Python 依赖安装完成${NC}"

# 3. 构建前端
echo -e "\n${YELLOW}[4/6] 构建前端项目...${NC}"
if [ ! -d "web-ui" ]; then
    echo -e "${RED}✗ 错误: web-ui 目录不存在${NC}"
    exit 1
fi

cd web-ui

# 检查 pnpm 是否可用
if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm 未安装，正在使用 npm 安装..."
    npm install -g pnpm
fi

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装前端依赖..."
    pnpm install
fi

echo "正在构建前端..."
pnpm run build

cd "$SCRIPT_DIR"

if [ ! -d "dist" ]; then
    echo -e "${RED}✗ 错误: 前端构建失败，dist 目录未生成${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 前端构建完成${NC}"

# 4. 构建产物已直接输出到项目根目录 dist/
echo -e "\n${YELLOW}[5/6] 检查构建产物...${NC}"
echo -e "${GREEN}✓ 构建产物已在项目根目录 dist/${NC}"

# 5. 启动后端服务
echo -e "\n${YELLOW}[6/6] 启动后端服务...${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}服务启动中...${NC}"
echo -e "${GREEN}访问地址: http://localhost:8000${NC}"
echo -e "${GREEN}API 文档: http://localhost:8000/docs${NC}"
echo -e "${GREEN}========================================${NC}\n"

uv run python -m src.app
