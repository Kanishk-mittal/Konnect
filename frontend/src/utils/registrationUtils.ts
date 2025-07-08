export type AdminRegistrationData = {
    collegeName: string;
    collegeCode: string;
    emailId: string;
    adminUsername: string;
    password: string;
    confirmPassword: string; // Optional for confirmation, not used in validation
}

export const validateRegistrationData = (data: AdminRegistrationData): { status: boolean, message: string } => {
    // Validate the incoming data
    if (!data.collegeName || !data.collegeCode || !data.emailId || !data.adminUsername || !data.password) {
        return { status: false, message: 'All fields are required.' };
    }

    if (data.password !== data.confirmPassword) {
        return { status: false, message: 'Passwords do not match.' };
        
    }

    // Define validation rules for each field
    const validationRules: { [key: string]: { regex: RegExp, message: string, minLength?: number, maxLength?: number } } = {
        collegeName: {
            regex: /^[a-zA-Z0-9 ]+$/,
            message: 'College name should only contain alphanumeric characters and spaces.'
        },
        collegeCode: {
            regex: /^[a-zA-Z0-9]+$/,
            message: 'College code should only contain alphanumeric characters.',
            minLength: 5,
            maxLength: 5
        },
        emailId: {
            // Email regex: allows multiple dots after @ but requires at least one dot after @
            // and ensures @ appears exactly once
            regex: /^[a-zA-Z0-9]+\@[a-zA-Z0-9.]+$/,
            message: 'Invalid email format. Must contain @ followed by a domain that can have multiple "."'
        },
        adminUsername: {
            regex: /^[a-zA-Z0-9]+$/,
            message: 'Admin username should only contain alphanumeric characters.'
        },
        password: {
            // Password regex: allows alphanumeric characters, #, @, _, and & but not commas or quotes
            regex: /^[a-zA-Z0-9#@_&]+$/,
            message: 'Password can only contain alphanumeric characters and #, @, _, &',
            minLength: 6
        }
    };

    // Loop through each field and validate against its respective rule
    for (const [field, value] of Object.entries(data)) {
        const rule = validationRules[field];
        if (!rule) continue; // Skip if no rule defined for this field

        // Check minimum length if specified
        if (rule.minLength && value.length < rule.minLength) {
            return {
                status: false,
                message: field === 'password'
                    ? `Password must be at least ${rule.minLength} characters long.`
                    : `${field} must be at least ${rule.minLength} characters long.`
            };
        }

        // Check exact length if min and max are the same
        if (rule.minLength && rule.maxLength && rule.minLength === rule.maxLength && value.length !== rule.minLength) {
            return {
                status: false,
                message: `${field} must be exactly ${rule.minLength} characters long.`
            };
        }

        // Check maximum length if specified
        if (rule.maxLength && value.length > rule.maxLength) {
            return {
                status: false,
                message: `${field} must not exceed ${rule.maxLength} characters.`
            };
        }

        // Check regex pattern
        if (!rule.regex.test(value)) {
            return {
                status: false,
                message: rule.message
            };
        }
    }

    // All validations passed
    return { status: true, message: 'Validation successful' };
}