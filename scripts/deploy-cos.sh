#!/usr/bin/env bash
# 腾讯云 COS 一键上传脚本（国内直连部署）
#
# 依赖：coscmd（pip install coscmd）
# 环境变量：
#   TENCENT_SECRET_ID   你的腾讯云 SecretId
#   TENCENT_SECRET_KEY  你的腾讯云 SecretKey
#   COS_BUCKET          桶名，形如 ziwei-1234567890
#   COS_REGION          地域，形如 ap-shanghai / ap-guangzhou
#
# 使用：
#   export TENCENT_SECRET_ID=xxx
#   export TENCENT_SECRET_KEY=xxx
#   export COS_BUCKET=ziwei-1234567890
#   export COS_REGION=ap-shanghai
#   bash scripts/deploy-cos.sh

set -e

# 校验
for v in TENCENT_SECRET_ID TENCENT_SECRET_KEY COS_BUCKET COS_REGION; do
  if [ -z "${!v}" ]; then
    echo "❌ 缺少环境变量 $v"
    exit 1
  fi
done

# 检查 coscmd
if ! command -v coscmd >/dev/null 2>&1; then
  echo "coscmd 未安装，尝试用 pip 安装..."
  pip install coscmd -q || pip3 install coscmd -q
fi

# 配置 coscmd（无需交互）
coscmd config \
  -a "$TENCENT_SECRET_ID" \
  -s "$TENCENT_SECRET_KEY" \
  -b "$COS_BUCKET" \
  -r "$COS_REGION"

# 项目根路径 = 脚本所在目录的父目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📦 上传 $PROJECT_DIR 到 cos://$COS_BUCKET"

# 排除列表：不上传 git/脚本/测试/部署配置
coscmd upload -rs "$PROJECT_DIR/" / \
  --ignore ".git/*" \
  --ignore ".gitignore" \
  --ignore "scripts/*" \
  --ignore "tests/*" \
  --ignore "DEPLOY*.md" \
  --ignore "README.md" \
  --ignore "_headers" \
  --ignore "netlify.toml" \
  --ignore "vercel.json" \
  --ignore "*.sample" \
  --ignore "__pycache__/*"

# 设置 JS 模块的 MIME 类型（COS 默认会识别，此处显式保证）
# 如已由 Content-Type 头自动设置则可跳过
echo ""
echo "✅ 上传完成"
echo ""
echo "🌐 访问地址（静态网站终端节点）："
echo "    https://${COS_BUCKET}.cos-website.${COS_REGION}.myqcloud.com"
echo ""
echo "💡 提示：若首次使用，请在 COS 控制台 → 该 Bucket → 基础配置 → 静态网站 → 开启，索引文档填 index.html"
