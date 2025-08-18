import React, { useRef, useState } from 'react';
import type { Student } from '../pages/AddStudent';

interface CsvUploaderProps {
  columns: string[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  message?: string;
  theme?: 'light' | 'dark';
}

const CsvUploader: React.FC<CsvUploaderProps> = ({ 
  columns, setStudents, message = "Upload student data via CSV file", theme = 'light'
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Define theme-based colors matching admin dashboard
  const dropzoneColor = theme === 'dark' ? '#1f2937' : '#FFC362';
  const textColor = theme === 'dark' ? 'text-white' : 'text-black';
  const borderColor = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  const hoverBorderColor = theme === 'dark' ? 'border-gray-500' : 'border-gray-400';
  const iconBgColor = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200';
  const iconColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-500';

  // Handle CSV submission
  const handleCsvSubmit = async () => {
    if (files.length === 0) {
      alert('Please select at least one CSV file');
      return;
    }
    try {
      // Import CSV parser and column validator
      const { csvToJson } = await import('../utils/csvParser');
      const { checkColumns } = await import('../utils/validator/csvValidator');
  let allStudents: Student[] = [];
      for (const file of files) {
        // Validate columns before parsing
        const columnCheck = await checkColumns(file, columns);
        if (!columnCheck.isValid) {
          alert(`Missing required columns: ${columnCheck.missingColumns.join(', ')}`);
          return;
        }
        const students = await csvToJson(file);
        // Convert nulls to empty strings for type compatibility
        const cleaned = students.map(row => {
          return {
            name: row['Name'] ?? '',
            rollNumber: row['Roll Number'] ?? '',
            emailId: row['Email ID'] ?? ''
          };
        });
        allStudents = allStudents.concat(cleaned);
      }
      // Update parent state with parsed students
      setStudents(allStudents);
      setFiles([]);
    } catch (error) {
      console.error('Error processing CSV files:', error);
      alert('Error processing CSV files. Please check the console for details.');
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const csvFiles = droppedFiles.filter(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFiles.length > 0) {
      setFiles(csvFiles);
      console.log('CSV files selected via drag and drop:', csvFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      })));
    } else {
      console.warn('Only CSV files are accepted');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const csvFiles = selectedFiles.filter(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFiles.length > 0) {
      setFiles(csvFiles);
      console.log('CSV files selected via click:', csvFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      })));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative w-full p-8 border-8 border-dashed rounded-lg
          transition-all duration-300 ease-in-out
          ${isDragOver 
            ? 'border-blue-500 border-solid' 
            : `${borderColor} hover:${hoverBorderColor}`
          }
        `}
        style={{ 
          backgroundColor: isDragOver 
            ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff')
            : dropzoneColor
        }}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Upload Icon */}
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${isDragOver ? 'bg-blue-100' : iconBgColor}
            transition-colors duration-300
          `}>
            <svg 
              className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : iconColor}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          
          {/* Text Content */}
          <div className="text-center">
            <p className={`text-lg font-medium ${isDragOver ? 'text-blue-600' : textColor}`}>
              {isDragOver ? 'Drop CSV files here' : 'Drag and drop CSV files here'}
            </p>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              or
            </p>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {message}
            </p>
          </div>
          
          {/* Upload Button */}
          <button
            onClick={handleClick}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all duration-300
              ${isDragOver 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            `}
          >
            Click to upload
          </button>
          
          {/* File type info */}
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            Only CSV files are accepted
          </p>
        </div>
      </div>
      
      {/* Selected files display */}
      {files.length > 0 && (
        <div className={`mt-4 p-4 rounded-lg border ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-600' 
            : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Selected Files ({files.length}):
          </h4>
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li key={index} className={`text-sm flex items-center space-x-2 justify-between ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{file.name}</span>
                  <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button 
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          
          {/* Submit Button */}
          {files.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleCsvSubmit}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Process CSV Files
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CsvUploader;
