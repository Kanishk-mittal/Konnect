import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";
import CsvUploader from "../components/CsvUploader";
import ManualEntryTable from "../components/ManualEntryTable";
// Unified Student type for all components
export type Student = { name: string; rollNumber: string; emailId: string };

const AddStudent = () => {
  // Navigation and theme
  const navigate = useNavigate();
  const theme = useSelector((state: RootState) => state.theme.theme);

  // Table columns for student entry
  const tableColumns: { key: keyof Student; label: string; type?: 'text' | 'email' | 'number' }[] = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'rollNumber', label: 'Roll Number', type: 'text' },
    { key: 'emailId', label: 'Email ID', type: 'email' }
  ];

  // Student data state
  const [students, setStudents] = useState<Student[]>([]);

  // Submit handler: display students in console
  const handleSubmit = () => {
    // TODO: Connect to backend API here
    
  };

  // Define theme-specific colors (match AdminDashboard)
  const backgroundGradient = theme === 'dark' 
    ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
    : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

  const textColor = theme === 'dark' ? 'text-white' : 'text-black';

  const headerBackground = theme === 'dark' 
    ? {} 
    : { background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' };

  // Check admin authentication
  // TODO: Add authentication logic if needed

  return (
    <div className="flex flex-col" style={{ background: backgroundGradient }}>
      {/* Header */}
      <div style={headerBackground}>
        <Header editProfileUrl="/admin/edit-profile" />
      </div>
      {/* Main Content */}
      <div className="flex-grow flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold ${textColor}`}>Add New Student</h1>
          <button 
            className="px-4 py-2 flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            onClick={() => navigate('/admin/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
        <div className="max-w-2xl mx-auto">
          {/* CSV Uploader */}
          <CsvUploader 
            columns={tableColumns.map(col => col.label)}
            setStudents={setStudents}
            message="Upload a CSV file with columns: 'Name', 'Roll Number', 'Email ID' (column headers must match exactly)"
            theme={theme as 'light' | 'dark'}
          />
          {/* Manual Entry Table */}
          <div className="mt-8">
            <ManualEntryTable 
              theme={theme as 'light' | 'dark'}
              columns={tableColumns}
              students={students}
              setStudents={setStudents}
            />
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddStudent
