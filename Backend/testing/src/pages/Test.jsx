import React, { useState, useEffect } from 'react'
import axios from 'axios'

const Test = () => {
    const [data, setData] = useState('Loading...')
    const instance = axios.create({
        withCredentials: true,
        baseURL: "http://localhost:5000",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    const testLogin = async () => {
        setData("Not logged in")
        try {
            // Extract CSRF token from cookies
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];

            if (!csrfToken) {
                console.error("CSRF token not found");
                return;
            }

            // Send request with CSRF token
            const response = await instance.post('/protected', {}, {
                withCredentials: true,
                headers: {
                    "X-CSRF-TOKEN": csrfToken  // Include CSRF token in the request
                }
            });

            setData("Test successful");
        } catch (error) {
            console.error("Error:", error.response?.data || error.message);
        }
    };
    return (
        <div>
            {data}
            <button onClick={testLogin}>test</button>
        </div>
    )
}

export default Test
