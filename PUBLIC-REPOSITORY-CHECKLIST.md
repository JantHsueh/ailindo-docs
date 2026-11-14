# 公开仓库前的检查

检查日期：2026-11-13。**当前工作区已做兼容性和安全改造，不代表可以立即公开历史仓库。**
本次没有推送代码、部署生产环境、修改远端仓库可见性或重写 Git 历史。

## 必须先处理的事项

### 1. 吊销请求记录里的 API 密钥

`openapi/NewAPI.apifox.json` 的 `requestResult` 原始请求记录中包含一个完整的
Bearer API 密钥，在请求头、鉴权配置和执行历史里重复出现。未测试该密钥是否仍有效。

- 当前工作区已清空这条请求记录，保留 OpenAPI 定义及接口示例结构。
- 本地 Git 历史至少有两个文件版本保留了该密钥，相关文件最早在 `1d7c4fc` 中引入。
- **请确认密钥归属并吊销/轮换**；如果来自上游导出文件，需要联系密钥所有者。
- 仅提交删除不等于从历史删除。公开前应清理历史敏感内容，或在确认许可与来源标注后，
  将清理后的快照发布到一个没有敏感历史的新仓库。
- 不要直接在共享分支上未经协调重写历史；也不要把原仓库的全部分支和标签复制到新仓库。

教程里带有部分真实外观字符的脱敏密钥示例，已统一改为 `sk-REPLACE_WITH_YOUR_API_KEY`。
抽查的 API Key 创建截图已做遮挡，但未逐张审查所有图片及其历史版本。
公开前仍应人工检查图片中的密钥、邮箱、账号、余额等信息；遮挡不替代吊销曾暴露的凭据。

### 2. 配置新的部署 Secret

在仓库 Settings → Secrets and variables → Actions 添加：

| 名称                     | 类型   | 要求                                                      |
| ------------------------ | ------ | --------------------------------------------------------- |
| `DEPLOY_HOST`            | Secret | **必填**，填写原发布脚本使用的服务器地址                  |
| `DEPLOY_SSH_FINGERPRINT` | Secret | 推荐，服务器 SSH 主机公钥的 SHA256 指纹，先从可信渠道确认 |

其他现有 Secrets 保持不变。**先配置 `DEPLOY_HOST` 再发布新版本**，
否则发布工作流会在构建前明确报错，不会执行部署。
域名、镜像名和部署目录不是认证凭据，仍保留在配置里。
原服务器地址仍存在于旧提交和可能的旧日志中，移到 Secret 不会自动清除历史信息。

### 3. 检查 GitHub 上的旧数据与权限

仓库由 private 改为 public 后，Actions 历史及日志也会公开。
本次只读查询确认远端仓库仍为 private，有 108 次 Actions 运行、
1 个尚未过期的 Docker 构建记录制品、21 个缓存条目。

抽查了最近一次发布和翻译的完整日志：发布日志中仍可看到原部署地址。
这两次日志未匹配到扫描规则识别的未遮挡 token 或私钥材料，
但这不代表没有其他格式的敏感信息。**其余历史日志、构建缓存与制品内容、
Release 附件或仅远端存在的分支/标签没有完成审查**；没有删除这些远端数据。

- 检查历史日志是否打印服务器地址、运行时配置、请求头或密钥；必要时删除相关运行、制品和缓存。
- 原构建流程曾通过 Docker `ARG` / `ENV` 传递 GitHub token，检查并清理旧构建缓存。
  不要把这次改造理解为已经移除了旧数据。
- 推荐给生产部署配置受保护的 GitHub Environment，并启用主分支和 Release 管理保护。
  当前工作流没有新增必须审批的 Environment，以免静默改变已有发布流程。
- 不要使用 `pull_request_target` 执行未受信任的 PR 代码并向其提供 Secrets。
- 公开后启用可用的 secret scanning / push protection；重新检查仓库成员和 Actions 权限。
- `.env`、`app.env`、SSH 私钥、证书及本地助手配置不应入库或进入 Docker 构建上下文。
- 原有未跟踪文件不属于本次提交范围，添加到 Git 前需另行检查；不要直接把所有未跟踪文件一并提交。

完成以上检查、提交并验证改动后，再在仓库 Settings → General → Danger Zone →
Change repository visibility 中选择 Public。不要在风险处理完之前切换。

## 本次改造

- 发布工作流不再写死服务器地址，默认 `GITHUB_TOKEN` 权限限制为 `contents: read`；
  checkout 不持久化 Git 凭据。
- Docker 构建使用 BuildKit secret mount 临时读取 token，不再将它写入 `ARG` / `ENV`。
  手动构建若需要鉴权，使用 `docker build --secret id=github_token,env=GITHUB_TOKEN -f deploy/Dockerfile .`。
- SSH 上传和部署支持可选的主机指纹校验。
- 翻译工作流将手动输入通过环境变量传入 shell，校验指定路径不能越过中文文档目录，
  并将写权限限制在翻译 job。
- 加强 Git / Docker 对本地密钥、环境文件和助手配置的忽略规则。
- 9 篇中文教程的 59 处图片改为相对 `public/assets` 的路径，不移动或复制原图；
  现有 Fumadocs 编译器仍导入同一文件，不依赖 GitHub 或线上文档站来加载原图。
- 增加 `bun run check:tutorial-images`，检查教程本地图片的路径和文件存在性。

本次扫描了本地全部可达引用中的 362 个提交、4,720 个文本 blob，匹配常见密钥格式。
示例私钥头、已脱敏示例等也会命中规则；这不是全面的凭据审计，
不覆盖图片 OCR、二进制、所有编码形式或所有第三方密钥类型。

## 验证结果

- `bun run check:tutorial-images`：13 个教程文件、59 处本地图片引用通过。
- `bunx --no-install tsc --noEmit --incremental false`：通过。
- 两个工作流的 YAML 解析、shell 语法检查，以及翻译路径的正常输入、
  目录越界、命令注入回归测试：通过。
- 图片检查器的相对路径、引用式图片、缺失文件、越界文件、错误编码、
  站点根路径、远程图片和代码块等 8 类回归测试：通过。
- 在不复制本地 Secrets、不影响现有开发服务的隔离副本中，
  `bun run build --webpack` 通过，生成 406 个静态页面。
  构建测试未配置 `SOURCE_REPO`，前置脚本沿用已有更新日志，没有重新抓取 Release。
- 核对 9 篇教程的生产 HTML：59 处图片全部渲染为有效的生产媒体资源，
  并确认改造前后引用的是相同原图。
- OpenAPI 定义的结构比较通过，唯一内容变化是清空原始 `requestResult` 请求记录。

没有执行真实 Docker 镜像构建或 SSH 部署，也没有在线验证私有仓库改动后的 GitHub 页面。
GitHub 兼容性基于仓库相对路径规则及文件存在性验证，不代表已经提交或推送。

## 搜索引擎与外链

公开意味着搜索引擎有机会读取仓库页面和其中的链接，不等于保证收录，
也不等于保证抓取 `ailindo.com` 或传递排名权重。
抽查 GitHub 公开仓库渲染页时，正文外链带有 `rel="nofollow"`。
Google 对这类链接的处理不应理解为“绝对不可发现”或“可靠的 SEO 权重来源”；
其他搜索引擎的行为也可能不同。

如果目标是让教程和官网被收录，应优先保证正式文档站的可抓取性、站点地图、
规范链接和搜索引擎站长平台配置，而不是单靠 GitHub 仓库外链。

参考（2026-11-13 核实）：

- GitHub 可见性变更及 Actions 日志：
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
- GitHub Markdown 的相对链接与图片：
  https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
- Google 外链属性说明：
  https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links
- Docker 构建密钥：
  https://docs.docker.com/build/building/secrets/
- GitHub 抓取规则（可能随时改变）：
  https://github.com/robots.txt
