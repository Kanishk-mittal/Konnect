import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

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

    return (
        <div className={`flex flex-col gap-2 w-[${width}%]`}>
            <label htmlFor={keyName} className={`${theme === 'dark' ? 'text-white' : 'text-black'} font-bold`}>
                {label}
            </label>
            <input
                type={type}
                id={keyName}
                name={keyName}
                value={state[keyName] || ""}
                onChange={handleChange}
                className={`p-2 rounded-lg h-10 px-4 ${theme === 'dark' 
                    ? 'bg-[#D9D9D9]/40 text-white border-0' 
                    : 'bg-[#D9D9D9]/40 text-black border-2 border-black'}`}
            />
        </div>
    );
};

export default InputComponent;
