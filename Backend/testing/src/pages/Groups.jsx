import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

function Groups() {
    const [groups, setGroups] = useState([]);
    const [groupsWithKeys, setGroupsWithKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'keys'
    const [selectedGroup, setSelectedGroup] = useState(null);
    const navigate = useNavigate();
    const { privateKey, dbKey } = useContext(AppContext);

    // Create axios instance with credentials
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

    useEffect(() => {
        // Check if user is authenticated
        if (!privateKey || !dbKey) {
            console.log("User not authenticated, redirecting to login");
            navigate('/login');
            return;
        }

        // Get CSRF token
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf_access_token='))
            ?.split('=')[1];

        if (!csrfToken) {
            console.log("CSRF token not found, but continuing anyway");
            // Continue loading - don't redirect immediately
            // This helps debugging by letting you see if the CSRF token is the issue
        }

        // Set headers with CSRF token (if available)
        const headers = csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {};

        // Fetch user's groups (basic info)
        const fetchGroups = async () => {
            try {
                console.log("Fetching groups data...");
                const response = await instance.get('/get_user_groups', { headers });
                console.log("Groups data received:", response.data);
                setGroups(response.data.groups);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching groups:", error);
                setError(error.response?.data?.error || error.message);
                setLoading(false);
            }
        };

        // Fetch groups with keys
        const fetchGroupsWithKeys = async () => {
            try {
                const response = await instance.get('/get_user_groups_with_keys', { headers });
                setGroupsWithKeys(response.data.groups);
            } catch (error) {
                console.error("Error fetching groups with keys:", error);
                // We don't set the main error state here as this is secondary data
            }
        };

        // Execute fetches
        fetchGroups();
        fetchGroupsWithKeys();
    }, [privateKey, dbKey, navigate]);

    const handleBack = () => {
        navigate('/test');
    };

    const toggleViewMode = () => {
        setViewMode(viewMode === 'basic' ? 'keys' : 'basic');
    };

    const handleSelectGroup = (group) => {
        setSelectedGroup(group.id === selectedGroup ? null : group.id);
    };

    // Helper to find the group with keys by ID
    const findGroupWithKeys = (groupId) => {
        return groupsWithKeys.find(g => g.id === groupId);
    };

    if (loading) {
        return <div>Loading your groups...</div>;
    }

    if (error) {
        return (
            <div>
                <h2>Error loading groups</h2>
                <p>{error}</p>
                <button onClick={handleBack}>Back</button>
            </div>
        );
    }

    return (
        <div className="groups-container">
            <h1>Your Groups</h1>
            
            <div className="view-controls">
                <button onClick={toggleViewMode}>
                    {viewMode === 'basic' ? 'Show Groups with Keys' : 'Show Basic View'}
                </button>
            </div>
            
            {groups.length === 0 ? (
                <p>You are not a member of any groups yet.</p>
            ) : (
                <div className="groups-list">
                    {viewMode === 'basic' ? (
                        // Basic view - just group info
                        groups.map((group) => (
                            <div key={group.id} className="group-card">
                                <h2>{group.name}</h2>
                                {group.description && <p>{group.description}</p>}
                                <p>Your role: {group.role}</p>
                                <p>Joined: {new Date(group.joined_at).toLocaleDateString()}</p>
                            </div>
                        ))
                    ) : (
                        // Advanced view with keys
                        groupsWithKeys.map((group) => (
                            <div key={group.id} className="group-card group-card-detailed">
                                <div 
                                    className="group-header" 
                                    onClick={() => handleSelectGroup(group)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <h2>{group.name}</h2>
                                    <p>Members: {group.member_count}</p>
                                </div>
                                
                                {selectedGroup === group.id && (
                                    <div className="group-details">
                                        {group.description && <p><strong>Description:</strong> {group.description}</p>}
                                        <p><strong>Your role:</strong> {group.role}</p>
                                        <p><strong>Joined:</strong> {new Date(group.joined_at).toLocaleDateString()}</p>
                                        
                                        <h3>Group Members and Keys</h3>
                                        <div className="members-list">
                                            {group.members.map((member) => (
                                                <div key={member.roll_number} className="member-item">
                                                    <p><strong>Member:</strong> {member.roll_number}</p>
                                                    <p><strong>Role:</strong> {member.role}</p>
                                                    <details>
                                                        <summary>Public Key</summary>
                                                        <pre className="key-display">{member.public_key}</pre>
                                                    </details>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
            
            <button onClick={handleBack} style={{ marginTop: '20px' }}>Back</button>
            
            {/* Add some basic styles */}
            <style jsx>{`
                .groups-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .view-controls {
                    margin-bottom: 20px;
                }
                .groups-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .group-card {
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    padding: 15px;
                    background-color: #f9f9f9;
                }
                .group-card-detailed {
                    border-color: #aaa;
                }
                .group-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .group-details {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px dashed #ccc;
                }
                .members-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .member-item {
                    background-color: #eee;
                    padding: 10px;
                    border-radius: 4px;
                }
                .key-display {
                    background-color: #333;
                    color: #fff;
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    max-height: 100px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    word-break: break-all;
                }
            `}</style>
        </div>
    );
}

export default Groups;
