import type { Metadata } from "next";
import React from "react";
import SalesForecastChart from "@/components/ecommerce/SalesForecastKPI";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export const metadata: Metadata = {
  title:
    "Bid Easy Analytics",
  description: "Bid Easy Analytics",
};

export default function Ecommerce() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">

      <div className="col-span-12">
        <PageBreadcrumb pageTitle="Sales Forecast" />
        <SalesForecastChart />
      </div>
    
  
    </div>
  );
}
