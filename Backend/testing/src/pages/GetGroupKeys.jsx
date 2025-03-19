import React, { useState } from 'react';
import axios from 'axios';

const GetGroupKeys = () => {
    const [groupId, setGroupId] = useState('');
    const [groupKeys, setGroupKeys] = useState(null);
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
        setGroupId('');
        setGroupKeys(null);
        setError('');
        setResponseInfo(null);
    };

    const handleGetKeys = async (e) => {
        e.preventDefault();
        setLoading(true);
        setGroupKeys(null);
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

            console.log(`Sending request for group ID: ${groupId}`);

            // Send request with CSRF token and group ID
            const response = await instance.post('/get_group_keys', 
                { group_id: groupId }, 
                {
                    headers: {
                        "X-CSRF-TOKEN": csrfToken
                    }
                }
            );

            // Store response info for debugging
            setResponseInfo({
                requestedGroupId: groupId,
                status: response.status,
                headers: JSON.stringify(response.headers),
                data: JSON.stringify(response.data)
            });

            // Display the returned keys
            setGroupKeys(response.data);
        } catch (error) {
            console.error("Error fetching group keys:", error);
            setError(error.response?.data?.error || 
                     "Failed to get group keys. Make sure you are logged in, the group exists, and you are a member.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Get Group Member Public Keys</h2>
            <form onSubmit={handleGetKeys}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="groupId">Group ID:</label>
                    <input 
                        type="text"
                        id="groupId"
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                        required
                        style={{ 
                            padding: '8px', 
                            marginLeft: '10px',
                            width: '300px'
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
                        {loading ? 'Loading...' : 'Get Group Keys'}
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

            {groupKeys && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Group: {groupKeys.group_name}</h3>
                    <p>Group ID: {groupKeys.group_id}</p>
                    <p>Total Members with Keys: {groupKeys.keys.length}</p>
                    
                    {groupKeys.keys.length > 0 ? (
                        <div style={{ marginTop: '15px' }}>
                            <h4>Member Keys:</h4>
                            <div style={{ 
                                maxHeight: '400px', 
                                overflowY: 'auto',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}>
                                {groupKeys.keys.map((member, index) => (
                                    <div key={index} style={{ 
                                        padding: '10px', 
                                        borderBottom: index < groupKeys.keys.length - 1 ? '1px solid #ddd' : 'none',
                                        backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'transparent' 
                                    }}>
                                        <p><strong>Roll Number:</strong> {member.roll_number}</p>
                                        <p><strong>Public Key:</strong></p>
                                        <div style={{ 
                                            padding: '8px', 
                                            backgroundColor: '#f5f5f5',
                                            borderRadius: '4px',
                                            overflowX: 'auto',
                                            fontSize: '0.8em',
                                            maxHeight: '100px',
                                            overflowY: 'auto'
                                        }}>
                                            <pre style={{ margin: 0 }}>{member.public_key}</pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p>No member keys available for this group.</p>
                    )}
                </div>
            )}
            
            {responseInfo && (
                <div style={{ marginTop: '20px', fontSize: '0.9em' }}>
                    <details>
                        <summary style={{ cursor: 'pointer', color: '#646cff' }}>Debug Information</summary>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginTop: '10px' }}>
                            <p><strong>Request Group ID:</strong> {responseInfo.requestedGroupId}</p>
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

export default GetGroupKeys;
