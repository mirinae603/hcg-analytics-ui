'use client'

import React from "react";
import StockChangeChart from "@/components/ecommerce/StockChangeKPI";
import StatisticsChart_KPI_8 from "@/components/ecommerce/Chart_KPI_8";
import StockChangeTable from "@/components/ecommerce/RecordsTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StockKPICards from "@/components/ecommerce/KPICardStockChange";
import YoYPremiumCard from "@/components/ecommerce/cards_collection/yoycard";
import WarehouseInventoryCard from "@/components/ecommerce/cards_collection/stockvaluecard";
import { useRegion } from '@/context/RegionContext';


// Region-wise YoY sales data (Q1 2025 vs Q1 2024)
const regionYoYSalesData = {
  "Bangalore": {
    currentValue: 646222,
    previousValue: 637748,
    yoyChange: 1.3,
    period: "Q1 2025 vs Q1 2024"
  },
  "Chennai": {
    currentValue: 133106,
    previousValue: 90853,
    yoyChange: 46.5,
    period: "Q1 2025 vs Q1 2024"
  },
  "Hyderabad East": {
    currentValue: 791347,
    previousValue: 821825,
    yoyChange: -3.7,
    period: "Q1 2025 vs Q1 2024"
  },
  "Hyderabad West": {
    currentValue: 518798,
    previousValue: 505622,
    yoyChange: 2.6,
    period: "Q1 2025 vs Q1 2024"
  },
  "Vijayawada": {
    currentValue: 728938,
    previousValue: 705882,
    yoyChange: 3.3,
    period: "Q1 2025 vs Q1 2024"
  }
};

// Region-wise inventory value data (2024-2025 vs 2023-2024)
const regionInventoryData = {
  "Bangalore": {
    currentValue: 131834983.02,
    previousValue: 55380884.93,
    yoyChangeRupees: 76454098.09,
    yoyChangePercent: 138.1
  },
  "Chennai": {
    currentValue: 4829621.91,
    previousValue: 6758032.34,
    yoyChangeRupees: -1928410.43,
    yoyChangePercent: -28.5
  },
  "Hyderabad East": {
    currentValue: 395727729.29,
    previousValue: 166424372.58,
    yoyChangeRupees: 229303356.71,
    yoyChangePercent: 137.8
  },
  "Hyderabad West": {
    currentValue: 2004999.66,
    previousValue: 3893284.42,
    yoyChangeRupees: -1888284.76,
    yoyChangePercent: -48.5
  },
  "Vijayawada": {
    currentValue: 64665061.79,
    previousValue: 39185381.62,
    yoyChangeRupees: 25479680.17,
    yoyChangePercent: 65.0
  }
};

export default function Ecommerce() {
  const { selectedRegion } = useRegion();
  const regionName = selectedRegion?.name ?? "Chennai";
  const regionYoYData = regionYoYSalesData[regionName as keyof typeof regionYoYSalesData] || regionYoYSalesData["Chennai"];
  const regionInventoryInfo = regionInventoryData[regionName as keyof typeof regionInventoryData] || regionInventoryData["Chennai"];

  return (
    <>
      <PageBreadcrumb pageTitle="Stock Level Change Over Time" />
      <div>
        <StockKPICards />
      </div>
      <div className="grid grid-cols-10 gap-4 md:gap-4">
        <div className="col-span-8">
          <StockChangeChart />
        </div>

        <div className="flex flex-col space-y-0 mt-0">
          <YoYPremiumCard
            yoyChange={regionYoYData.yoyChange}
            currentValue={regionYoYData.currentValue}
            previousValue={regionYoYData.previousValue}
            unit="Units"
            label="Sales Performance YoY"
            category="Quarterly Sales"
            period={regionYoYData.period}
            animated={true}
          />
          <WarehouseInventoryCard
            inventoryValue={regionInventoryInfo.currentValue}
            previousValue={regionInventoryInfo.previousValue}
            yoyChangeRupees={regionInventoryInfo.yoyChangeRupees}
            yoyChangePercent={regionInventoryInfo.yoyChangePercent}
            region={regionName}
            warehouseName={regionName}
            period="vs last Month (YoY)"
            animated={true}
          />
        </div>
        <div className="col-span-15">
          <StockChangeTable />
        </div>
      </div>
    </>
  );
}

