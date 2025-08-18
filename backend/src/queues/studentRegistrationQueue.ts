import Bull from 'bull';
import { StudentService, StudentData } from '../services/studentService';

// Create a queue for student registration
export const studentRegistrationQueue = new Bull('student registration', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});

// Define job data interface
interface RegistrationJobData {
    students: StudentData[];
    adminId: string;
    batchId: string;
}

// Process jobs
studentRegistrationQueue.process('bulk-register', async (job) => {
    const { students, adminId, batchId } = job.data as RegistrationJobData;
    
    // Update progress
    job.progress(10);
    
    try {
        const result = await StudentService.bulkRegisterStudents(students, adminId);
        
        job.progress(100);
        return result;
        
    } catch (error) {
        throw new Error(`Registration failed for batch ${batchId}: ${error}`);
    }
});

// Queue management functions
export const queueStudentRegistration = async (
    students: StudentData[],
    adminId: string
): Promise<string> => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = await studentRegistrationQueue.add('bulk-register', {
        students,
        adminId,
        batchId
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    });
    
    return job.id as string;
};

// Get job status
export const getRegistrationStatus = async (jobId: string) => {
    const job = await studentRegistrationQueue.getJob(jobId);
    
    if (!job) {
        return { status: 'not_found' };
    }
    
    return {
        status: await job.getState(),
        progress: job.progress(),
        result: job.returnvalue,
        error: job.failedReason
    };
};
