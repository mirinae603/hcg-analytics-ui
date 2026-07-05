// components/common/FilterTabSwitcher.tsx

import React from "react";

interface FilterTabProps {
  selected: "material" | "group";
  onChange: (val: FilterTabProps["selected"]) => void;
}

const FilterTabSwitcher: React.FC<FilterTabProps> = ({ selected, onChange }) => {
  const getButtonClass = (option: FilterTabProps["selected"]) =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => onChange("material")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("material")}`}
      >
        Material
      </button>
      <button
        onClick={() => onChange("group")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("group")}`}
      >
        Group
      </button>
    </div>
  );
};

export default FilterTabSwitcher;
