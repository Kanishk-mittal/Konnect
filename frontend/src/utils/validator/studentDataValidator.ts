import type { Student } from '../../pages/AddStudent';

/**
 * Returns an array of objects for each student with non-whitelisted characters.
 * Each object: { row: number, invalidColumns: string[] }
 */
// Name: alphabets and space only
const nameRegex = /^[a-zA-Z ]*$/;
// Roll number: alphanumeric, no spaces
const rollNumberRegex = /^[a-zA-Z0-9]*$/;
// Email: only alphanumeric before @, after @ any combination of alphanumeric and dots
const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z0-9.]+$/;

export const filterCharacters = (students: Array<Student>): Array<{ row: number; invalidColumns: string[] }> => {
	const result: Array<{ row: number; invalidColumns: string[] }> = [];
	students.forEach((student, idx) => {
		const invalidColumns: string[] = [];
		if (!nameRegex.test(student.name)) invalidColumns.push('name');
		if (!rollNumberRegex.test(student.rollNumber)) invalidColumns.push('rollNumber');
		if (!emailRegex.test(student.emailId)) invalidColumns.push('emailId');
		if (invalidColumns.length > 0) {
			result.push({ row: idx, invalidColumns });
		}
	});
	return result;
}

/**
 * Returns an array of objects for each student with missing values.
 * Each object: { row: number, emptyColumns: string[] }
 */
export const checkEmptyValues = (students: Array<Student>): Array<{ row: number; emptyColumns: string[] }> => {
	const result: Array<{ row: number; emptyColumns: string[] }> = [];
	students.forEach((student, idx) => {
		const emptyColumns: string[] = [];
		if (!student.name.trim()) emptyColumns.push('name');
		if (!student.rollNumber.trim()) emptyColumns.push('rollNumber');
		if (!student.emailId.trim()) emptyColumns.push('emailId');
		if (emptyColumns.length > 0) {
			result.push({ row: idx, emptyColumns });
		}
	});
	return result;
}