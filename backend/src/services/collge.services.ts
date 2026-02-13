import CollegeModel from '../models/college.model';



/**
 * Adds a new college with the given code and name
 */
export const addNewCollege = async (collegeCode: string, collegeName: string): Promise<{ success: boolean; message?: string; college?: any }> => {
	try {
		const college = new CollegeModel({ college_code: collegeCode, college_name: collegeName });
		await college.save();
		return { success: true, college };
	} catch (error: any) {
		return { success: false, message: error.message || 'Failed to add college.' };
	}
};

/**
 * Returns true if college with given code does NOT exist, else false
 */
export const isCollegeCodeAvailable = async (collegeCode: string): Promise<boolean> => {
	const college = await CollegeModel.findOne({ college_code: collegeCode });
	return !college;
};
