import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
// Import eye icons for password visibility toggle
import openEyeIcon from '../assets/open_eye.png';
import closeEyeIcon from '../assets/colse_eye.png';

// Define the props interface
export interface InputProps {
    width: number;
    state: Record<string, any>;
    keyName: string;
    label: string;
    type?: string;
    setState?: React.Dispatch<React.SetStateAction<any>>;
}

// Define the component with proper exports
const InputComponent: React.FC<InputProps> = ({ width, state, setState, keyName, label, type = "text" }) => {
    // Get the current theme
    const theme = useSelector((state: RootState) => state.theme.theme);
    const [showPassword, setShowPassword] = useState(false);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        if (setState) {
            setState((prevState: any) => ({
                ...prevState,
                [keyName]: value
            }));
        } else {
            // Fallback for direct mutation if setState is not provided
            state[keyName] = value;
        }
    };
    
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Determine the actual input type
    const inputType = type === 'password' && showPassword ? 'text' : type;
    
    // Only show the eye icon for password inputs
    const isPasswordInput = type === 'password';

    return (
        <div className={`flex flex-col gap-2 w-[${width}%]`}>
            <label htmlFor={keyName} className={`${theme === 'dark' ? 'text-white' : 'text-black'} font-bold`}>
                {label}
            </label>
            <div className="relative">
                <input
                    type={inputType}
                    id={keyName}
                    name={keyName}
                    value={state[keyName] || ""}
                    onChange={handleChange}
                    className={`p-2 rounded-lg h-10 w-full px-4 ${
                        isPasswordInput ? 'pr-12' : ''
                    } ${theme === 'dark' 
                        ? 'bg-[#D9D9D9]/40 text-white border-0' 
                        : 'bg-[#D9D9D9]/40 text-black border-2 border-black'}`}
                />
                
                {isPasswordInput && (
                    <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                        onClick={togglePasswordVisibility}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        <img 
                            src={showPassword ? closeEyeIcon : openEyeIcon} 
                            alt={showPassword ? "Hide password" : "Show password"}
                            className="w-6 h-6 opacity-70 hover:opacity-100"
                        />
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputComponent;
