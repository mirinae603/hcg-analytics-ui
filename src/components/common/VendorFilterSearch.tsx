import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import debounce from "lodash.debounce";
import { VariableSizeList as List } from "react-window";

interface MaterialOption {
  VendorID: string;
  VendorName: string;
}

interface DropdownWithSearchProps {
  optionsFilter: MaterialOption[];
  selectedOption: MaterialOption | null;
  onChange: (selected: MaterialOption) => void;
}

const ITEM_HEIGHT = 36;

const DropdownWithSearchVendor: React.FC<DropdownWithSearchProps> = ({
  optionsFilter = [],
  selectedOption,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<MaterialOption[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<List>(null);

  const formatLabel = (option: MaterialOption) =>
    `${option["VendorID"]}`;

  const handleFilter = useCallback(
    debounce((term: string) => {
      const normalizedTerm = term.toLowerCase().replace(/\s+/g, "");

      const filtered = optionsFilter.filter((option) => {
        const normalizedLabel = formatLabel(option).toLowerCase().replace(/\s+/g, "");
        return normalizedLabel.includes(normalizedTerm);
      });

      setFilteredOptions(filtered);
    }, 200),
    [optionsFilter]
  );

  useEffect(() => {
    handleFilter(searchTerm);
    return () => handleFilter.cancel();
  }, [searchTerm, handleFilter]);

  const selectOption = useCallback(
    (option: MaterialOption) => {
      onChange(option);
      setSearchTerm(""); // Clear search term
      setIsOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev === filteredOptions.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev === 0 ? filteredOptions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredOptions[highlightedIndex];
      if (selected) selectOption(selected);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollToItem(highlightedIndex);
    }
  }, [highlightedIndex, isOpen]);

  const renderRow = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const option = filteredOptions[index];
    const isHighlighted = index === highlightedIndex;
    const isSelected = selectedOption?.VendorID === option.VendorID;

    return (
      <div key={option.VendorID} style={style}>
        <div
          className={`text-sm cursor-pointer w-full
            ${isHighlighted ? "bg-blue-100 dark:bg-gray-700" : isSelected ? "bg-blue-50 dark:bg-gray-800" : ""}
            hover:bg-blue-100 dark:hover:bg-gray-700`}
          style={{
            height: style.height,
            display: "flex",
            alignItems: "center",
            paddingLeft: "12px",
            paddingRight: "12px",
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={formatLabel(option)}
          onMouseEnter={() => setHighlightedIndex(index)}
          onClick={() => selectOption(option)}
        >
          <span
            className="w-full text-gray-800 dark:text-gray-200"
            style={{
              fontWeight: isSelected ? 600 : 400,
            }}
          >
            {formatLabel(option)}
          </span>
        </div>
      </div>
    );
  };

  const getItemSize = (index: number) => {
    const option = filteredOptions[index];
    const text = formatLabel(option);
    const charsPerLine = 40;
    const lineHeight = 20;
    const lineCount = Math.ceil(text.length / charsPerLine);
    return lineCount * lineHeight + 12;
  };
  const measureTextWidth = (text: string, font = "14px Inter, sans-serif") => {
  if (!text) return 0;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return 0;
  context.font = font;
  const width = context.measureText(text).width;
  return isNaN(width) ? 0 : width;
};

const [inputWidth, setInputWidth] = useState<number>(288); // default min width (18rem)

useEffect(() => {
  if (!optionsFilter || optionsFilter.length === 0) return;

  const labels = optionsFilter.map(formatLabel);
  const widths = labels.map((label) => measureTextWidth(label));
  const widest = Math.max(...widths);

  // Check for invalid result
  if (!isFinite(widest) || widest <= 0) {
    setInputWidth(288); // fallback to 18rem
    return;
  }

  const paddingAndIcons = 48; // 12px left + 12px right + icon space
  const maxWidth = Math.min(widest + paddingAndIcons, 600); // cap max width
  setInputWidth(maxWidth);
}, [optionsFilter]);


  return (
   <div
  className="relative inline-block max-w-full"
  ref={containerRef}
  style={{
    whiteSpace: "nowrap",
    width: `${inputWidth}px`,
    minWidth: 288,
  }}
>


      {!isOpen ? (
        <div
  onClick={() => setIsOpen(true)}
  className="group transition-all duration-300 ease-in-out w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 cursor-pointer shadow-sm flex items-center justify-between hover:shadow-md"
>
  <span className="truncate max-w-[90%]">
    {selectedOption
      ? formatLabel(selectedOption)
      : "Search and select..."}
  </span>
  <svg
    className="w-4 h-4 ml-2 text-gray-500 group-hover:translate-y-[1px] transition-transform duration-200"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
</div>

      ) : (
        <input
  ref={inputRef}
  type="text"
  placeholder="Search and select..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  onKeyDown={handleKeyDown}
  autoFocus
  className="transition-all duration-300 w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md placeholder-gray-400 dark:placeholder-gray-500"
/>

      )}

      {isOpen && filteredOptions.length > 0 && (
       <div
  className="absolute z-20 mt-2 w-full transform origin-top animate-dropdownOpen bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
>
  <div style={{ overflowX: "auto", scrollbarWidth: "thin" }}>
    <List
  ref={listRef}
  height={Math.min(6, filteredOptions.length) * ITEM_HEIGHT}
  itemCount={filteredOptions.length}
  itemSize={getItemSize}
  width="100%"
>
  {renderRow}
</List>

  </div>
</div>

      )}
    </div>
  );
};

export default DropdownWithSearchVendor;
