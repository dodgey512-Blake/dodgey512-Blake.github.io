# Weather V0.8 · MVP V5.2 可执行版

V0.8 是基于《天气应用 MVP V5.2》的首个完整可执行版本。V0.5 已以 Git tag `v0.5.0` 保留，本版本不覆盖旧版记录。

## 可验收主链路

1. 选择 Austin、New York、Seattle 或 Denver。
2. 读取美国 National Weather Service 的实时观测、72 小时预报和官方预警。
3. 在首页切换 Live / Clear / Rain / Storm，检查对应天气动效；Rain 与 Storm 使用闭合 SVG 雨滴，不使用长直线代替。
4. 查看 OOTD Lite 并记录冷 / 合适 / 热反馈。
5. 新建未来 72 小时内的一次跑步计划，获得 Keep / Watch / Change 建议。
6. 接受建议、保留原计划或自行编辑；Demo 只更新本地计划，不伪装成 Calendar、Watch 或支付写入。
7. 测试天气变化后的重新判断，并提交跑后反馈。

## 数据与边界

- 实时数据：美国 NWS 无密钥公开 API。
- 降级：NWS 不可用时，明确显示 `DEMO DATA` 与失败提示，不把模拟数据伪装为实时数据。
- 本地状态：`localStorage`，无账号、无云端个人档案。
- 旧组件库：`/design-system/` 继续展示 V0.5 动态 SVG 大画布。

## 本地验收

```bash
npm ci
npm run lint
npm test
```

发布目标：<https://dodgey512-blake.github.io/>
