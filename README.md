# new-api-docs-v1

A Next.js documentation site for New API.

## 教程与公开仓库

- [AI 灵动新手指南](content/docs/zh/usage-tutorial/ailindo-guide.mdx)
- [配置 Trae](content/docs/zh/usage-tutorial/ailindo-trae.mdx)
- [配置 Claude Code](content/docs/zh/usage-tutorial/ailindo-claude-code.mdx)
- [配置 Codex](content/docs/zh/usage-tutorial/ailindo-codex.mdx)
- [公开仓库前的安全检查与部署迁移](PUBLIC-REPOSITORY-CHECKLIST.md)

教程图片统一使用指向 `public/assets` 的**文件相对路径**：

```markdown
![Trae 设置 - 模型](../../../../public/assets/ailindo-guide/trae-settings.png)
```

GitHub 会相对当前文章解析图片；站点构建时，现有 Fumadocs 图片插件会导入同一个文件。
不要使用 GitHub 的 `blob` 页面地址作为图片 URL，也不要为此复制一份图片到仓库根目录。
新增或移动教程后，运行 `bun run check:tutorial-images` 检查路径。

## Development

Run the development server:

```bash
bun install

bun dev
```

Open http://localhost:3000 with your browser to see the result.

## Build

Build the application for production:

```bash
bun run build
```

## Project Structure

| Path                      | Description                  |
| ------------------------- | ---------------------------- |
| `app/(home)`              | Landing page and home pages  |
| `app/[lang]/docs`         | Documentation pages (i18n)   |
| `app/api/search/route.ts` | Search API endpoint          |
| `content/docs/`           | Documentation content (MDX)  |
| `lib/source.ts`           | Content source configuration |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
