import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
});

function getCSRFToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_access_token='))?.split('=')[1];
}

export async function postData(url, data = {}, config = {}) {
  const csrfToken = getCSRFToken();
  const mergedConfig = {
    ...config,
    headers: {
      "X-CSRF-TOKEN": csrfToken,
      ...(config.headers || {})
    }
  };
  const response = await instance.post(url, data, mergedConfig);
  return response.data;
}

export async function getData(endpoint) {
  try {
    const csrfToken = getCSRFToken();
    const response = await instance.post(endpoint, {}, {
      headers: {
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest"
      },
      mode: 'cors'
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

export async function getPublicKey() {
  const csrfToken = getCSRFToken();
  const response = await instance.post('/publicKey', {}, {
    headers: {
      "X-CSRF-TOKEN": csrfToken
    }
  });
  return response.data.public_key;
}
