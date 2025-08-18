// CSV Parser utility - cleared for refactoring

/**
 * Check if all required columns are present in the CSV file
 * @param file - CSV file to check
 * @param requiredColumns - Array of required column names to check for
 * @returns Promise with validation result and missing columns
 */
export const checkColumns = async (
    file: File,
    requiredColumns: string[]
): Promise<{ isValid: boolean; missingColumns: string[]; availableColumns: string[] }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const csvText = e.target?.result as string;
                const lines = csvText.trim().split('\n');

                if (lines.length === 0) {
                    resolve({
                        isValid: false,
                        missingColumns: requiredColumns,
                        availableColumns: []
                    });
                    return;
                }

                // Parse header row (first line)
                const availableColumns = lines[0]
                    .split(',')
                    .map(header => header.trim().replace(/"/g, ''));

                const normalizedAvailable = availableColumns.map(col => col.trim().toLowerCase());
                const normalizedRequired = requiredColumns.map(col => col.trim().toLowerCase());

                const missingColumns = normalizedRequired.filter(
                    requiredCol => !normalizedAvailable.includes(requiredCol)
                );

                // Map back to original casing for missing columns
                const originalCaseMissing = missingColumns.map(missingCol => {
                    const index = normalizedRequired.indexOf(missingCol);
                    return requiredColumns[index];
                });

                resolve({
                    isValid: missingColumns.length === 0,
                    missingColumns: originalCaseMissing,
                    availableColumns
                });

            } catch (error) {
                resolve({
                    isValid: false,
                    missingColumns: requiredColumns,
                    availableColumns: []
                });
            }
        };

        reader.onerror = () => {
            resolve({
                isValid: false,
                missingColumns: requiredColumns,
                availableColumns: []
            });
        };

        reader.readAsText(file);
    });
};
