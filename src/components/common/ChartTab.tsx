import React, { useState } from "react";

interface ChartTabProps {
  selected: "optionOne" | "optionTwo" ;
  onChange: (val: ChartTabProps["selected"]) => void;
}

const ChartTab: React.FC<ChartTabProps> = ({ selected, onChange }) => {
  const getButtonClass = (option: ChartTabProps["selected"]) =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => onChange("optionOne")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionOne")}`}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("optionTwo")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionTwo")}`}
      >
        Weekly
      </button>
    </div>
  );
};



export default ChartTab;
