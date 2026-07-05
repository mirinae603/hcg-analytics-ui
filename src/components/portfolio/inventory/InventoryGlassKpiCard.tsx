"use client";
import React from "react";
import Link from "next/link";
import styled from "styled-components";
import { FaChartLine, FaCoins, FaShoppingCart } from "react-icons/fa";
import MiniSparkChart from "./MiniSparkChart";
import {
  TbBoxMultiple, TbHourglassHigh, TbCalendarTime, TbArrowsExchange,
  TbChartDonut, TbHeartRateMonitor, TbBan, TbAlertTriangle, TbClockExclamation,
  TbBuildingWarehouse, TbTrendingDown,
} from "react-icons/tb";
import { IconType } from "react-icons";
import { Kpi } from "@/lib/kpiRegistry";

// Clean professional line icons per inventory KPI (no emojis)
const KPI_ICONS: Record<string, IconType> = {
  "current-stock-value": TbBoxMultiple,
  "inventory-aging": TbHourglassHigh,
  "days-on-hand": TbCalendarTime,
  "stock-change": TbArrowsExchange,
  "aging-distribution": TbChartDonut,
  "inventory-health-score": TbHeartRateMonitor,
  "non-moving-inventory": TbBan,
  "inventory-risk": TbAlertTriangle,
  "near-expiry": TbClockExclamation,
  "holding-cost": TbBuildingWarehouse,
  "stock-out-rate": TbTrendingDown,
};

// Exact colorThemes from AnalyticsHomeScreen.tsx
const colorThemes = [
  {
    background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.98) 0%, rgba(219, 244, 255, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(240, 249, 255, 0.98) 100%)',
    border: 'rgba(59, 130, 246, 0.25)',
    boxShadow: '0 20px 40px rgba(59, 130, 246, 0.18), 0 8px 24px rgba(14, 165, 233, 0.12)',
    blob: 'linear-gradient(90deg, rgba(59, 130, 246, 0.25) 0%, rgba(14, 165, 233, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(59, 130, 246, 0.35) 0%, rgba(14, 165, 233, 0.25) 100%)',
    imgBorder: 'rgba(147, 197, 253, 0.35)',
    imgColor: 'rgba(37, 99, 235, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(59, 130, 246, 0.12)',
    hoverImgBackground: 'rgba(59, 130, 246, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)',
    hoverImgColor: 'rgba(37, 99, 235, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(125, 211, 252, 0.25) 0%, rgba(59, 130, 246, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 249, 255, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)',
    metricBorder: 'rgba(59, 130, 246, 0.2)',
    metricIconColor: 'rgba(59, 130, 246, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(59, 130, 246, 0.25) 0%, rgba(125, 211, 252, 0.35) 50%, rgba(59, 130, 246, 0.25) 100%)',
    chartColor: '#3b82f6',
  },
  {
    background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.98) 0%, rgba(220, 252, 231, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(240, 253, 244, 0.98) 100%)',
    border: 'rgba(34, 197, 94, 0.25)',
    boxShadow: '0 20px 40px rgba(34, 197, 94, 0.18), 0 8px 24px rgba(16, 185, 129, 0.12)',
    blob: 'linear-gradient(90deg, rgba(34, 197, 94, 0.25) 0%, rgba(16, 185, 129, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(34, 197, 94, 0.35) 0%, rgba(16, 185, 129, 0.25) 100%)',
    imgBorder: 'rgba(134, 239, 172, 0.35)',
    imgColor: 'rgba(21, 128, 61, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(34, 197, 94, 0.12)',
    hoverImgBackground: 'rgba(34, 197, 94, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(34, 197, 94, 0.15)',
    hoverImgColor: 'rgba(21, 128, 61, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(134, 239, 172, 0.25) 0%, rgba(34, 197, 94, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 253, 244, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
    metricBorder: 'rgba(34, 197, 94, 0.2)',
    metricIconColor: 'rgba(34, 197, 94, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(34, 197, 94, 0.25) 0%, rgba(134, 239, 172, 0.35) 50%, rgba(34, 197, 94, 0.25) 100%)',
    chartColor: '#22c55e',
  },
  {
    background: 'linear-gradient(135deg, rgba(254, 252, 232, 0.98) 0%, rgba(254, 249, 195, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(254, 252, 232, 0.98) 100%)',
    border: 'rgba(234, 179, 8, 0.25)',
    boxShadow: '0 20px 40px rgba(234, 179, 8, 0.18), 0 8px 24px rgba(245, 158, 11, 0.12)',
    blob: 'linear-gradient(90deg, rgba(234, 179, 8, 0.25) 0%, rgba(245, 158, 11, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(234, 179, 8, 0.35) 0%, rgba(245, 158, 11, 0.25) 100%)',
    imgBorder: 'rgba(254, 240, 138, 0.35)',
    imgColor: 'rgba(161, 98, 7, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(234, 179, 8, 0.12)',
    hoverImgBackground: 'rgba(234, 179, 8, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(234, 179, 8, 0.15)',
    hoverImgColor: 'rgba(161, 98, 7, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(254, 240, 138, 0.25) 0%, rgba(234, 179, 8, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(254, 252, 232, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(234, 179, 8, 0.08)',
    metricBorder: 'rgba(234, 179, 8, 0.2)',
    metricIconColor: 'rgba(234, 179, 8, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(234, 179, 8, 0.25) 0%, rgba(254, 240, 138, 0.35) 50%, rgba(234, 179, 8, 0.25) 100%)',
    chartColor: '#eab308',
  },
  {
    background: 'linear-gradient(135deg, rgba(250, 245, 255, 0.98) 0%, rgba(243, 232, 255, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(250, 245, 255, 0.98) 100%)',
    border: 'rgba(147, 51, 234, 0.25)',
    boxShadow: '0 20px 40px rgba(147, 51, 234, 0.18), 0 8px 24px rgba(168, 85, 247, 0.12)',
    blob: 'linear-gradient(90deg, rgba(147, 51, 234, 0.25) 0%, rgba(168, 85, 247, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(147, 51, 234, 0.35) 0%, rgba(168, 85, 247, 0.25) 100%)',
    imgBorder: 'rgba(196, 181, 253, 0.35)',
    imgColor: 'rgba(107, 33, 168, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(147, 51, 234, 0.12)',
    hoverImgBackground: 'rgba(147, 51, 234, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(147, 51, 234, 0.15)',
    hoverImgColor: 'rgba(107, 33, 168, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(196, 181, 253, 0.25) 0%, rgba(147, 51, 234, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 245, 255, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(147, 51, 234, 0.08)',
    metricBorder: 'rgba(147, 51, 234, 0.2)',
    metricIconColor: 'rgba(147, 51, 234, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(147, 51, 234, 0.25) 0%, rgba(196, 181, 253, 0.35) 50%, rgba(147, 51, 234, 0.25) 100%)',
    chartColor: '#9333ea',
  },
  {
    background: 'linear-gradient(135deg, rgba(253, 242, 248, 0.98) 0%, rgba(252, 231, 243, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(253, 242, 248, 0.98) 100%)',
    border: 'rgba(236, 72, 153, 0.25)',
    boxShadow: '0 20px 40px rgba(236, 72, 153, 0.18), 0 8px 24px rgba(244, 114, 182, 0.12)',
    blob: 'linear-gradient(90deg, rgba(236, 72, 153, 0.25) 0%, rgba(244, 114, 182, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(236, 72, 153, 0.35) 0%, rgba(244, 114, 182, 0.25) 100%)',
    imgBorder: 'rgba(249, 168, 212, 0.35)',
    imgColor: 'rgba(190, 24, 93, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(236, 72, 153, 0.12)',
    hoverImgBackground: 'rgba(236, 72, 153, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(236, 72, 153, 0.15)',
    hoverImgColor: 'rgba(190, 24, 93, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(249, 168, 212, 0.25) 0%, rgba(236, 72, 153, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(253, 242, 248, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(236, 72, 153, 0.08)',
    metricBorder: 'rgba(236, 72, 153, 0.2)',
    metricIconColor: 'rgba(236, 72, 153, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(236, 72, 153, 0.25) 0%, rgba(249, 168, 212, 0.35) 50%, rgba(236, 72, 153, 0.25) 100%)',
    chartColor: '#ec4899',
  },
  {
    background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.98) 0%, rgba(254, 237, 213, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 247, 237, 0.98) 100%)',
    border: 'rgba(249, 115, 22, 0.25)',
    boxShadow: '0 20px 40px rgba(249, 115, 22, 0.18), 0 8px 24px rgba(251, 146, 60, 0.12)',
    blob: 'linear-gradient(90deg, rgba(249, 115, 22, 0.25) 0%, rgba(251, 146, 60, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(249, 115, 22, 0.35) 0%, rgba(251, 146, 60, 0.25) 100%)',
    imgBorder: 'rgba(254, 215, 170, 0.35)',
    imgColor: 'rgba(194, 65, 12, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(249, 115, 22, 0.12)',
    hoverImgBackground: 'rgba(249, 115, 22, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(249, 115, 22, 0.15)',
    hoverImgColor: 'rgba(194, 65, 12, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(254, 215, 170, 0.25) 0%, rgba(249, 115, 22, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 247, 237, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(249, 115, 22, 0.08)',
    metricBorder: 'rgba(249, 115, 22, 0.2)',
    metricIconColor: 'rgba(249, 115, 22, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(249, 115, 22, 0.25) 0%, rgba(254, 215, 170, 0.35) 50%, rgba(249, 115, 22, 0.25) 100%)',
    chartColor: '#f97316',
  },
  {
    background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.98) 0%, rgba(204, 251, 241, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(240, 253, 250, 0.98) 100%)',
    border: 'rgba(20, 184, 166, 0.25)',
    boxShadow: '0 20px 40px rgba(20, 184, 166, 0.18), 0 8px 24px rgba(45, 212, 191, 0.12)',
    blob: 'linear-gradient(90deg, rgba(20, 184, 166, 0.25) 0%, rgba(45, 212, 191, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(20, 184, 166, 0.35) 0%, rgba(45, 212, 191, 0.25) 100%)',
    imgBorder: 'rgba(153, 246, 228, 0.35)',
    imgColor: 'rgba(15, 118, 110, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(20, 184, 166, 0.12)',
    hoverImgBackground: 'rgba(20, 184, 166, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(20, 184, 166, 0.15)',
    hoverImgColor: 'rgba(15, 118, 110, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(153, 246, 228, 0.25) 0%, rgba(20, 184, 166, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 253, 250, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(20, 184, 166, 0.08)',
    metricBorder: 'rgba(20, 184, 166, 0.2)',
    metricIconColor: 'rgba(20, 184, 166, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(20, 184, 166, 0.25) 0%, rgba(153, 246, 228, 0.35) 50%, rgba(20, 184, 166, 0.25) 100%)',
    chartColor: '#14b8a6',
  },
  {
    background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.98) 0%, rgba(224, 231, 255, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(238, 242, 255, 0.98) 100%)',
    border: 'rgba(99, 102, 241, 0.25)',
    boxShadow: '0 20px 40px rgba(99, 102, 241, 0.18), 0 8px 24px rgba(129, 140, 248, 0.12)',
    blob: 'linear-gradient(90deg, rgba(99, 102, 241, 0.25) 0%, rgba(129, 140, 248, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(129, 140, 248, 0.25) 100%)',
    imgBorder: 'rgba(199, 210, 254, 0.35)',
    imgColor: 'rgba(67, 56, 202, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(99, 102, 241, 0.12)',
    hoverImgBackground: 'rgba(99, 102, 241, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(99, 102, 241, 0.15)',
    hoverImgColor: 'rgba(67, 56, 202, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(199, 210, 254, 0.25) 0%, rgba(99, 102, 241, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(238, 242, 255, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)',
    metricBorder: 'rgba(99, 102, 241, 0.2)',
    metricIconColor: 'rgba(99, 102, 241, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(99, 102, 241, 0.25) 0%, rgba(199, 210, 254, 0.35) 50%, rgba(99, 102, 241, 0.25) 100%)',
    chartColor: '#6366f1',
  },
  {
    background: 'linear-gradient(135deg, rgba(255, 241, 242, 0.98) 0%, rgba(254, 226, 226, 0.95) 100%)',
    hoverBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 241, 242, 0.98) 100%)',
    border: 'rgba(244, 63, 94, 0.25)',
    boxShadow: '0 20px 40px rgba(244, 63, 94, 0.18), 0 8px 24px rgba(251, 113, 133, 0.12)',
    blob: 'linear-gradient(90deg, rgba(244, 63, 94, 0.25) 0%, rgba(251, 113, 133, 0.35) 100%)',
    imgBackground: 'linear-gradient(135deg, rgba(244, 63, 94, 0.35) 0%, rgba(251, 113, 133, 0.25) 100%)',
    imgBorder: 'rgba(252, 165, 165, 0.35)',
    imgColor: 'rgba(190, 18, 60, 0.9)',
    imgBoxShadow: '0 4px 12px rgba(244, 63, 94, 0.12)',
    hoverImgBackground: 'rgba(244, 63, 94, 0.15)',
    hoverImgBoxShadow: '0 8px 24px rgba(244, 63, 94, 0.15)',
    hoverImgColor: 'rgba(190, 18, 60, 0.7)',
    bottomBlob: 'linear-gradient(90deg, rgba(252, 165, 165, 0.25) 0%, rgba(244, 63, 94, 0.3) 100%)',
    metricBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 241, 242, 0.95) 100%)',
    metricBoxShadow: '0 2px 8px rgba(244, 63, 94, 0.08)',
    metricBorder: 'rgba(244, 63, 94, 0.2)',
    metricIconColor: 'rgba(244, 63, 94, 0.85)',
    bottomStreakBlob: 'linear-gradient(90deg, rgba(244, 63, 94, 0.25) 0%, rgba(252, 165, 165, 0.35) 50%, rgba(244, 63, 94, 0.25) 100%)',
    chartColor: '#f43f5e',
  },
];

interface ThemeProps {
  $cardTheme: (typeof colorThemes)[0];
}

const StyledWrapper = styled.div<ThemeProps>`
  .card {
    width: 300px;
    height: 300px;
    overflow: hidden;
    background: ${(props) => props.$cardTheme.background};
    border-radius: 12px;
    text-align: center;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    border: 1px solid ${(props) => props.$cardTheme.border};
  }

  .card:hover {
    box-shadow: ${(props) => props.$cardTheme.boxShadow};
    background: ${(props) => props.$cardTheme.hoverBackground};
    transform: translateY(-2px);
  }

  .card .blob {
    height: 12px;
    width: 75%;
    border-radius: 0 0 30px 30px;
    margin: 0 auto;
    background: ${(props) => props.$cardTheme.blob};
    visibility: visible;
    transition: all 0.3s ease;
  }

  .card:hover .blob {
    height: 0;
  }

  .card .img {
    display: flex;
    position: relative;
    margin: 18px auto 12px auto;
    width: 42px;
    height: 42px;
    background: ${(props) => props.$cardTheme.imgBackground};
    border-radius: 50%;
    font-size: 11px;
    justify-content: center;
    align-items: center;
    color: ${(props) => props.$cardTheme.imgColor};
    transition: all 0.5s ease-in-out;
    overflow: hidden;
    border: 8px solid ${(props) => props.$cardTheme.imgBorder};
    box-shadow: ${(props) => props.$cardTheme.imgBoxShadow};
  }

  .card:hover .img {
    width: 100%;
    height: 75%;
    border-radius: 15px 15px 15px 15px;
    margin: 0 auto;
    background: ${(props) => props.$cardTheme.hoverImgBackground};
    z-index: 99999;
    color: ${(props) => props.$cardTheme.hoverImgColor};
    border: none;
    box-shadow: ${(props) => props.$cardTheme.hoverImgBoxShadow};
    font-size: 0;
  }

  .card .img .chart-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.4s ease-in-out;
    transition-delay: 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card:hover .img .chart-container {
    opacity: 1;
  }

  .card .img .icon-symbol {
    font-size: 20px;
    transition: opacity 0.3s ease;
  }

  .card:hover .img .icon-symbol {
    opacity: 0;
  }

  .card:hover .img svg.icon-svg {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }

  .card h3 {
    padding: 15px 10px;
    font-size: 15px;
    color: rgba(30, 41, 59, 0.95);
    transition: all 0.1s;
    z-index: 1;
    position: relative;
    line-height: 17px;
  }

  .card:hover h3 {
    opacity: 0;
    position: absolute;
    transition: all 0.5s;
  }

  .card .bottom-blob-left,
  .card .bottom-blob-right {
    position: absolute;
    bottom: 0;
    width: 40%;
    height: 10px;
    background: ${(props) => props.$cardTheme.bottomBlob};
    border-radius: 30px 30px 0 0;
  }

  .card .bottom-blob-left {
    left: 0;
    border-bottom-left-radius: 0;
  }

  .card .bottom-blob-right {
    right: 0;
    border-bottom-right-radius: 0;
  }

  .card .metrics-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 7px;
    margin-top: 10px;
    padding: 0 5px;
    opacity: 1;
    transition: opacity 0.3s ease-in-out;
  }

  .card:hover .metrics-grid {
    opacity: 0;
  }

  .card .metric {
    font-size: 13px;
    color: rgba(51, 65, 85, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: ${(props) => props.$cardTheme.metricBoxShadow};
    background: ${(props) => props.$cardTheme.metricBackground};
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid ${(props) => props.$cardTheme.metricBorder};
    font-weight: 500;
  }

  .card .metric svg {
    font-size: 12px;
    color: ${(props) => props.$cardTheme.metricIconColor};
    flex-shrink: 0;
  }

  .card .bottom-streak-blob {
    position: absolute;
    left: 0;
    top: 96%;
    width: 100%;
    height: 12px;
    background: ${(props) => props.$cardTheme.bottomStreakBlob};
    border-radius: 30px;
    z-index: 1;
    transition: all 0.3s ease-in-out;
  }

  .card:hover .bottom-streak-blob {
    opacity: 0;
    transform: translateY(5px);
  }
`;

interface Props {
  kpi: Kpi;
  index: number;
  insights: string[];
  chartData: any[];
}

// Flatten the aggregated chart rows into a single numeric array for the spark.
function buildSparkValues(kpi: Kpi, chartData: any[]): number[] {
  if (!chartData || chartData.length === 0) return [];
  const seriesField = kpi.chart?.series?.[0]?.field ?? "";
  return chartData.map((row: any) => Number(row[seriesField] ?? 0)).filter((v) => Number.isFinite(v));
}

export default function InventoryGlassKpiCard({ kpi, index, insights, chartData }: Props) {
  const theme = colorThemes[index % colorThemes.length];
  const chartType = kpi.chart?.type ?? "bar";
  const sparkKind: "bar" | "line" | "donut" =
    chartType === "donut" ? "donut" : chartType === "line" ? "line" : "bar";
  const sparkValues = buildSparkValues(kpi, chartData);

  return (
    <StyledWrapper $cardTheme={theme}>
      <Link href={`/kpi/${kpi.key}`}>
        <div className="card relative text-center p-4 rounded-lg shadow-md transition-all duration-300 ease-in-out">
          <div className="blob absolute top-0 left-10" />

          {/* Icon / chart blob */}
          <div className="img mb-2">
            {/* Clean line icon visible by default; CSS fades it out on hover */}
            <span className="icon-symbol" style={{ display: "flex" }}>
              {(() => {
                const Icon = KPI_ICONS[kpi.key] ?? TbBoxMultiple;
                return <Icon size={22} />;
              })()}
            </span>

            {/* Lightweight inline-SVG spark — always mounted, CSS reveals on hover */}
            <div className="chart-container">
              <MiniSparkChart
                kind={sparkKind}
                values={sparkValues}
                color={theme.chartColor}
                width={sparkKind === "donut" ? 150 : 230}
                height={sparkKind === "donut" ? 130 : 120}
              />
            </div>
          </div>

          {/* Title */}
          <h3
            className="text-lg font-bold mb-2 leading-tight"
            style={{ color: "rgba(103, 124, 155, 1)", lineHeight: "1.15", opacity: 0.85 }}
          >
            {kpi.title}
          </h3>

          {/* Insight pills */}
          <div className="metrics-grid flex flex-col gap-2 mt-3 text-xs">
            <div className="metric flex items-center gap-2">
              <FaChartLine className="icon-svg" />
              <span className="font-light" style={{ fontSize: "12px" }}>
                {insights[0] ?? kpi.short}
              </span>
            </div>
            <div className="metric flex items-center gap-2">
              <FaCoins className="icon-svg" />
              <span className="font-light" style={{ fontSize: "12px" }}>
                {insights[1] ?? kpi.card.label}
              </span>
            </div>
            <div className="metric flex items-center gap-2">
              <FaShoppingCart className="icon-svg" />
              <span className="font-light" style={{ fontSize: "12px" }}>
                {insights[2] ?? `${kpi.portfolio} Portfolio KPI`}
              </span>
            </div>
          </div>

          <div className="bottom-blob-left absolute bottom-0 left-0" />
          <div className="bottom-blob-right absolute bottom-0 right-0" />
          <div className="bottom-streak-blob absolute bottom-1 left-1 right-1" />
        </div>
      </Link>
    </StyledWrapper>
  );
}
