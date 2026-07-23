# Weather V0.5 · Weather in Motion

V0.5 是独立的天气状态动效整合版本。V0.4 的源码、公开提交和项目记录继续保留；当前版本把组件库中的 Clear、Rain、Storm 三套天气状态真正接入首页，并修正天气切换控件遮挡动画的问题。

## 当前交付

1. 产品入口：`/`
2. 组件库入口：`/design-system/`
3. V0.5 独立 SVG：`/weather-design-system-v0.5.svg`
4. V0.4 独立 SVG：`/weather-design-system-v0.4.svg`
5. 发布目标：`https://dodgey512-blake.github.io/`

## 三套天气状态

1. Clear：太阳呼吸、光晕旋转、十二段日光射线和三层云漂移。
2. Rain：低压云层、前后景雨线、风向斜角、横向阵风和落雨波纹。
3. Storm：重雨、深色云层、加强阵风、低频双闪和独立闪电路径。
4. 切换天气时，背景、温度、天气标签、体感说明和逐小时预报同步变化。

## 布局修正

1. `WEATHER`、`AUSTIN` 和三态切换器位于同一顶部栏。
2. 切换器不再悬浮在天气动画的太阳或云层上方。
3. 三个按钮保持同一图标规格、44px 触控高度和明确的选中反馈。
4. 320px 下使用紧凑文字与间距，但不缩小核心触控高度。

## 本地运行

```bash
npm install
npm run dev
npm test
```

天气、日历、手表与个人模型仍为 Demo 数据，没有真实外部写入。
