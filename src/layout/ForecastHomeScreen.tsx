"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaChartLine, FaUsers, FaCoins, FaBoxOpen, FaShoppingCart, FaBalanceScale } from "react-icons/fa";
import styled from 'styled-components';
import LoaderOverlay from "@/components/LoaderOverlay";

const descriptions = [
  "Replenishment & Aging Insights",
  "Sales Forecasting",
  "Cashflow Forecasting",
  
];

const metricsData = [
  ["/images/forecast/quantity.png", "High ITR Volatility of 492.6%", "Performance Max Aug | Min June", "1.5K Sales"],
  ["/images/forecast/quantity.png", "Sales Quantity Forecast Upper Bound", "Sales Quantity Forecast Lower Bound"],
  ["/images/forecast/quantity.png", "5.6k SKUs deviate >30% from Mean", "30% of Inventory in Bangaluru", "980 Sales"],
  
];

const Endpoints = [
  "/stockReplenishmentForecast",
  "/salesQuantityForecast",
  "/cashFlowForecast",
  
];

const kpiCards = Array.from({ length: 3 }, (_, i) => ({
  id: i + 1,
  name: `KPI ${i + 1}`,
  endpoint: Endpoints[i], // use hardcoded list here
  desc: descriptions[i],
  metrics: metricsData[i],
}));

const StyledWrapper = styled.div`
  .card {
    width: 300px;
    height: 300px;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(251, 248, 255, 0.95) 0%, rgba(244, 240, 255, 0.9) 100%);
    border-radius: 12px;
    text-align: center;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    border: 1px solid rgba(221, 214, 254, 0.7);
  }

  .card:hover {
    box-shadow: 0 20px 40px rgba(139, 92, 246, 0.12), 0 8px 24px rgba(168, 162, 255, 0.08);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 245, 255, 0.95) 100%);
    transform: translateY(-2px);
  }

  .card .blob {
    height: 32px;
    width: 75%;
    border-radius: 0 0 30px 30px;
    margin: 0 auto;
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 162, 255, 0.2) 100%);
    visibility: visible;
    transition: all 0.3s ease;
  }

  .card:hover .blob {
    height: 0;
  }

  .card .img {
    display: flex;
    position: relative;
    margin: 28px auto 32px auto;
    width: 82px;
    height: 82px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(196, 181, 253, 0.15) 100%);
    border-radius: 50%;
    font-size: 11px;
    justify-content: center;
    align-items: center;
    color: rgba(109, 40, 217, 0.8);
    transition: all 0.5s ease-in-out;
    overflow: hidden;
    border: 8px solid rgba(196, 181, 253, 0.2);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.08);
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
    background: rgba(196, 181, 253, 0.35);
    z-index: 99999;
    color: rgba(109, 40, 217, 0.6);
    border: none;
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.12);
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
    color: rgba(88, 80, 141, 0.9);
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
    color: rgba(76, 63, 128, 0.9);
    transition: all 0.1s;
    z-index: -99;
    line-height: 17px;
  }

  .card span {
    font-size: 18px;
    color: rgba(126, 109, 168, 0.8);
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
    color: rgba(88, 80, 141, 0.8);
  }

  .card > p > svg {
    padding: 5px;
    fill: rgba(139, 92, 246, 0.8);
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
    background: linear-gradient(90deg, rgba(221, 214, 254, 0.15) 0%, rgba(196, 181, 253, 0.2) 100%);
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
    gap: 0px;
    margin-bottom: 0px;
    padding: 0 0px;
    opacity: 0.7;
    margin-right: 15px;
    transition: opacity 0.3s ease-in-out;
  }

  .card:hover .metrics-grid {
    opacity: 0;
  }

  .card .metric {
    font-size: 13px;
    color: rgba(88, 80, 141, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.06);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 245, 255, 0.9) 100%);
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid rgba(221, 214, 254, 0.5);
    font-weight: 500;
  }

  .card .metric svg {
    font-size: 12px;
    color: rgba(139, 92, 246, 0.7);
  }

  .card .bottom-streak-blob {
    position: absolute;
    left: 0;
    top: 96%;
    width: 100%;
    height: 12px;
    background: linear-gradient(90deg, rgba(196, 181, 253, 0.2) 0%, rgba(221, 214, 254, 0.25) 50%, rgba(196, 181, 253, 0.2) 100%);
    border-radius: 30px;
    z-index: 1;
    transition: all 0.3s ease-in-out;
  }

  .card:hover .bottom-streak-blob {
    opacity: 0;
    transform: translateY(5px);
  }
`;


export default function ForecastDashboardPage() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      {loading && <LoaderOverlay />}
      <div className={loading ? "pointer-events-none blur-sm" : ""}>
        <div className="p-6 sm:p-10 space-y-8" style={{background: 'transparent'}}>
          
          <div>
         



            <div className="rounded-2xl overflow-hidden" 
                 style={{border: '1px solid rgba(186, 230, 253, 0.6)', background: 'rgba(255, 255, 255, 0.4)'}}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y" 
                   style={{borderColor: 'transparent'}}>
                {kpiCards.map((card) => (
                  <div key={card.id} className="flex justify-center items-center p-6 transition duration-300"
                       style={{
                         background: 'rgba(255, 255, 255, 0.9',
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.background = 'linear-gradient(135deg, rgba(248, 252, 255, 0.6) 0%, rgba(241, 249, 255, 0.8) 100%)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9';
                         
                       }}>
                    <Link href={card.endpoint}>
                      <StyledWrapper>
                        <div className="card relative text-center p-4 rounded-lg shadow-md transition-all duration-300 ease-in-out">
                          <div className="blob absolute top-0 left-10" />
                          
                          <div className="img mb-4">
                            <img
                              src={`/images/forecast/kpi_${card.id}_logo.png`}
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
                          <div className="bottom-streak-blob absolute bottom-0 left-1 right-1" />

                          {/* <div className="metrics-grid flex flex-col gap-3 mt-4 text-xs">
                            <div className="metric flex items-center gap-2">
                              <FaChartLine /> 
                             <span className="font-normal" style={{fontSize: '13px'}}>{card.metrics[0]}</span>
                            </div>
                            <div className="metric flex items-center gap-2">
                              <FaCoins /> 
                              <span className="font-normal" style={{fontSize: '13px'}}>{card.metrics[1]}</span>
                            </div>
                            <div className="metric flex items-center gap-2">
                              <FaShoppingCart /> 
                              <span className="font-normal" style={{fontSize: '13px'}}>{card.metrics[2]}</span>
                            </div>
                          </div> */}
                          <div className="metrics-grid flex flex-col gap-3 mt-4 text-xs">
  <img src={card.metrics[0]} alt="Metric Icon" className="w-full h-full object-contain" />
</div>

                        </div>
                      </StyledWrapper>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
