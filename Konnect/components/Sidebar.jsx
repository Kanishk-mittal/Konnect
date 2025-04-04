import React, { useState, useContext, useEffect } from "react";
import { AppContext } from "../src/context/AppContext";
import "./Sidebar.css";
import { postData } from "../Integration/apiService";

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState("personal");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);

  // Loading context from AppContext
  const { setselectedChat,
    setselectedChatType,
    unreadCount,
    selectedChat,
    selectedChatType,
    setunreadCount } = useContext(AppContext);

  // function to fetch the list of users and groups from the backend
  const fetchUsers = async () => {
    try {
      const response = await postData('get_users', {}, { credentials: 'include' });

      if (response && Array.isArray(response.users)) {
        setUsers(response.users);
      } else {
        setError('Invalid user data received');
      }
    } catch (err) {
      setError('Failed to load users. Please try again later.');
    }
  };

  // Function to fetch user groups from backend
  const fetchGroups = async () => {
    try {
      const response = await postData('get_user_groups', {}, { credentials: 'include' });

      if (response && response.groups && Array.isArray(response.groups)) {
        setGroups(response.groups);
      } else {
        setError('Invalid group data received');
      }
    } catch (err) {
      setError('Failed to load groups. Please try again later.');
    }
  };

  useEffect(() => {
    // Fetch users and groups when the component mounts
    const fetchData = async () => {
      setLoading(true);
      try {
        fetchUsers();
        fetchGroups();
      } finally {
        setLoading(false);
      }
    };
    // Initial fetch when component mounts
    fetchData();
  }, []) // Empty dependency array ensures this only runs on mount

  useEffect(() => {
    // Filter users based on search term
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredUsersList = users.filter(user =>
      user.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      user.roll_number.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setFilteredUsers(filteredUsersList);

    // Filter groups based on search term
    console.log(groups);
    const filteredGroupsList = groups.filter(group =>
      group.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      group.description.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setFilteredGroups(filteredGroupsList);
  }, [searchTerm, users, groups]);

  // Update the search input handler
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };


  return (
    <div className="sidebar">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "personal" ? "active" : ""}`}
          onClick={() => setActiveTab("personal")}
        >
          Personal
        </button>
        <button
          className={`tab ${activeTab === "communities" ? "active" : ""}`}
          onClick={() => setActiveTab("communities")}
        >
          Communities
        </button>
      </div>

      <div className="sidebar-content">
        <input
          type="text"
          placeholder="Search by name or roll number..."
          className="search-bar"
          value={searchTerm}
          onChange={handleSearch}
        />

        {loading ? (
          <div className="loading-indicator">Loading...</div>
        ) : error ? (
          <div className="error-message">Unable to load your chats please refresh</div>
        ) : (
          <div className="chat-list">
            {activeTab === "personal" ? (
              filteredUsers.length === 0 ? (
                <div className="no-results">No users found</div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.roll_number}
                    className={`chat-item ${selectedChat === user.roll_number && selectedChatType === 'user' ? 'selected' : ''}`}
                    onClick={() => {
                      setselectedChat(user.roll_number);
                      setselectedChatType('user');
                      // settign the unread count to 0 when the user is selected
                      if (unreadCount[user.roll_number]) {
                        const updatedUnreadCount = [ ...unreadCount ];
                        updatedUnreadCount[user.roll_number] = 0;
                        setunreadCount(updatedUnreadCount);
                      }
                    }}
                  >
                    <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
                    <div className="chat-details">
                      <div className="chat-name-container">
                        <h4>{user.name}</h4>
                        {unreadCount[user.roll_number] && unreadCount[user.roll_number] > 0 && (
                          <span className="unread-badge">{unreadCount[user.roll_number]}</span>
                        )}
                      </div>
                      <p>{user.roll_number}</p>
                      <span className="chat-time">
                        {unreadCount[user.roll_number] && unreadCount[user.roll_number] > 0 ? (
                          <span className="online-indicator unread"></span>
                        ) : (
                          user.is_online ? <span className="online-indicator"></span> : "Offline"
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : (
              filteredGroups.length === 0 ? (
                <div className="no-results">No groups found</div>
              ) : (
                filteredGroups.map(group => (
                  <div
                    key={group.id}
                    className={`chat-item ${selectedChat === group.id && selectedChatType === 'group' ? 'selected' : ''}`}
                    onClick={() => {
                      setselectedChat(group.id);
                      setselectedChatType('group');
                      // settign the read count to 0 when the group is selected
                      if (unreadCount[group.id]) {
                        const updatedUnreadCount = [ ...unreadCount ];
                        updatedUnreadCount[group.id] = 0;
                        setunreadCount(updatedUnreadCount);
                      }
                    }}
                  >
                    <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
                    <div className="chat-details">
                      <div className="chat-name-container">
                        <h4>{group.name}</h4>
                        {unreadCount[group.id] && unreadCount[group.id] > 0 && (
                          <span className="unread-badge">{unreadCount[group.id]}</span>
                        )}
                      </div>
                      <p>{group.description || 'No description'}</p>
                      <span className="chat-time">
                        {unreadCount[group.id] && unreadCount[group.id].count > 0 ? (
                          <span className="online-indicator unread"></span>
                        ) : (
                          group.role
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;