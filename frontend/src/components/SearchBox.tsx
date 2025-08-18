import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

interface SearchBoxProps {
  searchText: string;
  setSearchText: (text: string) => void;
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ searchText, setSearchText, placeholder = "Search..." }) => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  
  // Define theme-specific styles
  const backgroundColor = 'rgba(242, 237, 230, 0.4)'; // F2EDE6 with 0.4 alpha
  const borderColor = theme === 'light' ? '#FF9E00' : 'transparent';
  const borderWidth = theme === 'light' ? '2px' : '0px';
  const textColor = theme === 'light' ? '#000000' : '#FFFFFF';
  
  return (
    <div className="w-full">
      <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-full outline-none focus:outline-none transition-all duration-200"
        style={{
          backgroundColor: backgroundColor,
          border: `${borderWidth} solid ${borderColor}`,
          color: textColor,
        }}
      />
    </div>
  );
};

export default SearchBox;
