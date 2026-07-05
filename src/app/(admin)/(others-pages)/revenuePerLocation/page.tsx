import type { Metadata } from "next";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import RevenueperStorageLocationChart from "@/components/ecommerce/RevenueperStorageLocation";

export const metadata: Metadata = {
  title:
    "Bid Easy Analytics",
  description: "Bid Easy Analytics",
};

export default function Ecommerce() {
  
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      
      <div className="col-span-12">
        <PageBreadcrumb pageTitle="Revenue per Storage Location"/>
        <RevenueperStorageLocationChart />
      </div>
      
      {/* <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics />

        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      

      <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <RecentOrders />
      </div> */}
    </div>
  );
}
