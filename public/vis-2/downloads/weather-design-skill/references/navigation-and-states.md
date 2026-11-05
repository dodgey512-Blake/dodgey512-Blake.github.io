# 导航、材质与状态

## Liquid Glass 的使用边界

导航、工具栏与浮层控制可采用玻璃近似；天气曲线、预警正文和表单内容仍保持清楚的内容面。现有 Web 用 blur、边缘光、层次与有限弹性提供兼容材质，不声称等同 iOS 原生折射。需要真实光学采样时，另读主版 `ui-ux-pro-max/references/ios-liquid-glass.md` 中的 Web 分支；不把整个产品画入Canvas。

原生 iOS 优先系统 TabView / UITabBarController，具体 SDK 能力查 Apple。官方参考：

1. https://developer.apple.com/design/human-interface-guidelines/tab-bars
2. https://developer.apple.com/videos/play/wwdc2025/219/
3. https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views

## Web 导航状态

1. `selected` 是已提交页面，`preview` 是手势候选。镜片位置与活动度独立，静止低对比，按住变亮并略微增厚。
2. pointerdown记录pointerId及原选项并capture；move只更新候选和镜片，pointerup才提交。pointercancel/lostpointercapture恢复原选项，处理重复取消。
3. pointerup之后的合成click不能再选回原项。键盘左右/Home/End和普通点击保留，ARIA与视觉选择同步。
4. blur、隐藏页面、resize、偏好切换中断手势，镜片归位。减少动态时取消跟随弹性；减少透明度时用不透明内容面。
5. 保留DOM按钮名称、焦点、44px点击区及当前页语义。视觉画布如存在，设置aria-hidden；渲染失败时DOM图标与文字立即可见。

## 数据展示状态

| 展示 | 文案 | 操作 |
|---|---|---|
| fresh | 最新 / Updated | 正常阅读及在有效期内决定 |
| cached | 已缓存 / Cached | 展示原始数据时间与缓存说明，不能伪装新观测 |
| stale | 数据已过期 / Out of date | 保留旧内容，重新获取；暂停应用过期建议 |
| unavailable | 暂无数据 / Unavailable | 缺失字段用破折号，重试或换地点 |
| scenario | 演示情景 / Scenario | 持续显示模式，独立数据与指标，不改真实计划 |

展示状态不能替代底层来源、新鲜度和缓存字段；例如有效缓存依然来自NWS，缓存命中不等于模拟。
