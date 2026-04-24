# 部署指南（生成可分享链接）

本项目是纯静态站点（HTML + CSS + 原生 ES Module JS），**无需构建**，可一键部署到任意静态托管平台。

> 🇨🇳 **朋友在国内打不开？** → 请看 [**DEPLOY_CN.md**](./DEPLOY_CN.md)（EdgeOne Pages / GitCode Pages / 腾讯云 COS 等国内直连方案）

推荐顺序：
- **海外/能科学上网**：Cloudflare Pages > Vercel > Netlify > GitHub Pages
- **国内朋友访问**：EdgeOne Pages > GitCode Pages > Gitee Pages > 腾讯云 COS

---

## 方案 1：Cloudflare Pages（推荐 ✨）

**优点**：免费、无流量限制、国内外访问都快、无需实名。

### 步骤

1. 先把项目推到 GitHub（见文末"推送到 GitHub"）
2. 打开 <https://dash.cloudflare.com/> 注册/登录（用邮箱即可）
3. 左侧菜单 → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
4. 授权 GitHub，选择 `ziwei-system` 仓库
5. 构建设置：
   - **Framework preset**: `None`
   - **Build command**: 留空
   - **Build output directory**: `/` （或者 `.`）
6. 点 **Save and Deploy**，1 分钟后拿到链接，形如：
   `https://ziwei-system.pages.dev`

之后每次 `git push`，Cloudflare 自动重新部署。

---

## 方案 2：Vercel（同样极好）

1. 打开 <https://vercel.com/> 用 GitHub 登录
2. **Add New** → **Project** → 选中 `ziwei-system` 仓库
3. 全部保持默认，点 **Deploy**
4. 拿到链接：`https://ziwei-system.vercel.app`

项目根目录的 `vercel.json` 已经配好，JS 模块会正确返回 MIME 类型。

---

## 方案 3：Netlify

1. 打开 <https://app.netlify.com/> 用 GitHub 登录
2. **Add new site** → **Import an existing project** → 选 `ziwei-system`
3. Build settings 保持默认（`netlify.toml` 已写好），**Deploy**
4. 拿到链接：`https://xxx.netlify.app`

---

## 方案 4：GitHub Pages（最简单，但国内访问偶尔慢）

1. 推到 GitHub 后，仓库 **Settings** → **Pages**
2. **Source**: Deploy from a branch → **Branch**: `main` → `/` (root) → Save
3. 一两分钟后拿到：`https://<用户名>.github.io/ziwei-system/`

---

## 推送到 GitHub（所有方案的前置步骤）

```bash
cd ziwei-system

# 首次初始化
git init
git add .
git commit -m "feat: 紫微斗数精成 v1.0 - 可分享版本"
git branch -M main

# 去 github.com 创建一个空仓库 ziwei-system（public），然后：
git remote add origin https://github.com/<你的用户名>/ziwei-system.git
git push -u origin main
```

> 后续更新：`git add . && git commit -m "xxx" && git push`，部署平台会自动重建。

---

## 本地预览（分享前自己先测）

```bash
cd ziwei-system
python3 -m http.server 8765
# 打开 http://localhost:8765
```

---

## 常见问题

- **打开页面一片空白 / 控制台报 CORS**：确保访问的是 http(s) 域名，**不要用 `file://` 直接打开**（ES Module 受同源策略限制）。部署到任意托管平台或用本地服务器即可。
- **手机打开太小**：已做 768px / 420px 两档响应式，刷新一下应该自适应。
- **想加自定义域名**：Cloudflare/Vercel/Netlify 都支持一键绑定，在项目设置里加 CNAME 即可。
