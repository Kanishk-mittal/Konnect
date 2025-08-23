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

      // 3. Check if we need to split into batches (for > 1000 students)
      const BATCH_SIZE = 1000;
      
      if (studentsForBackend.length <= BATCH_SIZE) {
        // Single request for 1000 or fewer students
        const aesKey = generateAESKey();
        const encryptedStudents = encryptAES(JSON.stringify({ students: studentsForBackend }), aesKey);
        const encryptedKey = encryptRSA(aesKey, publicKey);

        const payload = {
          key: encryptedKey,
          keyId: keyId,
          data: encryptedStudents,
        };

        const response = await postData('/student/addMultiple', payload);

        if (response && response.status === true) {
          setSuccessMessage(response.message || 'Students registered successfully!');
          setStudents([]);
          setWrongValues([]);
        } else {
          setErrorMessage(response?.message || 'An error occurred.');
        }
      } else {
        // Multiple parallel requests for > 1000 students
        const batches: typeof studentsForBackend[] = [];
        for (let i = 0; i < studentsForBackend.length; i += BATCH_SIZE) {
          batches.push(studentsForBackend.slice(i, i + BATCH_SIZE));
        }

        // Create all request promises in parallel (don't wait for previous response)
        const requestPromises = batches.map(async (batch, index) => {
          const aesKey = generateAESKey();
          const encryptedStudents = encryptAES(JSON.stringify({ students: batch }), aesKey);
          const encryptedKey = encryptRSA(aesKey, publicKey);

          const payload = {
            key: encryptedKey,
            keyId: keyId,
            data: encryptedStudents,
          };

          try {
            const response = await postData('/student/addMultiple', payload);
            return { 
              batchIndex: index, 
              batchSize: batch.length, 
              success: response?.status === true, 
              message: response?.message,
              insertedCount: response?.insertedCount || 0
            };
          } catch (error: any) {
            return { 
              batchIndex: index, 
              batchSize: batch.length, 
              success: false, 
              error: error?.response?.data?.message || error?.message || 'Request failed'
            };
          }
        });

        // Wait for all requests to complete
        const results = await Promise.allSettled(requestPromises);

        // Process results
        let totalSuccessful = 0;
        let totalFailed = 0;
        let errorMessages: string[] = [];
        let successfulBatches = 0;

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const batchResult = result.value;
            if (batchResult.success) {
              successfulBatches++;
              totalSuccessful += batchResult.insertedCount || batchResult.batchSize;
            } else {
              totalFailed += batchResult.batchSize;
              errorMessages.push(`Batch ${index + 1}: ${batchResult.message || batchResult.error}`);
            }
          } else {
            totalFailed += batches[index].length;
            errorMessages.push(`Batch ${index + 1}: ${result.reason}`);
          }
        });

        // Display results
        if (successfulBatches === batches.length) {
          setSuccessMessage(`All ${batches.length} batches processed successfully! Total students registered: ${totalSuccessful}`);
          setStudents([]);
          setWrongValues([]);
        } else if (successfulBatches > 0) {
          setSuccessMessage(`Partial success: ${successfulBatches}/${batches.length} batches completed. ${totalSuccessful} students registered successfully.`);
          setErrorMessage(`Failed batches: ${errorMessages.join('; ')}`);
        } else {
          setErrorMessage(`All batches failed: ${errorMessages.join('; ')}`);
        }
      }
    } catch (error: any) {
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
