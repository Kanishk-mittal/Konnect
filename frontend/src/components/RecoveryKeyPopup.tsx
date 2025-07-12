import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

interface RecoveryKeyPopupProps {
  recoveryKey: string;
  isOpen: boolean;
  onClose: () => void;
}

const RecoveryKeyPopup: React.FC<RecoveryKeyPopupProps> = ({ recoveryKey, isOpen, onClose }) => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (keyRef.current) {
      keyRef.current.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (confirmed) {
      onClose();
    } else {
      alert('Please confirm that you have saved the recovery key before continuing.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-[90%] max-w-md p-6 rounded-lg ${theme === 'dark' ? 'bg-[#240046] text-white' : 'bg-[#FFDEA8] text-[#421271]'}`}>
        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-[#FF9E00]' : 'text-[#421271]'}`}>Save Your Recovery Key</h2>
        
        <p className="mb-4">
          <strong>Important:</strong> Please save this recovery key in a secure location. 
          It will be used to recover your account if you lose your password.
        </p>
        
        <div className="mb-4">
          <label htmlFor="recoveryKey" className="block mb-2 font-semibold">Recovery Key:</label>
          <div className="flex">
            <input
              ref={keyRef}
              id="recoveryKey"
              type="text"
              readOnly
              value={recoveryKey}
              className={`w-full p-2 border rounded-l-md ${theme === 'dark' ? 'bg-[#3A0068] border-[#FF9E00] text-white' : 'bg-white border-[#5A189A]'}`}
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-2 rounded-r-md ${theme === 'dark' ? 'bg-[#FF7900] hover:bg-[#E86C00] text-white' : 'bg-[#5A189A] hover:bg-[#4C1184] text-white'}`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={() => setConfirmed(!confirmed)}
              className="mr-2"
            />
            <span>I have saved my recovery key in a secure location</span>
          </label>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={handleClose}
            disabled={!confirmed}
            className={`px-6 py-2 rounded-full transition-colors ${
              confirmed 
                ? (theme === 'dark' ? 'bg-[#FF7900] hover:bg-[#E86C00] text-white' : 'bg-[#5A189A] hover:bg-[#4C1184] text-white')
                : 'bg-gray-400 cursor-not-allowed text-gray-100'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryKeyPopup;
