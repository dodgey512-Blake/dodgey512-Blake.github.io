'use client';
import { useEffect } from 'react';
export default function DesignSystem() {
  useEffect(() => { window.location.replace('/weather-v1/vis-2/'); }, []);
  return <main style={{padding:32}}><a href="/weather-v1/vis-2/">打开 VIS 2.0 设计规范与组件 / Open the design system</a></main>;
}
