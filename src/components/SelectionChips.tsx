import React from 'react';
import { hapticFeedback } from '../utils/haptics';

interface SelectionChipsProps<T> {
  options: { label: string; value: T; icon?: React.ReactNode }[];
  selectedValue: T;
  onChange: (value: T) => void;
  label?: string;
}

export function SelectionChips<T extends string | number>({ 
  options, 
  selectedValue, 
  onChange,
  label 
}: SelectionChipsProps<T>) {
  
  const handleSelect = (value: T) => {
    hapticFeedback('light');
    onChange(value);
  };

  return (
    <div className="selection-chips-container">
      {label && <label className="selection-label">{label}</label>}
      <div className="chips-grid">
        {options.map((option) => (
          <button
            key={String(option.value)}
            className={`chip-button ${selectedValue === option.value ? 'active' : ''}`}
            onClick={() => handleSelect(option.value)}
          >
            {option.icon && <span className="chip-icon">{option.icon}</span>}
            <span className="chip-text">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
