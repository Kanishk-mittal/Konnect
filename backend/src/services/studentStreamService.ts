import { Readable, Transform, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { StudentService, StudentData } from '../services/studentService';

/**
 * Stream-based processing for large CSV files
 * Memory efficient - processes students in chunks
 */
export class StudentStreamProcessor {
    private batchSize: number;
    private adminId: string;
    
    constructor(adminId: string, batchSize: number = 100) {
        this.adminId = adminId;
        this.batchSize = batchSize;
    }

    /**
     * Transform stream that processes students in batches
     */
    createBatchProcessor(): Transform {
        let batch: StudentData[] = [];
        let processedCount = 0;
        
        return new Transform({
            objectMode: true,
            
            async transform(student: StudentData, encoding, callback) {
                batch.push(student);
                
                if (batch.length >= this.batchSize) {
                    try {
                        const result = await StudentService.bulkRegisterStudents(batch, this.adminId);
                        processedCount += result.studentsRegistered;
                        
                        this.push({
                            batchNumber: Math.ceil(processedCount / this.batchSize),
                            processed: result.studentsRegistered,
                            totalProcessed: processedCount,
                            errors: result.errors
                        });
                        
                        batch = []; // Reset batch
                        callback();
                        
                    } catch (error) {
                        callback(error);
                    }
                } else {
                    callback();
                }
            },
            
            async flush(callback) {
                // Process remaining students in batch
                if (batch.length > 0) {
                    try {
                        const result = await StudentService.bulkRegisterStudents(batch, this.adminId);
                        processedCount += result.studentsRegistered;
                        
                        this.push({
                            batchNumber: Math.ceil(processedCount / this.batchSize),
                            processed: result.studentsRegistered,
                            totalProcessed: processedCount,
                            errors: result.errors,
                            final: true
                        });
                        
                        callback();
                    } catch (error) {
                        callback(error);
                    }
                } else {
                    callback();
                }
            }
        });
    }

    /**
     * Process students from a readable stream
     */
    async processStudentStream(
        studentStream: Readable,
        progressCallback?: (progress: any) => void
    ): Promise<{ totalProcessed: number; errors: string[] }> {
        
        let totalProcessed = 0;
        const allErrors: string[] = [];
        
        const resultStream = new Writable({
            objectMode: true,
            write(result, encoding, callback) {
                totalProcessed = result.totalProcessed;
                allErrors.push(...result.errors);
                
                if (progressCallback) {
                    progressCallback(result);
                }
                
                callback();
            }
        });
        
        await pipeline(
            studentStream,
            this.createBatchProcessor(),
            resultStream
        );
        
        return { totalProcessed, errors: allErrors };
    }
}

/**
 * CSV parsing stream
 */
export function createCSVToStudentStream(): Transform {
    let isFirstLine = true;
    let headers: string[] = [];
    
    return new Transform({
        objectMode: true,
        
        transform(line: string, encoding, callback) {
            if (isFirstLine) {
                headers = line.split(',').map(h => h.trim());
                isFirstLine = false;
                callback();
                return;
            }
            
            const values = line.split(',').map(v => v.trim());
            const student: StudentData = {
                name: values[headers.indexOf('name')] || '',
                roll: values[headers.indexOf('roll')] || '',
                email: values[headers.indexOf('email')] || ''
            };
            
            // Only push valid students
            if (student.name && student.roll && student.email) {
                this.push(student);
            }
            
            callback();
        }
    });
}
