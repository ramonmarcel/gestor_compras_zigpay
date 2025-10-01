import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps {
    suggestions: string[];
    value: string;
    onChange: (value: string) => void;
    onSelect: (value: string) => void;
    placeholder?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ suggestions, value, onChange, onSelect, placeholder }) => {
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const userInput = e.currentTarget.value;
        onChange(userInput);
        
        const filtered = suggestions.filter(
            suggestion => suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(true);
        setActiveIndex(-1);
    };

    const handleSelect = (suggestion: string) => {
        onSelect(suggestion);
        setShowSuggestions(false);
        setActiveIndex(-1);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions) return;

        switch (e.key) {
            case 'Enter':
            case ' ': // Spacebar
                if (activeIndex !== -1) {
                    e.preventDefault();
                    handleSelect(filteredSuggestions[activeIndex]);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
                break;
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
                break;
            case 'Escape':
                 setShowSuggestions(false);
                 break;
        }
    };


    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
            {showSuggestions && value && filteredSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-slate-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onClick={() => handleSelect(suggestion)}
                            className={`px-4 py-2 cursor-pointer ${index === activeIndex ? 'bg-indigo-100' : 'hover:bg-indigo-50'}`}
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AutocompleteInput;