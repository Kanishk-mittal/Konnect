import React from 'react';
import type { Student } from '../pages/AddStudent';

interface TableColumn {
  key: keyof Student;
  label: string;
  type?: 'text' | 'email' | 'number';
}

interface ManualEntryTableProps {
  theme?: 'light' | 'dark';
  columns: TableColumn[];
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const ManualEntryTable = ({ 
  theme = 'light', columns, students, setStudents
}: ManualEntryTableProps) => {
  // Create initial row with empty values for all columns
  // Create initial row with empty values for all columns
  const createEmptyRow = (): import('../pages/AddStudent').Student => ({
    name: '',
    rollNumber: '',
    emailId: ''
  });

  // Define theme-based colors matching admin dashboard
  const textColor = theme === 'dark' ? 'text-white' : 'text-black';

  // Handle manual table submission
  // No submit function needed; parent handles submission

  // Helper functions for manual table
  // Add a new empty row
  const addRow = () => {
    setStudents([...students, createEmptyRow()]);
  };

  const removeRow = (index: number) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index));
    } else {
      alert('At least one row must remain');
    }
  };

  const updateCell = (rowIndex: number, columnKey: string, value: string) => {
    const updatedData = [...students];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [columnKey]: value };
    setStudents(updatedData);
  };

  const clearAllRows = () => {
  // Clear all rows
  setStudents([createEmptyRow()]);
  };

  // Always show at least one empty row
  const displayRows = students.length > 0 ? students : [createEmptyRow()];

  return (
    <div className="w-full">
      <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>
        Add Students Manually
      </h3>
      
      <div className="overflow-x-auto">
        <table className={`min-w-full border-collapse border-4 rounded-lg overflow-hidden ${
          theme === 'dark' ? 'border-gray-600' : 'border-amber-600'
        }`} style={{ 
          backgroundColor: theme === 'dark' ? '#1f2937' : '#FFC362'
        }}>
          <thead>
            <tr style={{ 
              backgroundColor: theme === 'dark' ? '#374151' : '#FFB830'
            }}>
              <th className={`border-2 px-4 py-2 text-center font-medium ${
                theme === 'dark' 
                  ? 'border-gray-600 text-gray-100' 
                  : 'border-amber-600 text-gray-800'
              }`}>
                S.No
              </th>
              {columns.map((column) => (
                <th key={column.key} className={`border-2 px-4 py-2 text-left font-medium ${
                  theme === 'dark' 
                    ? 'border-gray-600 text-gray-100' 
                    : 'border-amber-600 text-gray-800'
                }`}>
                  {column.label}
                </th>
              ))}
              <th className={`border-2 px-4 py-2 text-center font-medium ${
                theme === 'dark' 
                  ? 'border-gray-600 text-gray-100' 
                  : 'border-amber-600 text-gray-800'
              }`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className={`border-2 px-2 py-1 text-center ${
                  theme === 'dark' ? 'border-gray-600' : 'border-amber-600'
                }`}>
                  <span className={`font-medium ${
                    theme === 'dark' 
                      ? 'text-gray-300' 
                      : 'text-gray-700'
                  }`}>
                    {rowIndex + 1}
                  </span>
                </td>
                {columns.map((column) => (
                  <td key={column.key} className={`border-2 px-2 py-1 ${
                    theme === 'dark' ? 'border-gray-600' : 'border-amber-600'
                  }`}>
                    <input 
                      type={column.type || 'text'} 
                      value={row[column.key] || ''}
                      onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
                      className={`w-full px-2 py-1 border-none outline-none bg-transparent ${
                        theme === 'dark' 
                          ? 'text-gray-200' 
                          : 'text-gray-800'
                      }`}
                    />
                  </td>
                ))}
                <td className={`border-2 px-2 py-1 text-center ${
                  theme === 'dark' ? 'border-gray-600' : 'border-amber-600'
                }`}>
                  <button 
                    onClick={() => removeRow(rowIndex)}
                    className="text-red-500 hover:text-red-700 p-1"
                    disabled={displayRows.length === 1}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Table Action Buttons */}
      <div className="flex gap-3 mt-4 flex-wrap">
        <button 
          onClick={addRow}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Row
        </button>
  {/* Removed manual submit button; parent handles submission */}
        <button 
          onClick={clearAllRows}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear All
        </button>
      </div>
      
      {/* Table Status */}
      <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        Total rows: {students.length} | 
        Filled rows: {students.filter(row => columns.some(col => row[col.key]?.trim())).length}
      </div>
    </div>
  );
};

export default ManualEntryTable;
