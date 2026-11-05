# 天气 Weather V1.0

面向美国地点的双语天气 MVP。默认简体中文，设置内切换英文；日常天气与穿衣免费，跑步计划使用完整训练时段比较时间。

1. [公开 Demo](https://dodgey512-blake.github.io/weather-v1/)
2. [完整产品需求](https://my.feishu.cn/docx/I3D8dzrg4oW6pCx0nldcrkD5nFb)
3. [VIS 2.0 与动态 SVG 组件画布](https://dodgey512-blake.github.io/weather-v1/vis-2/)
4. [Weather design skill](https://dodgey512-blake.github.io/weather-v1/vis-2/downloads/weather-design-skill.zip)
5. [Android APK](https://dodgey512-blake.github.io/weather-v1/downloads/Weather-V1.0.apk) · [Android Studio 工程](https://dodgey512-blake.github.io/weather-v1/downloads/Weather-V1.0-AndroidStudio.zip)

## 使用

选择地点 → 查看天气 / 今日穿衣 → 添加未来72小时内的一条跑步计划 → 阅读整段天气与建议 → 接受、保留或编辑 → 查看重要变化 → 训练后反馈。

1. 地点与计划的时区独立保存，浏览其他城市不改变已有计划。
2. Fixed不改期；缺数据、失效或无可用户外窗口均有明确状态。
3. 设置提供语言、单位、深浅色、动态、玻璃、通知、本机导出与重置。
4. 情景演练使用隔离快照，不改真实计划或实验记录。
5. 价格意向只作自愿研究，不收费或创建订阅。

## 数据和运行边界

天气与官方预警来自NWS；地点搜索与CAMS模型AQI经Open-Meteo获取。CAMS为模型预报，非AirNow地面实测。免费公开服务用于非商业评估，商业部署需要落实供应商许可、自有服务端和监控。

计划、反馈与实验事件保存在本机，可导出JSON；无账户或中央分析后台。天气变化检查在前台和恢复前台时运行，不承诺关闭应用后的后台远程推送。Android为本地资源WebView混合宿主，平台权限和导出桥由原生层提供。真实购买、正式商店签名、美国用户验证和真机验收另行完成。

## 开发与发布

Node 24。保留现有Next/React静态导出，basePath为`/weather-v1`。

```bash
npm ci
npm test
npm run lint
npm run build
npm run release:site
```

`out/`是新版本；`dist/weather-v1/`是新版公开目录。`archive/v0.8-site/`是独立保存的原站，发布时复制到`dist/`根目录，保留原URL与组件库。工作流上传`dist/`，不会用新版首页覆盖旧入口。

浏览器操作回归在`qa/flows.cjs`，状态回归在`qa/states.cjs`；测试使用独立浏览器与明确的供应商fixture。Android Studio工程和本地验收记录位于项目的`Android/WeatherV1/`，公开工程包可独立导入。
