"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaChartLine, FaUsers, FaCoins, FaBoxOpen, FaShoppingCart, FaBalanceScale } from "react-icons/fa";
import styled from 'styled-components';
import LoaderOverlay from "@/components/LoaderOverlay";

const descriptions = [
  "Stock Level Change Over Time",
  "Inventory Valuation Over Time",
  "Inventory Turn-Over Ratio",
  "Return Rate Over Time",
  "Aging Distribution",
  "Monthly SKU Purchase Value",
  "Vendor - Volume vs Margin",
  "Revenue per Location",
  "Revenue Distribution Over Time"
];

const metricsData = [
  ["Peak Consumption Aug 2024", "Highest Consumption in HYD-E", "Fastest Growing Group PH-RESP"],
  ["Inventory Peak Apr | Min  Feb", "5.6k SKUs deviate >30% from Mean", "30% of Inventory in Bangaluru", "980 Sales"],
  ["Weak ITR COGS Correlation 0.01", "High ITR Volatility of 492.6%", "Performance Max Aug | Min June", "1.5K Sales"],
  ["72.8% of Months with Zero Returns", "5.5% Overall Return Impact on Sales", "Bangalore - lowest Return Rate", "740 Sales"],
  ["Bangaluru - 2.4k Items <3 Months", "54.2% Optimally Performed", "3.8k Items Stagnant 45+ Days", "1.1K Sales"],
  ["Peak Procurement in September", "Purchase Highest in Vijayawada", "₹66.5L Monthly Purchase Variance", "1.3K Sales"],
  ["HEARNSAY CLINIC Highest Margin", "Highest 33% Vendor in Vijayawada", "Arka Medical Highest Volume Share", "900 Sales"],
  ["386% Avg Monthly Growth", "45% of months had spike in sales", "Peak Sales in December", "1.6K Sales"],
  ["Hyderabad East leads OP sales", "8.7% OP Sales Growth Trend", "Bangalore dominates IP operations", "1.0K Sales"]
];

const endpointsList = [
               { name: "Stock Level Change", path: "/stockChange", pro: false }, 
               { name: "Inventory Valuation", path: "/inventoryValuation", pro: false },
               { name: "Inventory Turnover Ratio", path: "/inventoryTurnOverRatio", pro: false },
               { name: "Return Rate Percentage", path: "/returnRatePercentage", pro: false },
               { name: "Aging Distribution", path: "/agingDistribution", pro: false },
               { name: "Monthly Purchase Value", path: "/monthlyPurchaseValue", pro: false },
               { name: "Vendor Performance", path: "/vendorPerformance", pro: false },
               { name: "Revenue per Location", path: "/revenuePerLocation", pro: false },
               { name: "Revenue Distribution", path: "/revenueDistribution", pro: false },
               { name: "Revenue per Location", path: "/revenuePerLocation", pro: false },
              ]

const colorThemes = [
  // Light Blue (original)
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(59, 130, 246, 0.25) 0%, rgba(125, 211, 252, 0.35) 50%, rgba(59, 130, 246, 0.25) 100%)'
  },
  // Light Green
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(34, 197, 94, 0.25) 0%, rgba(134, 239, 172, 0.35) 50%, rgba(34, 197, 94, 0.25) 100%)'
  },
  // Light Yellow
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(234, 179, 8, 0.25) 0%, rgba(254, 240, 138, 0.35) 50%, rgba(234, 179, 8, 0.25) 100%)'
  },
  // Light Purple
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(147, 51, 234, 0.25) 0%, rgba(196, 181, 253, 0.35) 50%, rgba(147, 51, 234, 0.25) 100%)'
  },
  // Light Pink
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(236, 72, 153, 0.25) 0%, rgba(249, 168, 212, 0.35) 50%, rgba(236, 72, 153, 0.25) 100%)'
  },
  // Light Orange
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(249, 115, 22, 0.25) 0%, rgba(254, 215, 170, 0.35) 50%, rgba(249, 115, 22, 0.25) 100%)'
  },
  // Light Teal
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(20, 184, 166, 0.25) 0%, rgba(153, 246, 228, 0.35) 50%, rgba(20, 184, 166, 0.25) 100%)'
  },
  // Light Indigo
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(99, 102, 241, 0.25) 0%, rgba(199, 210, 254, 0.35) 50%, rgba(99, 102, 241, 0.25) 100%)'
  },
  // Light Rose
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
    bottomStreakBlob: 'linear-gradient(90deg, rgba(244, 63, 94, 0.25) 0%, rgba(252, 165, 165, 0.35) 50%, rgba(244, 63, 94, 0.25) 100%)'
  }
];

const kpiCards = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  name: `KPI ${i + 1}`,
  endpoint: `${endpointsList[i]['path']}`,
  desc: descriptions[i],
  metrics: metricsData[i],
  theme: colorThemes[i]
}));

// KPIs in the PDF scope but not buildable from the current dataset (proxy / no data).
const DISABLED_KPI_PATHS = new Set([
  "/inventoryValuation", "/inventoryTurnOverRatio", "/returnRatePercentage",
  "/revenueDistribution", "/revenuePerLocation",
]);

// TypeScript interface for theme props - note the $ prefix
interface ThemeProps {
  $cardTheme: {
    background: string;
    hoverBackground: string;
    border: string;
    boxShadow: string;
    blob: string;
    imgBackground: string;
    imgBorder: string;
    imgColor: string;
    imgBoxShadow: string;
    hoverImgBackground: string;
    hoverImgBoxShadow: string;
    hoverImgColor: string;
    bottomBlob: string;
    metricBackground: string;
    metricBoxShadow: string;
    metricBorder: string;
    metricIconColor: string;
    bottomStreakBlob: string;
  };
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

  .card .img img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transform: scale(0.9);
    filter: brightness(1) saturate(1) contrast(0.9);
    transition: opacity 0.6s ease-in-out, transform 0.6s ease, filter 0.6s ease;
    transition-delay: 0s;
    z-index: 2;
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
  }

  .card:hover .img img {
    opacity: 1;
    border-radius: 15px 15px 15px 15px;
    filter: brightness(1) saturate(1) contrast(0.9);
    transition-delay: 0.5s;
  }

  .card:hover .img svg {
    opacity: 0;
    border-radius: 15px 15px 15px 15px;
    transition: opacity 0.3s ease-in-out;
  }

  .card .hover-text {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 80%;
    height: 20%;
    background-color: transparent;
    color: rgba(51, 65, 85, 0.95);
    font-size: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: none;
    transition-delay: 0s;
    border-radius: 0 0 12px 12px;
    padding: 0px;
    pointer-events: none;
    text-align: center;
    font-weight: 500;
  }

  .card:hover .hover-text {
    opacity: 1;
    transition-delay: 0.6s;
    transition: opacity 0.3s ease-in-out;
  }

  .card h2 {
    padding: 15px 10px;
    font-size: 15px;
    color: rgba(30, 41, 59, 0.95);
    transition: all 0.1s;
    z-index: -99;
    line-height: 17px;
  }

  .card span {
    font-size: 18px;
    color: rgba(71, 85, 105, 0.9);
  }

  .card:hover h3 {
    opacity: 0;
    width: 100%;
    position: absolute;
    transition: all 0.5s;
  }

  .card > p {
    opacity: 0;
    transition: all 0.75s;
    color: rgba(51, 65, 85, 0.9);
  }

  .card > p > svg {
    padding: 5px;
    fill: rgba(16, 185, 129, 0.9);
  }

  .card:hover > p {
    position: absolute;
    bottom: 15px;
    left: 35px;
    opacity: 1;
    transition: all 0.1s;
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
    gap: 22px;
    margin-top: 25px;
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      {loading && <LoaderOverlay />}
      <div className={loading ? "pointer-events-none blur-sm" : ""}>
        <div className="p-6 sm:p-0 space-y-8 mt-0" style={{background: 'transparent'}}>
          
          <div>
            <div className="rounded-2xl overflow-hidden" 
                 style={{border: '1px solid rgba(186, 230, 253, 0.6)', background: 'rgba(255, 255, 255, 0.4)'}}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y" 
                   style={{borderColor: 'transparent'}}>
                {kpiCards.map((card) => {
                  const isDisabled = DISABLED_KPI_PATHS.has(card.endpoint);
                  return (
                  <div key={card.id} className="relative flex justify-center items-center p-6 transition duration-300"
                       style={{
                         background: 'rgba(255, 255, 255, 0.9',
                         opacity: isDisabled ? 0.4 : 1,
                         filter: isDisabled ? 'grayscale(1)' : 'none',
                         pointerEvents: isDisabled ? 'none' : 'auto',
                       }}
                       title={isDisabled ? 'Not available for the current dataset — requires additional data from HCG (see KPI workbook).' : undefined}
                       onMouseEnter={(e) => {
                         if (isDisabled) return;
                         e.currentTarget.style.background = 'linear-gradient(135deg, rgba(248, 252, 255, 0.6) 0%, rgba(241, 249, 255, 0.8) 100%)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9';

                       }}>
                    {isDisabled && (
                      <span className="absolute top-3 right-3 z-20 text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-500">Data N/A</span>
                    )}
                    <Link href={card.endpoint}>
                      <StyledWrapper $cardTheme={card.theme}>
                        <div className="card relative text-center p-4 rounded-lg shadow-md transition-all duration-300 ease-in-out">
                          <div className="blob absolute top-0 left-10" />
                          
                          <div className="img mb-4">
                            <img
                              src={`/images/kpi_logos/kpi_${card.id}_logo.png`}
                              alt={`KPI ${card.id}`}
                              className="w-16 h-16 mx-auto"
                            />
                          </div>

                          <h3 className="text-lg  font-bold mb-3 leading-tight opacity-80" 
                              style={{color: 'rgba(103, 124, 155, 1)', lineHeight: '1'}}>
                            {card.desc}
                          </h3>

                          <p className="hover-text text-sm">{card.desc}</p>

                          <div className="bottom-blob-left absolute bottom-0 left-0" />
                          <div className="bottom-blob-right absolute bottom-0 right-0" />
                          <div className="bottom-streak-blob absolute bottom-1 left-1 right-1" />

                          <div className="metrics-grid flex flex-col gap-3 mt-4 text-xs">
                            <div className="metric flex items-center gap-2">
                              <FaChartLine /> 
                             <span className="font-light " style={{fontSize: '13px'}}>{card.metrics[0]}</span>
                            </div>
                            <div className="metric flex items-center gap-2">
                              <FaCoins /> 
                              <span className="font-light" style={{fontSize: '13px'}}>{card.metrics[1]}</span>
                            </div>
                            <div className="metric flex items-center gap-2">
                              <FaShoppingCart /> 
                              <span className="font-light" style={{fontSize: '13px'}}>{card.metrics[2]}</span>
                            </div>
                          </div>
                        </div>
                      </StyledWrapper>
                    </Link>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
