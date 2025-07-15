import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const instance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

export const postData = async (endpoint: string, data: any) => {
    try {
        const response = await instance.post(endpoint, data);
        return response.data;
    } catch (error) {
        console.error(`Error posting data to ${endpoint}:`, error);
        throw error;
    }
}

export const getData = async (endpoint: string, params?: any) => {
    try {
        const response = await instance.get(endpoint, { params });
        return response.data;
    } catch (error) {
        console.error(`Error getting data from ${endpoint}:`, error);
        throw error;
    }
}