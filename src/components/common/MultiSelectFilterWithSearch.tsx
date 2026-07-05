import React, { useState, useEffect, useRef, useCallback } from "react";
import debounce from "lodash.debounce";
import { VariableSizeList as List } from "react-window";

interface Option {
  id: string;
  label: string;
}

interface Props {
  options: Option[];
  onSubmit: (selected: Option[]) => void;
  disabled?: boolean; // Add disabled prop
}

const ITEM_HEIGHT = 36;

const getTextWidth = (text: string, font: string): number => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return 0;
  context.font = font;
  return context.measureText(text).width;
};

export const MultiSelectFilterWithSearch: React.FC<Props> = ({
  options,
  onSubmit,
  disabled = false, // Default to false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtered, setFiltered] = useState<Option[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [calculatedWidth, setCalculatedWidth] = useState<number>(200);

  const listRef = useRef<List>(null);

  const SELECT_ALL_ID = "__select_all__";

  const getFilteredOptionsWithSelectAll = (filteredOptions: Option[]): Option[] => {
    return [
      { id: SELECT_ALL_ID, label: "Select All" },
      ...filteredOptions,
    ];
  };

  const doFilter = useCallback(
    debounce((term: string) => {
      const t = term.toLowerCase().trim();
      const result = options.filter((o) => o.label.toLowerCase().includes(t));
      setFiltered(getFilteredOptionsWithSelectAll(result));
    }, 200),
    [options]
  );

  // Measure max width based on option labels
  useEffect(() => {
    const font = "16px sans-serif";
    const maxLabelWidth = Math.max(...options.map(o => getTextWidth(o.label, font)));
    const padding = 80;
    setCalculatedWidth(Math.ceil(maxLabelWidth + padding));
  }, [options]);

  useEffect(() => {
    doFilter(searchTerm);
    return () => doFilter.cancel();
  }, [searchTerm, doFilter]);

  // Keyboard nav - disabled when component is disabled
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return; // Prevent keyboard navigation when disabled
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[highlightedIndex];
      if (o) toggleSelect(o.id);
    }
  };

  const toggleSelect = (id: string) => {
    if (disabled) return; // Prevent selection when disabled

    if (id === SELECT_ALL_ID) {
      const allVisibleIds = filtered
        .filter((o) => o.id !== SELECT_ALL_ID)
        .map((o) => o.id);
      const allSelected = allVisibleIds.every((id) => selectedIds.has(id));

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          allVisibleIds.forEach((id) => next.delete(id));
        } else {
          allVisibleIds.forEach((id) => next.add(id));
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  };

  useEffect(() => {
    listRef.current?.scrollToItem(highlightedIndex);
  }, [highlightedIndex]);

  const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const opt = filtered[index];
    const isSelectAll = opt.id === SELECT_ALL_ID;
    const visibleIds = filtered.filter((o) => o.id !== SELECT_ALL_ID).map((o) => o.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    const isSel = isSelectAll ? allSelected : selectedIds.has(opt.id);
    const isHigh = index === highlightedIndex;

    return (
      <li
        key={opt.id}
        role="option"
        aria-selected={isHigh}
        tabIndex={-1}
        style={style}
        className={`
          flex items-center gap-3 
          ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          rounded-sm px-5 py-3
          transition-all duration-250 ease-in-out
          ${
            isHigh && !disabled
              ? "bg-gradient-to-r from-blue-100 to-blue-50 shadow-lg scale-[1.06] text-blue-900 "
              : isSel
              ? "bg-blue-100 text-blue-800 font-medium"
              : "text-gray-700 hover:bg-gray-100"
          }
          ${disabled ? 'hover:bg-transparent' : ''}
        `}
        onMouseEnter={() => !disabled && setHighlightedIndex(index)}
        onMouseDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          toggleSelect(opt.id);
        }}
      >
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
            isHigh || isSel ? "text-blue-500" : "text-gray-400"
          }`}
          fill={isSel ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {isSel ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          ) : (
            <rect x="4" y="4" width="16" height="16" rx="3" ry="3" />
          )}
        </svg>
        <span className="truncate">{opt.label}</span>
      </li>
    );
  };

  const getItemSize = () => ITEM_HEIGHT;

  const handleSubmit = () => {
    if (disabled) return; // Prevent submission when disabled
    const selected = options.filter((o) => selectedIds.has(o.id));
    onSubmit(selected);
  };

  return (
    <div style={{ width: calculatedWidth }}>
      <input
        type="text"
        disabled={disabled} // Disable input
        className={`
          w-full
          rounded-lg
          bg-gray-200
          px-4 py-2
          text-gray-900 text-base
          placeholder-gray-400
          focus:outline-1
          focus:outline-blue-200
          focus:outline-dashed
          transition
          duration-200
          ease-in-out
          backdrop-blur-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        placeholder={disabled ? "Response sent" : "Search ..."}
        value={searchTerm}
        onChange={(e) => !disabled && setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-controls="multi-select-listbox"
        aria-activedescendant={filtered[highlightedIndex]?.id || undefined}
      />
      <div className="rounded mt-4 overflow-auto" style={{ maxHeight: 6 * ITEM_HEIGHT }}>
        <List
          height={Math.min(filtered.length, 6) * ITEM_HEIGHT}
          itemCount={filtered.length}
          itemSize={getItemSize}
          width={calculatedWidth}
          ref={listRef}
        >
          {renderRow}
        </List>
      </div>
      <button
        onClick={handleSubmit}
        disabled={selectedIds.size === 0 || disabled} // Disable button when component is disabled
        className={`
          mt-2
          w-full
          px-5
          py-2.5
          text-white
          rounded-xl
          shadow-sm
          focus:outline-none
          focus:ring-2
          focus:ring-blue-100
          focus:ring-offset-1
          transition
          duration-300
          ease-in-out
          ${disabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : selectedIds.size === 0 
              ? 'bg-gray-400 cursor-not-allowed opacity-100'
              : 'bg-blue-400 hover:bg-blue-200'
          }
        `}
      >
        {disabled ? "Response Sent" : "Send"}
      </button>
    </div>
  );
};
