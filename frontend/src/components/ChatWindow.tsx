import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { triggerUpdate, setChat, clearChat } from '../store/chatSlice';
import type { RootState } from '../store/store';
import ProfileIcon from '../assets/profile_icon.png';
import SendIcon from '../assets/send.png';
import EditIcon from '../assets/edit.png';
import { getData, postData } from '../api/requests';
import { getChatMessages, getGroupMessages, getAnnouncementMessages, addChatMessage, addGroupMessage, addAnnouncementMessage } from '../database/messages.db';
import { getPublicKey, setPublicKey } from '../database/userList.db';
import { encryptAES, generateAESKey } from '../encryption/AES_utils';
import { encryptRSA } from '../encryption/RSA_utils';
import { socket } from '../api/socket';

type ChatType = 'chat' | 'announcement' | 'group';

interface Message {
    id: string | number;
    text: string;
    sender: 'me' | 'other';
    senderName?: string;
    timestamp?: number;
}

interface ChatWindowProps {
    chatId: string;
    type: ChatType;
}

const formatTime = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, type }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userId = useSelector((state: RootState) => state.auth.userId);
    const username = useSelector((state: RootState) => state.user.profile?.username || 'Me');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    
    const [chatName, setChatName] = useState<string>('');
    const [chatIcon, setChatIcon] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);
    const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState<boolean>(false);
    const [groupDetails, setGroupDetails] = useState<{
        description: string;
        members: { user_id: string; id: string; username: string; profile_picture: string | null; isAdmin: boolean }[];
    } | null>(null);

    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const lastUpdated = useSelector((state: RootState) => state.chat.lastUpdated);

    useEffect(() => {
        const fetchChatDetails = async () => {
            if (!chatId) return;

            setLoading(true);
            setError(null);
            setChatName('');
            setChatIcon(undefined);
            setIsUserAdmin(false);

            try {
                let name = '';
                let icon: string | undefined = undefined;

                if (type === 'chat') {
                    const userDetailsPromise = getData(`/user/details/${chatId}`);
                    const profilePicPromise = getData(`/user/profile-picture/${chatId}`);
                    const [userDetailsRes, profilePicRes] = await Promise.all([userDetailsPromise, profilePicPromise]);

                    if (userDetailsRes.status && userDetailsRes.data.username) {
                        name = userDetailsRes.data.username;
                    } else {
                        throw new Error(userDetailsRes.message || 'Failed to fetch user details');
                    }
                    if (profilePicRes.status && profilePicRes.profilePicture) {
                        icon = profilePicRes.profilePicture;
                    }

                } else if (type === 'group') {
                    const infoPromise = getData(`/groups/chat/info/${chatId}`);
                    const adminStatusPromise = getData(`/groups/chat/is-admin/${chatId}`);
                    const [infoRes, adminStatusRes] = await Promise.all([infoPromise, adminStatusPromise]);

                    if (infoRes.status && infoRes.data) {
                        name = infoRes.data.name;
                        icon = infoRes.data.icon;
                        setGroupDetails({
                            description: infoRes.data.description,
                            members: infoRes.data.members
                        });
                    } else {
                        throw new Error(infoRes.message || 'Failed to fetch group details');
                    }
                    if (adminStatusRes.status && adminStatusRes.data) {
                        setIsUserAdmin(adminStatusRes.data.isAdmin);
                    }
                } else if (type === 'announcement') {
                    const infoPromise = getData(`/groups/announcement/info/${chatId}`);
                    const adminStatusPromise = getData(`/groups/announcement/is-admin/${chatId}`);

                    const [infoRes, adminStatusRes] = await Promise.all([infoPromise, adminStatusPromise]);

                    if (infoRes.status && infoRes.data) {
                        name = infoRes.data.name;
                        icon = infoRes.data.icon;
                        setGroupDetails({
                            description: infoRes.data.description,
                            members: infoRes.data.members
                        });
                    } else {
                        throw new Error(infoRes.message || 'Failed to fetch announcement details');
                    }

                    if (adminStatusRes.status && adminStatusRes.data) {
                        setIsUserAdmin(adminStatusRes.data.isAdmin);
                    }
                }
                setChatName(name);
                setChatIcon(icon);
            } catch (err: any) {
                setError(err.message || 'An error occurred while fetching chat details.');
                setChatName(`Chat ${chatId}`); // Fallback name
            } finally {
                setLoading(false);
            }
        };

        fetchChatDetails();
    }, [chatId, type]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!chatId || !userId) return;

            try {
                let dbMessages: any[] = [];
                if (type === 'chat') {
                    dbMessages = await getChatMessages(userId, chatId);
                } else if (type === 'group') {
                    dbMessages = await getGroupMessages(userId, chatId);
                } else if (type === 'announcement') {
                    dbMessages = await getAnnouncementMessages(userId, chatId);
                }

                dbMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

                const formattedMessages: Message[] = dbMessages.map((m) => ({
                    id: m.id,
                    text: m.content,
                    sender: m.senderId === userId ? 'me' : 'other',
                    senderName: m.senderId === userId ? 'Me' : (type === 'chat' ? chatName : (m.senderName || 'User')),
                    timestamp: m.timestamp
                }));
                setMessages(formattedMessages);
            } catch (err) {
                console.error('Failed to fetch messages from database:', err);
            }
        };

        fetchMessages();
    }, [chatId, type, userId, chatName, lastUpdated]);


    const handleSendMessage = async () => {
        if (newMessage.trim() && userId) {
            const timestamp = Date.now();
            const messageId = timestamp.toString();
            const originalMessage = newMessage;
            const newMsg: Message = { id: messageId, text: originalMessage, sender: 'me', senderName: 'Me', timestamp };

            try {
                if (type === 'chat') {
                    let publicKey = await getPublicKey(userId, chatId);

                    if (!publicKey) {
                        const res = await getData(`/user/public-key/${chatId}`);
                        if (res.status && res.data.publicKey) {
                            publicKey = res.data.publicKey;
                            await setPublicKey(userId, chatId, publicKey!);
                        } else {
                            throw new Error("Could not retrieve receiver's public key.");
                        }
                    }

                    const aesKey = generateAESKey();
                    const encryptedMessage = encryptAES(originalMessage, aesKey);
                    const encryptedAesKey = encryptRSA(aesKey, publicKey!);

                    const payload = JSON.stringify({
                        message: encryptedMessage,
                        encryptedAesKey: encryptedAesKey,
                        timestamp: timestamp,
                        type: 'chat'
                    });

                    socket.emit('private_message', {
                        receiver: chatId,
                        message: payload
                    });

                    await addChatMessage(userId, chatId, {
                        id: messageId,
                        senderId: userId,
                        content: originalMessage,
                        readStatus: true,
                        timestamp: timestamp
                    });

                } else if (type === 'group' || type === 'announcement') {
                    const membersEndpoint = type === 'group' 
                        ? `/groups/chat/members-keys/${chatId}` 
                        : `/groups/announcement/members-keys/${chatId}`;

                    const res = await getData(membersEndpoint);
                    if (!res.status || !res.data) {
                        throw new Error(`Failed to fetch ${type} members' public keys.`);
                    }

                    const membersKeys: { user_id: string, publicKey: string }[] = res.data;
                    const aesKey = generateAESKey();
                    const encryptedMessage = encryptAES(originalMessage, aesKey);

                    membersKeys.forEach(member => {
                        if (member.user_id !== userId) {
                            const encryptedAesKeyForMember = encryptRSA(aesKey, member.publicKey);

                            const payload = JSON.stringify({
                                message: encryptedMessage,
                                encryptedAesKey: encryptedAesKeyForMember,
                                groupId: chatId,
                                senderName: username,
                                timestamp: timestamp,
                                type: type
                            });

                            socket.emit('private_message', {
                                receiver: member.user_id,
                                message: payload,
                                groupId: chatId
                            });
                        }
                    });

                    if (type === 'group') {
                        await addGroupMessage(userId, {
                            id: messageId,
                            senderId: userId,
                            senderName: username,
                            content: originalMessage,
                            readStatus: true,
                            timestamp: timestamp,
                            groupId: chatId
                        });
                    } else { // announcement
                        await addAnnouncementMessage(userId, {
                            id: messageId,
                            senderId: userId,
                            senderName: username,
                            content: originalMessage,
                            readStatus: true,
                            timestamp: timestamp,
                            groupId: chatId
                        });
                    }
                }

                setMessages(prev => [...prev, newMsg]);
                setNewMessage('');
                dispatch(triggerUpdate());
            } catch (err: any) {
                console.error("Failed to send message:", err);
                setError(err.message || "Failed to send message.");
            }
        }
    };
    
    if (!chatId) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-lg text-gray-500 dark:text-gray-400">Select a chat to start messaging</p>
            </div>
        );
    }

    const handleEditClick = () => {
        if (type === 'chat') return;
        const queryParam = type === 'group' ? 'chatGroupId' : 'announcementGroupId';
        navigate(`/edit-group?${queryParam}=${chatId}`);
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm('Are you sure you want to leave this group?')) return;
        
        try {
            const endpoint = type === 'group' ? `/groups/chat/leave/${chatId}` : `/groups/announcement/leave/${chatId}`;
            const res = await postData(endpoint, {});
            if (res.status) {
                setIsGroupInfoModalOpen(false);
                dispatch(clearChat());
                dispatch(triggerUpdate());
            } else {
                alert(res.message || 'Failed to leave group');
            }
        } catch (err: any) {
            console.error('Error leaving group:', err);
            alert(err.message || 'An error occurred while leaving the group');
        }
    };

    const handleMessageMember = (member: { user_id: string; username: string; profile_picture: string | null }) => {
        setIsGroupInfoModalOpen(false);
        dispatch(setChat({
            chatType: 'chat',
            chatId: member.user_id,
            username: member.username,
            profilePicture: member.profile_picture || undefined
        }));
    };

    const canSendMessage = type === 'chat' || type === 'group' || (type === 'announcement' && isUserAdmin);

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center p-3 border-b border-gray-300 dark:border-gray-700">
                {loading ? (
                    <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse mr-4"></div>
                ) : (
                    <img src={chatIcon || ProfileIcon} alt="Profile" className="w-10 h-10 rounded-full mr-4" />
                )}
                <div className="flex-grow">
                    <h2 
                        className={`text-xl font-bold text-gray-800 dark:text-white ${(type === 'group' || type === 'announcement') ? 'cursor-pointer hover:underline' : ''}`}
                        onClick={() => {
                            if (type === 'group' || type === 'announcement') {
                                if (isUserAdmin) {
                                    handleEditClick();
                                } else {
                                    setIsGroupInfoModalOpen(true);
                                }
                            }
                        }}
                    >
                        {loading ? 'Loading...' : error || chatName}
                    </h2>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow p-4 overflow-y-auto">
                {messages.map((msg) => {
                    const isAnnouncement = type === 'announcement';
                    const isSent = !isAnnouncement && msg.sender === 'me';

                    const messageAlignment = isAnnouncement ? 'justify-center' : isSent ? 'justify-end' : 'justify-start';
                    const messageBgColor = isSent ? 'bg-[#FF7900]' : 'bg-[#3C096C]';
                    const textColor = isSent ? 'text-black' : 'text-white';
                    
                    return (
                        <div key={msg.id} className={`flex ${messageAlignment} mb-4`}>
                            <div className={`max-w-md p-3 rounded-lg ${messageBgColor} ${textColor}`}>
                                { (type !== 'chat' && !isSent && msg.senderName) && (
                                    <p className="text-xs font-bold mb-1">{msg.senderName}</p>
                                )}
                                <p>{msg.text}</p>
                                <p className={`text-xs mt-1 ${isSent ? 'text-gray-800' : 'text-gray-300'} opacity-75`}>
                                    {formatTime(msg.timestamp)}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {canSendMessage && (
                <div className="p-4 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="flex-grow p-2 rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-black dark:text-white"
                        />
                        <button onClick={handleSendMessage} className="ml-3 p-2 rounded-full bg-blue-500 hover:bg-blue-600">
                            <img src={SendIcon} alt="Send" className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {/* Group Info Modal */}
            {isGroupInfoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-semibold dark:text-white">Group Details</h3>
                            <button onClick={() => setIsGroupInfoModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-grow">
                            <div className="flex flex-col items-center mb-6">
                                <img src={chatIcon || ProfileIcon} alt="Group" className="w-24 h-24 rounded-full mb-3 object-cover shadow-md" />
                                <h4 className="text-2xl font-bold dark:text-white">{chatName}</h4>
                                <p className="text-gray-600 dark:text-gray-400 text-center mt-2 italic">
                                    {groupDetails?.description || 'No description available'}
                                </p>
                            </div>
                            
                            <div className="mb-4">
                                <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Members ({groupDetails?.members.length || 0})</h5>
                                <div className="space-y-3">
                                    {groupDetails?.members.map(member => (
                                        <div key={member.user_id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                            <div className="flex items-center">
                                                <img src={member.profile_picture || ProfileIcon} alt={member.username} className="w-8 h-8 rounded-full mr-3 object-cover" />
                                                <div>
                                                    <span className="font-medium dark:text-white">{member.username}</span>
                                                    {member.isAdmin && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-100">Admin</span>}
                                                </div>
                                            </div>
                                            {member.user_id !== userId && (
                                                <button 
                                                    onClick={() => handleMessageMember(member)}
                                                    className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                                                    title="Send Message"
                                                >
                                                    <img src={SendIcon} alt="Message" className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <button 
                                onClick={handleLeaveGroup}
                                className="w-full py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors shadow-sm"
                            >
                                Exit Group
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;

