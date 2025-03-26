import React, { useState, useEffect, useContext } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'; // Fixed import path

const Test = () => {
    const [data, setData] = useState('Loading...')
    const [userInfo, setUserInfo] = useState(null)
    const navigate = useNavigate();
    
    // Add this to debug the context
    const { privateKey, dbKey } = useContext(AppContext);
    
    useEffect(() => {
        console.log("Test page loaded. Authentication state:", {
            hasPrivateKey: !!privateKey,
            hasDbKey: !!dbKey
        });
    }, [privateKey, dbKey]);

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
            setUserInfo(response.data); // Store all user information
        } catch (error) {
            console.error("Error:", error.response?.data || error.message);
        }
    };

    // Add this function to check keys before navigating
    const navigateToGroups = () => {
        if (!privateKey || !dbKey) {
            console.error("Missing authentication keys. Can't navigate to Groups.");
            alert("You need to be logged in to view groups. Please log in again.");
            navigate('/login');
        } else {
            console.log("Auth keys present, navigating to Groups...");
            navigate('/groups');
        }
    };

    return (
        <div>
            <h2>{data}</h2>
            {userInfo && (
                <div>
                    <h3>User Information</h3>
                    <p><strong>Roll Number:</strong> {userInfo.logged_in_as}</p>
                    <p><strong>Name:</strong> {userInfo.name}</p>
                    <p><strong>Email:</strong> {userInfo.email}</p>
                    <p><strong>Role:</strong> {userInfo.role}</p>
                </div>
            )}
            <button onClick={testLogin}>test</button>
            <button onClick={navigateToGroups}>View My Groups</button> {/* Use the new function */}
            
            {/* Add debug info */}
            <div style={{marginTop: "20px", padding: "10px", border: "1px solid #ccc"}}>
                <h4>Authentication Status</h4>
                <p>Private Key present: {privateKey ? "Yes" : "No"}</p>
                <p>DB Key present: {dbKey ? "Yes" : "No"}</p>
            </div>
        </div>
    )
}

export default Test
