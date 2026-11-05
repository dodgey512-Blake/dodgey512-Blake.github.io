<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Weather 项目

1. 需求以`docs/product-requirements-v6.md`为当前基线，VIS以`public/vis-2/`及其下载目录内的weather-design-skill为准。
2. 默认简体中文；中英文、单位与计划时区独立。公开路径为`/weather-v1/`。
3. `archive/v0.8-site/`是保留的旧站。发布脚本把它复制到站点根目录；不得用新首页覆盖旧根入口。
4. 规则在`app/core.ts`，数据适配在`app/services.ts`。修改建议时运行行为测试与相应界面状态测试；模拟与实际计划隔离。
