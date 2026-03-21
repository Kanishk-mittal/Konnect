import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const LoadingOverlay: React.FC = () => {
  const { isLoading } = useSelector((state: RootState) => state.loading);
  const theme = useSelector((state: RootState) => state.theme.theme);

  if (!isLoading) return null;

  const spinnerColor = theme === 'dark' ? 'border-[#FF7900]' : 'border-[#5A189A]';
  const overlayBg = theme === 'dark' ? 'bg-black/70' : 'bg-white/70';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlayBg} transition-opacity duration-300`}>
      <div className="flex flex-col items-center gap-4">
        {/* Modern Spinner */}
        <div className={`w-16 h-16 border-4 ${spinnerColor} border-t-transparent rounded-full animate-spin`}></div>
        <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Loading...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
