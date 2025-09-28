import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

interface ImageInputProps {
    label: string;
    value: File | null;
    onChange: (file: File | null) => void;
    accept?: string;
    className?: string;
    placeholder?: string;
    required?: boolean;
}

const ImageInput: React.FC<ImageInputProps> = ({
    label,
    value,
    onChange,
    accept = 'image/*',
    className = '',
    placeholder = 'Choose Image',
    required = false
}) => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const [dragOver, setDragOver] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Theme-specific colors
    const inputBgColor = theme === 'dark' ? '#1f2937' : '#ffffff';
    const borderColor = theme === 'dark' ? '#374151' : '#d1d5db';
    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const dropdownBgColor = theme === 'dark' ? '#374151' : '#ffffff';
    const hoverBgColor = theme === 'dark' ? '#4b5563' : '#f3f4f6';

    // Handle file selection
    const handleFileSelect = (file: File | null) => {
        onChange(file);
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
        setShowDropdown(false);
    };

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleFileSelect(file);
            }
        }
    };

    // Handle file input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        handleFileSelect(file);
    };

    // Open file picker
    const openFilePicker = () => {
        fileInputRef.current?.click();
        setShowDropdown(false);
    };

    // Remove current image
    const removeImage = () => {
        handleFileSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Clean up preview URL on unmount
    React.useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className={className}>
            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                {label} {required && '*'}
            </label>

            <div className="space-y-3">
                {/* Preview Section */}
                {(previewUrl || value) && (
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <img
                                src={previewUrl || (value ? URL.createObjectURL(value) : '')}
                                alt="Preview"
                                className="w-20 h-20 object-cover rounded-lg border"
                                style={{ borderColor: borderColor }}
                            />
                        </div>
                        <div className="flex-grow">
                            <p className={`text-sm font-medium ${textColor}`}>
                                {value?.name || 'Selected Image'}
                            </p>
                            <p className={`text-xs opacity-75 ${textColor}`}>
                                {value ? `${Math.round(value.size / 1024)} KB` : ''}
                            </p>
                        </div>
                    </div>
                )}

                {/* Input Section */}
                <div className="relative" ref={dropdownRef}>
                    <div
                        className={`relative border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all ${dragOver ? 'border-purple-500 bg-purple-50' : ''
                            }`}
                        style={{
                            backgroundColor: dragOver ? (theme === 'dark' ? '#1e1b4b' : '#f3f4f6') : inputBgColor,
                            borderColor: dragOver ? '#8b5cf6' : borderColor
                        }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <div className="text-center">
                            <div className={`text-3xl mb-2 ${textColor} opacity-50`}>
                                📷
                            </div>
                            <p className={`text-sm font-medium ${textColor}`}>
                                {value ? value.name : placeholder}
                            </p>
                            <p className={`text-xs opacity-75 ${textColor}`}>
                                Drag and drop or click to select
                            </p>
                        </div>

                        {/* Dropdown Arrow */}
                        <div className="absolute top-3 right-3">
                            <svg
                                className={`w-4 h-4 ${textColor} transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div
                            className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg border z-50"
                            style={{
                                backgroundColor: dropdownBgColor,
                                borderColor: borderColor
                            }}
                        >
                            <div className="py-2">
                                <button
                                    type="button"
                                    onClick={openFilePicker}
                                    className={`w-full px-4 py-3 text-left hover:transition-colors ${textColor}`}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-lg">📁</span>
                                        <div>
                                            <div className="font-medium">Choose from Files</div>
                                            <div className="text-xs opacity-75">Browse your computer</div>
                                        </div>
                                    </div>
                                </button>

                                {value && (
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className={`w-full px-4 py-3 text-left hover:transition-colors ${textColor}`}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="text-lg">🗑️</span>
                                            <div>
                                                <div className="font-medium text-red-500">Remove Image</div>
                                                <div className="text-xs opacity-75">Clear current selection</div>
                                            </div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleInputChange}
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default ImageInput;