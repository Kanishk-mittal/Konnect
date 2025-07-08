export const ADMIN_REGISTRATION_RULES: { [key: string]: { regex: RegExp, message: string, minLength?: number, maxLength?: number } } = {
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
        regex: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
        message: 'Invalid email format. Must contain @ followed by a domain with at least one dot.'
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