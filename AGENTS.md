# AGENTS.md

## 项目定位

这是 New API / AI 灵动的文档站，不是 New API 网关后端。技术栈是 Next.js App Router、React、Fumadocs MDX / OpenAPI 和 Bun。站点提供使用教程、API 参考、站内搜索及面向 LLM 的文档输出。

## 架构导航

| 路径                                                           | 责任                                                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `content/docs/{zh,en,ja}/`                                     | 三种语言的 MDX 内容；`usage-tutorial/` 是教程，`api/` 是 API 参考，`meta.json` 管理导航顺序和分组。 |
| `source.config.ts` → `.source/` → `src/lib/source.ts`          | Fumadocs 编译并加载文档，生成多语言页面树；`.source/` 是生成目录，不手改。                          |
| `src/app/[lang]/docs/`、`src/mdx-components.tsx`               | 文档布局、页面路由和 MDX 组件；API 页面由 `src/components/api-page.tsx` 渲染。                      |
| `src/lib/i18n.ts`、`middleware.ts`、`next.config.mjs`          | 语言配置、匹配与重写。默认 `zh`，`/` 内部重写到 `/zh/docs`，不对浏览器重定向。                      |
| `src/app/api/`、`src/app/` 下的文本和元数据路由                | 搜索、OpenAPI 请求代理和聊天接口；另外提供 `llms.txt`、原始 MDX、sitemap、robots 等路由。           |
| `openapi/NewAPI.apifox.json`、`openapi/generated/`、`scripts/` | Apifox 输入、按端点生成的 OpenAPI JSON，以及文档生成、翻译、构建前更新日志和图片检查脚本。          |
| `public/assets/`                                               | 文档和教程的静态资源。                                                                              |
| `deploy/`、`.github/workflows/`                                | Docker standalone 镜像、Nginx / Certbot 及 GitHub Actions 发布和翻译流程。                          |

## 修改与验证

- 使用中文文档作为翻译源；同一页面在各语言目录下保留相同的相对路径。新增、移动或删除页面时，检查受影响目录的 `meta.json`、站内链接和静态资源引用。
- 教程图片使用指向 `public/assets/` 的**文件相对路径**，让 GitHub 和站点共用同一张图；不要改用 GitHub `blob` URL。教程或图片路径变更后运行 `bun run check:tutorial-images`。
- API 结构变更先查看 `scripts/generate-openapi-from-http.ts`、`scripts/generate-openapi-docs.ts` 和 `scripts/templates/`。`src/lib/openapi.ts` 在运行时读取 `openapi/generated/`；`bun run generate:openapi` 会清理并重新生成 schema 和 API 文档子树，可能移除现有翻译，不要为普通文案改动运行全量生成。
- 在仓库根目录用 `bun install --frozen-lockfile` 安装依赖（`postinstall` 生成 `.source/`），用 `bun dev` 启动开发站。MDX、导航或站点代码变更用 `bun run build` 验证生产构建；它的 `prebuild` 可能抓取 GitHub Releases 并更新各语言的变更日志，检查 diff，不要误提交无关产物。
- 格式检查优先针对改动文件，不要顺手格式化全仓。不要提交真实 `.env`、`app.env`、私钥或运行时凭据。

## CI 与共享 Skill

- [翻译 workflow](.github/workflows/translate.yml) 会在 `main` 收到符合路径条件的文档变更时运行，必要时创建翻译 PR；它不是生产部署。
- [发布 workflow](.github/workflows/release.yml) 由 `workflow_dispatch` 或已发布的 GitHub Release 触发，不由普通 push 触发。它构建 Docker 镜像并通过 SSH 交给服务器上的 Compose 部署。
- 发布时使用 [push-and-release](.agents/skills/push-and-release/SKILL.md)：Codex 用 `$push-and-release`，Claude Code 用 `/push-and-release`。只在用户明确授权时推送或部署。
- 本文件和 `.agents/skills/` 是共享内容的唯一来源。`CLAUDE.md` 导入本文件；`.claude/skills/` 下的入口只负责发现并加载同一份 Skill，不在两处维护流程。
