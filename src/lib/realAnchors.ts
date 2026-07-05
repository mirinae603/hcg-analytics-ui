// AUTO-DERIVED from the real HCG SAP data (fact_consumption / fact_inventory /
// dim_plant / kpi_vendor_lead_time / stock_replenishment_and_aging_risk). These are
// the real anchors the simulated KPIs are grounded on — real dimension lists, real
// totals and the real monthly demand series. Only the genuinely-missing metric
// (billing flag, returns, patient-type, SLA target, selling price) is modelled on top.
// Regenerate when the ETL changes. Window: Dec 2025 → May 2026.

export const REAL = {
  totalConsumptionCost: 671016030,   // ₹ cost of internal goods-issue, 6 mo
  totalMrpConsumption: 1876111197,    // ₹ MRP-valued consumption (revenue proxy)
  totalInventoryCost: 604679341,     // ₹ current stock value (cost)
  skusTotal: 24931, skusConsumed: 11225, skusNeedReplen: 14989, skusZeroStock: 15878,
  months: [
    {"m": "Dec", "cost": 109103525, "qty": 3677597},
    {"m": "Jan", "cost": 124646122, "qty": 4054301},
    {"m": "Feb", "cost": 110351112, "qty": 3319184},
    {"m": "Mar", "cost": 135155900, "qty": 4218128},
    {"m": "Apr", "cost": 113026650, "qty": 4089294},
    {"m": "May", "cost": 78732721, "qty": 3198352},
  ],
  plants: [
    {"name": "HCG MEDISURGE HOSPITALS SOLA", "revenue": 539779148, "units": 1622392},
    {"name": "HCG ONCOLOGY HOSPITALS LLP", "revenue": 352962735, "units": 846926},
    {"name": "HCG-KHUBCHANDANI", "revenue": 236606194, "units": 307219},
    {"name": "HCG Hospital Jaipur", "revenue": 143477015, "units": 406504},
    {"name": "HCG KR, Bangalore", "revenue": 123181054, "units": 3122182},
    {"name": "HCG MANAVATA - UNIT2", "revenue": 66445513, "units": 1221174},
    {"name": "HCG NCHRI Oncology LLP, Nagpur", "revenue": 50989589, "units": 1289681},
    {"name": "HCG Oncology LLP, Baroda", "revenue": 48744129, "units": 917258},
    {"name": "HMS Multispecility Hospital", "revenue": 46862933, "units": 2066397},
    {"name": "Suchirayu Health Care Solutions", "revenue": 32939622, "units": 1057596},
  ],
  catConsumption: [
    {"cat": "Radiology Accessories", "cost": 73523930, "mrp": 1199813669},
    {"cat": "Stationary", "cost": 33737041, "mrp": 89040306},
    {"cat": "Grocery", "cost": 24893402, "mrp": 26421462},
    {"cat": "Endo-Surgery Accessories", "cost": 23212454, "mrp": 24695602},
    {"cat": "Injections", "cost": 21437542, "mrp": 29274269},
    {"cat": "Laboratory Accessories", "cost": 17287520, "mrp": 29128215},
    {"cat": "Housekeeping", "cost": 16990495, "mrp": 21646253},
    {"cat": "Hospital Consumables", "cost": 15702936, "mrp": 28170079},
  ],
  invByCat: [
    {"cat": "Injections", "value": 280756094},
    {"cat": "Endo-Surgery Accessories", "value": 65156578},
    {"cat": "Tablets", "value": 47350327},
    {"cat": "Sutures", "value": 21776523},
    {"cat": "OT Accessories", "value": 21212694},
    {"cat": "Capsules", "value": 13939374},
    {"cat": "Catheters", "value": 11967289},
    {"cat": "Dressing Materials", "value": 11016355},
  ],
  vendors: [
    {"name": "Vardhman Health Speciali", "lead": 4.8, "lines": 128357},
    {"name": "D.Vijay Pharma Pvt Ltd", "lead": 0.0, "lines": 6154},
    {"name": "Vardhman Medisales Pvt L", "lead": 3.3, "lines": 3593},
    {"name": "Varad Enterprises", "lead": 0.2, "lines": 2532},
    {"name": "Shree Surya Pharma Pvt L", "lead": 0.0, "lines": 2096},
    {"name": "J K Medico Pvt Ltd", "lead": 2.0, "lines": 1917},
    {"name": "Neron Jointcare", "lead": 0.1, "lines": 1856},
    {"name": "Dhruvi Healthcare Pvt Lt", "lead": 1.3, "lines": 1246},
    {"name": "Bipi Distributors", "lead": 3.6, "lines": 1081},
    {"name": "Jainam Pharmaceuticals", "lead": 0.1, "lines": 958},
    {"name": "VK Office Needs", "lead": 7.0, "lines": 949},
    {"name": "Kaizen Enterprises", "lead": 11.1, "lines": 906},
  ],
} as const;
