---
name: push-and-release
description: 安全推送已审核的文档站提交到发布仓库并触发 GitHub Actions 生产部署。用于明确要求推送并发布或重新部署，不用于普通推送、代码审查或发布说明。
---

# 推送并发布文档站

在仓库根目录执行。以 [.github/workflows/release.yml](../../../.github/workflows/release.yml) 为发布事实源。普通 `main` push 不部署（符合路径条件时可能触发翻译）。本 Skill 使用 `workflow_dispatch` 普通部署，不建 tag、不创建 GitHub Release、不初始化服务器。

## 1. 确认目标和发布内容

- 在此仓库的常用配置中，发布目标是 `github` → `github.com/JantHsueh/ailindo-docs` 的 `main`，站点是 `docs.ailindo.com`；`origin` 指向上游，不是默认发布目标。用 `git remote -v` 和 `git remote get-url --push --all github` 核对。若读写目标不同、存在多个推送地址、目标不符或分支不是 `main`，停下来确认，不改 remote、不切分支、不推上游。
- 用 `gh auth status --hostname github.com` 检查登录。确认目标仓库启用了 `release.yml`、`main` 可手动触发，且 `init`、`cert_staging` 关闭是普通部署。检查将发布提交中的 workflow，而不只看工作区文件。
- 执行 `git status --short --branch`，查看暂存和未暂存 diff。推送只包含提交；不要默认提交未提交改动。仅在用户明确要求提交时暂存其授权的路径并检查 staged diff；不要用 `git add -A` 或把现有无关暂存带入提交。未提交的无关改动可以留在原处，但要说明它们不会发布。
- 固定待发布的完整 SHA（`git rev-parse HEAD`）。`git fetch github refs/heads/main` 后用 `git merge-base --is-ancestor FETCH_HEAD "$sha"` 确认快进；用 `git log --oneline FETCH_HEAD.."$sha"`、`git diff --stat FETCH_HEAD "$sha"` 和 `git diff --check FETCH_HEAD "$sha"` 检查整个待推区间，不只看最后一条提交。落后、分叉、包含未授权提交或关键检查失败时停止，不强推、不自动合并或改写历史。
- 按根目录 `AGENTS.md` 做与变更相关的验证。用待发布内容验证，不把含无关改动的工作区当作已验证的发布快照；若无法验证，先说明限制，不把未验证说成通过。
- 推送前明确列出仓库、分支、SHA、待推提交和验证结果。仅当用户已明确授权这次推送及生产部署时继续；仅要求推送、创建/测试 Skill 或查看发布状态，不授权触发部署。生产部署成功后可能刷新整个 ESA 站点缓存，不只刷新 docs 子域。

## 2. 推送并只触发一次

以下命令使用已核对的默认目标；在执行命令的 shell 中将 `sha` 设为上一步审核过的完整提交 SHA。逐条执行并检查结果，不整段盲跑：

```bash
repo=JantHsueh/ailindo-docs
# 如果远端 main 已经是该 SHA，跳过 push。
git push github "${sha:?必须先设置已审核的完整 SHA}:refs/heads/main"
git ls-remote --exit-code github refs/heads/main
```

如果执行了推送，必须先确认成功。只有远端 `main` 仍等于 `$sha` 才继续。若用户只授权推送，到此为止。触发前检查目标 workflow 的近期运行；如果已有待处理的生产发布，或同一 SHA 已经部署且用户未要求重部署，不重复触发。记录已有 run ID 或请求时间，以区分本次触发与旧记录。

```bash
gh workflow run release.yml --repo "$repo" --ref main -f init=false -f cert_staging=false
```

`--ref main` 是分支名，不是 SHA 锁；用下一步确认实际运行的 `headSha`。如果触发报错或结果不明确，先查询 Actions 判断请求是否已被接受，不盲目重试、不用创建 Release 作为补救。

## 3. 核对运行和站点

优先使用触发响应中的 run ID / URL。没有 ID 时，按 workflow、分支、事件和 SHA 查找，并用触发时间或已记录的 run ID 排除旧运行：

```bash
gh run list --repo "$repo" --workflow release.yml --branch main \
  --event workflow_dispatch --commit "$sha" \
  --json databaseId,headSha,createdAt,status,conclusion,url
```

短时间内有界查询；找不到、无法唯一识别、或运行 SHA 不符时，说明实际情况，不补触发、不自行取消或回滚。确认唯一 run ID 后用 `gh run watch "$run_id" --repo "$repo" --exit-status` 跟踪；失败时用 `gh run view "$run_id" --repo "$repo" --log-failed` 定位失败步骤。不要无期限等待；仍在运行时报告 run 链接和状态，不声称部署已完成。

Actions 成功后访问 `https://docs.ailindo.com/`，确认 HTTPS 请求返回 HTTP 200；按改动抽查对应文档，不把首页可达当作改动已验证。报告 `$sha`、推送结果、run 链接及结论、站点检查结果；如果某步未完成，明确区分「已推送」「已触发」「已部署」「站点已验证」。
