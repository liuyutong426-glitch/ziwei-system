# 国内直连部署方案（解决国内网打不开）

Cloudflare Pages / Vercel / Netlify 的默认域名 (`*.pages.dev` / `*.vercel.app` / `*.netlify.app`) 在国内**经常被污染或限速**，朋友打不开很正常。

本文档提供 **4 个国内可稳定直连** 的方案，按"省事程度"排序：

| 方案 | 免费 | 需实名 | 需备案 | 国内速度 | 一键更新 |
| --- | :-: | :-: | :-: | :-: | :-: |
| **① GitCode Pages**（推荐新手）| ✅ | ❌ | ❌ | ⭐⭐⭐⭐ | ✅ |
| **② Gitee Pages**（老牌稳定）| ✅ | ✅ | ❌ | ⭐⭐⭐⭐ | ✅ |
| **③ 腾讯云 COS + CDN** | ✅额度内 | ✅ | ✅(CDN域名) | ⭐⭐⭐⭐⭐ | 脚本 |
| **④ EdgeOne Pages**（腾讯 Cloudflare 替代）| ✅ | ✅ | ❌(pages 子域) | ⭐⭐⭐⭐⭐ | ✅ |

---

## ① GitCode Pages —— 零门槛最快开

GitCode（CSDN 旗下，托管在国内）对标 GitHub Pages，不需要实名，**最省事**。

### 步骤

1. 打开 <https://gitcode.com/> 注册（可用邮箱或 GitHub 账号登录）
2. 新建一个 **公开仓库**，名字比如 `ziwei`
3. 把本项目推上去：
   ```bash
   cd ziwei-system
   git remote add gitcode https://gitcode.com/<你的用户名>/ziwei.git
   git push gitcode main
   ```
4. 仓库页面 → **Pages** → 选 `main` 分支、根目录 → **启用**
5. 拿到链接形如：`https://<用户名>.gitcode.io/ziwei/`

**优点**：免实名、免备案、国内直连、自动部署
**缺点**：相对 Gitee 新一些，偶尔小抽风

---

## ② Gitee Pages —— 老牌稳定

### 步骤

1. 打开 <https://gitee.com/> 注册 → **账号设置** → **实名认证**（上传身份证照片，1 分钟过）
2. 新建公开仓库 `ziwei-system`
3. 推送代码：
   ```bash
   cd ziwei-system
   git remote add gitee https://gitee.com/<你的用户名>/ziwei-system.git
   git push gitee main
   ```
4. 仓库 → **服务** → **Gitee Pages** → 选 `main` 分支 → **启动**
5. 拿到链接：`https://<用户名>.gitee.io/ziwei-system`

**注意**：免费版每次推送后需要**手动点一次"更新"** 按钮才会重新部署（付费 Pro 才自动）。
不介意的话这是最稳的方案。

---

## ③ 腾讯云 COS + CDN —— 最快最稳

适合希望拿到 **自定义域名** 或追求极致速度的场景。
COS 本身有免费额度（50GB 存储 + 10GB/月流量），个人分享用完全够。

### 前置

- 腾讯云账号（实名认证过）
- 一个备案过的域名（没有也可以用 `*.myqcloud.com` 默认域名，但那个不支持直接打开网页，必须配 CDN）
- **更省事替代**：直接用方案 ④ EdgeOne Pages

### 步骤（简版）

1. 登录 <https://console.cloud.tencent.com/cos>，创建 Bucket：
   - 名称：`ziwei-<自定数字>`
   - 地域：**上海** 或 **广州**
   - 访问权限：**公有读私有写**
2. Bucket → **基础配置** → **静态网站** → 开启，索引文档填 `index.html`
3. 用本项目自带的一键脚本上传：
   ```bash
   cd ziwei-system
   # 首次：配置密钥
   export TENCENT_SECRET_ID=你的SecretId
   export TENCENT_SECRET_KEY=你的SecretKey
   export COS_BUCKET=ziwei-1234567890
   export COS_REGION=ap-shanghai

   bash scripts/deploy-cos.sh
   ```
4. 脚本输出会给你访问链接形如：
   `https://ziwei-1234567890.cos-website.ap-shanghai.myqcloud.com`

要拿到更好看的域名，可以在 **CDN** 控制台配一个加速域名（需备案）。

---

## ④ EdgeOne Pages —— 腾讯版 Cloudflare Pages（强烈推荐）

这是腾讯 2024 上线的产品，功能和 Cloudflare Pages 一模一样，但国内走腾讯边缘节点，**不被墙、无需备案**就能给你一个 `*.edgeone.app` 的国内可访问域名。

### 步骤

1. 登录 <https://console.tencentcloud.com/edgeone/pages> （先在腾讯云完成实名认证）
2. **新建项目** → 选 **从 Git 导入** 或 **直接上传文件夹**
3. 连接 GitHub/Gitee/Coding 仓库，或直接拖 `ziwei-system` 文件夹上传
4. 构建配置：
   - **构建命令**：留空
   - **输出目录**：`/`
5. 部署成功后拿到 `https://<项目名>.edgeone.app`，国内秒开

**最推荐**：功能和 Cloudflare Pages 完全等价、自动部署、国内快、不需要备案。

---

## 我朋友已经拿到链接打不开怎么办？

发给朋友之前，先让他**用手机流量**打开（排除公司 Wi-Fi 污染）。
如果还是不行，按以下优先级换：

1. 我目前部署在 `*.pages.dev` / `*.vercel.app` → **立刻换到方案 ④ EdgeOne Pages 或 ① GitCode Pages**
2. 备用多地址：可以同时部署到 Cloudflare + EdgeOne，**国内朋友发国内链接，海外朋友发国际链接**

---

## 选型建议

- **我就图快，不想实名**：选 ① GitCode Pages
- **我有腾讯云账号**：选 ④ EdgeOne Pages（体验最好）
- **我有域名 + 想长期用**：选 ③ COS + CDN
- **备胎**：Gitee Pages（手动点更新有点烦）
