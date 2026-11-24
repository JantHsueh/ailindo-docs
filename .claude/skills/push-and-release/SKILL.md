---
name: push-and-release
description: 安全推送已审核的文档站提交到发布仓库并触发 GitHub Actions 生产部署。用于明确要求推送并发布或重新部署，不用于普通推送、代码审查或发布说明。
---

先读取仓库根目录下的 [共享发布 Skill](../../../.agents/skills/push-and-release/SKILL.md)，再按该文件执行。这里仅用于 Claude Code 发现 Skill；调用本身不替代对推送和生产部署的授权。如果共享文件不可读取，停止执行并说明原因。
