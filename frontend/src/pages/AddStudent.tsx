import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";
import CsvUploader from "../components/CsvUploader";
import ManualEntryTable from "../components/ManualEntryTable";
import { checkEmptyValues, filterCharacters } from '../utils/validator/studentDataValidator';
import { postData, getData } from '../api/requests';
import { encryptAES, generateAESKey } from '../encryption/AES_utils';
import { encryptRSA } from '../encryption/RSA_utils';

// Unified Student type for all components
export type Student = { name: string; rollNumber: string; emailId: string };
export type WrongValue = { row: number; invalidColumns?: string[]; emptyColumns?: string[] };

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
  const [wrongValues, setWrongValues] = useState<WrongValue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Submit handler: display students in console
  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const emptyErrors = checkEmptyValues(students);
    const charErrors = filterCharacters(students);

    const allErrors: WrongValue[] = [];

    emptyErrors.forEach(err => {
      const existing = allErrors.find(e => e.row === err.row);
      if (existing) {
        existing.emptyColumns = err.emptyColumns;
      } else {
        allErrors.push(err);
      }
    });

    charErrors.forEach(err => {
      const existing = allErrors.find(e => e.row === err.row);
      if (existing) {
        existing.invalidColumns = err.invalidColumns;
      } else {
        allErrors.push(err);
      }
    });

    setWrongValues(allErrors);

    if (allErrors.length > 0) {
      alert('Please fix the errors before submitting.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Map frontend student data to backend format
      const studentsForBackend = students.map(s => ({
        name: s.name,
        roll: s.rollNumber,
        email: s.emailId,
      }));

      // 2. Get server's public key for encryption
      const publicKeyResponse = await getData('/encryption/rsa/publicKey', {});
      if (!publicKeyResponse || !publicKeyResponse.status) {
        throw new Error('Failed to get encryption key from server');
      }
      const { publicKey, keyId } = publicKeyResponse;

      // 3. Encrypt the data payload
      const aesKey = generateAESKey();
      const encryptedStudents = encryptAES(JSON.stringify({ students: studentsForBackend }), aesKey);

      // 4. Encrypt the AES key with the server's public key
      const encryptedKey = encryptRSA(aesKey, publicKey);

      // 5. Prepare the final payload
      const payload = {
        key: encryptedKey,
        keyId: keyId,
        data: encryptedStudents,
      };

      // 6. Send the encrypted data to the backend
      const response = await postData('/student/addMultiple', payload);

      if (response && response.status === true) {
        setSuccessMessage(response.message || 'Students registered successfully!');
        setStudents([]); // Clear the table on success
        setWrongValues([]);
      } else {
        setErrorMessage(response?.message || 'An error occurred.');
      }
    } catch (error: any) {
      console.error('Error during student registration:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'An unexpected error occurred.';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
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
        {/* Message Display */}
        {(errorMessage || successMessage) && (
          <div className={`p-4 rounded-lg text-center font-medium mb-4 ${
            errorMessage 
              ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300')
              : (theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300')
          }`}>
            {errorMessage || successMessage}
          </div>
        )}
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
              wrongValues={wrongValues}
              setWrongValues={setWrongValues}
            />
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400"
              >
                {isLoading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddStudent
