import { sendStudentCredentialsEmail } from './mailer.utils';

/**
 * Parallel Email Processing (Recommended for <500 emails)
 * Processes all emails simultaneously - faster but uses more resources
 */
export const sendBulkStudentEmailsParallel = async (
    emailData: Array<{
        email: string;
        name: string;
        collegeCode: string;
        rollNumber: string;
        password: string;
    }>
): Promise<{ successful: number; failed: number; errors: string[] }> => {
    console.log(`Starting parallel email sending for ${emailData.length} students...`);
    
    const emailPromises = emailData.map(async (student, index) => {
        try {
            await sendStudentCredentialsEmail(
                student.email,
                student.name,
                student.collegeCode,
                student.rollNumber,
                student.password
            );
            return { success: true, index, error: null };
        } catch (error) {
            return { 
                success: false, 
                index, 
                error: `Failed to send email to ${student.email}: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    });

    // Process all emails in parallel
    const results = await Promise.allSettled(emailPromises);
    
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
            successful++;
        } else {
            failed++;
            if (result.status === 'fulfilled') {
                errors.push(result.value.error!);
            } else {
                errors.push(`Email ${index + 1} failed: ${result.reason}`);
            }
        }
    });

    console.log(`Parallel email sending completed. Success: ${successful}, Failed: ${failed}`);
    
    return { successful, failed, errors };
};

/**
 * Batch Email Processing (Recommended for 500+ emails)
 * Processes emails in smaller batches to avoid overwhelming the email service
 */
export const sendBulkStudentEmailsBatch = async (
    emailData: Array<{
        email: string;
        name: string;
        collegeCode: string;
        rollNumber: string;
        password: string;
    }>,
    batchSize: number = 50,
    delayBetweenBatches: number = 1000 // 1 second delay
): Promise<{ successful: number; failed: number; errors: string[] }> => {
    console.log(`Starting batch email sending for ${emailData.length} students in batches of ${batchSize}...`);
    
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process emails in batches
    for (let i = 0; i < emailData.length; i += batchSize) {
        const batch = emailData.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(emailData.length / batchSize);
        
        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)...`);
        
        try {
            // Process current batch in parallel
            const batchResults = await sendBulkStudentEmailsParallel(batch);
            
            successful += batchResults.successful;
            failed += batchResults.failed;
            errors.push(...batchResults.errors);
            
        } catch (error) {
            failed += batch.length;
            errors.push(`Batch ${batchNumber} failed completely: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < emailData.length && delayBetweenBatches > 0) {
            console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    console.log(`Batch email sending completed. Total Success: ${successful}, Total Failed: ${failed}`);
    
    return { successful, failed, errors };
};

/**
 * Smart Email Processing (Automatically chooses best approach)
 * Uses parallel for small batches, batch processing for large batches
 */
export const sendBulkStudentEmailsSmart = async (
    emailData: Array<{
        email: string;
        name: string;
        collegeCode: string;
        rollNumber: string;
        password: string;
    }>
): Promise<{ successful: number; failed: number; errors: string[] }> => {
    
    if (emailData.length === 0) {
        return { successful: 0, failed: 0, errors: [] };
    }
    
    // Use parallel processing for smaller batches (faster)
    if (emailData.length <= 100) {
        console.log(`Using parallel processing for ${emailData.length} emails (small batch)`);
        return await sendBulkStudentEmailsParallel(emailData);
    }
    
    // Use batch processing for larger batches (more reliable)
    console.log(`Using batch processing for ${emailData.length} emails (large batch)`);
    return await sendBulkStudentEmailsBatch(emailData, 50, 1000);
};
