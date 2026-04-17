#!/bin/bash
# AI新闻聚合网站部署脚本
# 使用方法: bash deploy.sh

echo "=== AI新闻聚合网站部署脚本 ==="

# 检查Node.js版本
echo "1. 检查Node.js环境..."
if ! command -v node &> /dev/null; then
    echo "   Node.js未安装，请先安装Node.js 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
echo "   当前Node.js版本: $NODE_VERSION"

# 检查npm
echo "2. 检查npm..."
if ! command -v npm &> /dev/null; then
    echo "   npm未安装"
    exit 1
fi

# 安装依赖
echo "3. 安装依赖..."
npm install --production

# 构建项目
echo "4. 构建项目..."
npm run build

# 创建日志目录
echo "5. 创建日志目录..."
mkdir -p logs

echo "=== 部署完成！==="
echo ""
echo "启动命令:"
echo "  npm run start              # 前台启动"
echo "  nohup npm run start &     # 后台启动"
echo "  pm2 start npm -- run start # 使用PM2管理"
echo ""
echo "默认访问地址: http://服务器IP:3000"
