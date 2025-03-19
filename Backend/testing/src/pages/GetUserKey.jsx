import React, { useState } from 'react';
import axios from 'axios';

const GetUserKey = () => {
    const [roll, setRoll] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [responseInfo, setResponseInfo] = useState(null);

    const instance = axios.create({
        withCredentials: true,
        baseURL: "http://localhost:5000",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    const handleClear = () => {
        setRoll('');
        setPublicKey('');
        setError('');
        setResponseInfo(null);
    };

    const handleGetKey = async (e) => {
        e.preventDefault();
        setLoading(true);
        setPublicKey('');
        setError('');
        setResponseInfo(null);

        try {
            // Extract CSRF token from cookies
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];

            if (!csrfToken) {
                setError("CSRF token not found. Please login first.");
                setLoading(false);
                return;
            }

            console.log(`Sending request for roll number: ${roll}`);

            // Send request with CSRF token and roll number
            const response = await instance.post('/get_user_key', 
                { roll }, 
                {
                    headers: {
                        "X-CSRF-TOKEN": csrfToken
                    }
                }
            );

            // Store response info for debugging
            setResponseInfo({
                requestedRoll: roll,
                status: response.status,
                headers: JSON.stringify(response.headers),
                data: JSON.stringify(response.data)
            });

            // Display the returned public key
            setPublicKey(response.data.key);
        } catch (error) {
            console.error("Error fetching user key:", error);
            setError(error.response?.data?.error || 
                     "Failed to get user's public key. Make sure you are logged in and the roll number is valid.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Get User Public Key</h2>
            <form onSubmit={handleGetKey}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="roll">Roll Number:</label>
                    <input 
                        type="text"
                        id="roll"
                        value={roll}
                        onChange={(e) => setRoll(e.target.value)}
                        required
                        style={{ 
                            padding: '8px', 
                            marginLeft: '10px',
                            width: '200px'
                        }}
                    />
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ 
                            padding: '8px 16px',
                            background: loading ? '#cccccc' : '#646cff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Loading...' : 'Get Public Key'}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={handleClear}
                        style={{ 
                            padding: '8px 16px',
                            background: '#888888',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear
                    </button>
                </div>
            </form>

            {error && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '10px', 
                    color: 'white', 
                    backgroundColor: '#f44336',
                    borderRadius: '4px' 
                }}>
                    {error}
                </div>
            )}

            {publicKey && (
                <div style={{ marginTop: '20px' }}>
                    <h3>User's Public Key for Roll Number: {responseInfo?.requestedRoll}</h3>
                    <div style={{ 
                        padding: '10px', 
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <pre>{publicKey}</pre>
                    </div>
                </div>
            )}
            
            {responseInfo && (
                <div style={{ marginTop: '20px', fontSize: '0.9em' }}>
                    <details>
                        <summary style={{ cursor: 'pointer', color: '#646cff' }}>Debug Information</summary>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginTop: '10px' }}>
                            <p><strong>Request Roll Number:</strong> {responseInfo.requestedRoll}</p>
                            <p><strong>Response Status:</strong> {responseInfo.status}</p>
                            <p><strong>Response Headers:</strong></p>
                            <pre style={{ overflowX: 'auto' }}>{responseInfo.headers}</pre>
                            <p><strong>Response Data:</strong></p>
                            <pre style={{ overflowX: 'auto' }}>{responseInfo.data}</pre>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
};

export default GetUserKey;
