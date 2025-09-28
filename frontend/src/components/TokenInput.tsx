import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

interface TokenInputProps {
    label: string;
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

const TokenInput: React.FC<TokenInputProps> = ({
    label,
    values,
    onChange,
    placeholder = "Enter value and press Enter",
    required = false,
    className = ""
}) => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const [inputValue, setInputValue] = useState('');

    // Theme-specific colors
    const inputBgColor = theme === 'dark' ? '#1f2937' : '#ffffff';
    const borderColor = theme === 'dark' ? '#374151' : '#d1d5db';
    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const tokenBgColor = theme === 'dark' ? '#4f46e5' : '#6366f1';
    const tokenHoverBgColor = theme === 'dark' ? '#4338ca' : '#5b21b6';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addToken();
        }
    };

    const addToken = () => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue && !values.includes(trimmedValue)) {
            onChange([...values, trimmedValue]);
            setInputValue('');
        }
    };

    const removeToken = (indexToRemove: number) => {
        onChange(values.filter((_, index) => index !== indexToRemove));
    };

    const handleAddButtonClick = () => {
        addToken();
    };

    return (
        <div className={className}>
            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                {label} {required && '*'}
            </label>

            {/* Input Section */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder={placeholder}
                        className={`flex-grow px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                        style={{
                            backgroundColor: inputBgColor,
                            borderColor: borderColor
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleAddButtonClick}
                        disabled={!inputValue.trim()}
                        className={`px-6 py-3 rounded-lg font-medium text-white transition-all ${inputValue.trim()
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Add
                    </button>
                </div>

                {/* Tokens Display */}
                {values.length > 0 && (
                    <div className="space-y-2">
                        <p className={`text-sm font-medium ${textColor}`}>
                            Added ({values.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {values.map((value, index) => (
                                <div
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-white text-sm font-medium transition-colors"
                                    style={{ backgroundColor: tokenBgColor }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = tokenHoverBgColor}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = tokenBgColor}
                                >
                                    <span>{value}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeToken(index)}
                                        className="ml-2 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition-colors"
                                        title={`Remove ${value}`}
                                    >
                                        <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Helper Text */}
                <p className={`text-xs opacity-75 ${textColor}`}>
                    {values.length === 0
                        ? `Enter ${label.toLowerCase()} one at a time and press Enter or click Add`
                        : `${values.length} ${label.toLowerCase()} added. Continue adding or remove by clicking the ✕ button.`
                    }
                </p>
            </div>
        </div>
    );
};

export default TokenInput;