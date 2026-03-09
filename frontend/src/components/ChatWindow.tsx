import React, { useState, useRef, useEffect } from 'react';
import ProfileIcon from '../assets/profile_icon.png';
import SendIcon from '../assets/send.png';
import { getData } from '../api/requests';

type ChatType = 'chat' | 'announcement' | 'group';

interface Message {
    id: number;
    text: string;
    sender: 'me' | 'other';
    senderName?: string; 
}

interface ChatWindowProps {
    chatId: string;
    type: ChatType;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, type }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: 'Hello! This is a received message.', sender: 'other', senderName: 'Alice' },
        { id: 2, text: 'This is a message sent by me.', sender: 'me', senderName: 'Current User' },
        { id: 3, text: 'This is another received message in a group.', sender: 'other', senderName: 'Bob' },
        { id: 4, text: 'This is an announcement. It should be in the center.', sender: 'other', senderName: 'Admin' },
    ]);
    const [newMessage, setNewMessage] = useState('');
    
    const [chatName, setChatName] = useState<string>('');
    const [chatIcon, setChatIcon] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchChatDetails = async () => {
            if (!chatId) return;

            setLoading(true);
            setError(null);
            setChatName('');
            setChatIcon(undefined);

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
                    const res = await getData(`/groups/chat/info/${chatId}`);
                    if (res.status && res.data) {
                        name = res.data.name;
                        icon = res.data.icon;
                    } else {
                        throw new Error(res.message || 'Failed to fetch group details');
                    }
                } else if (type === 'announcement') {
                    const res = await getData(`/groups/announcement/info/${chatId}`);
                    if (res.status && res.data) {
                        name = res.data.name;
                        icon = res.data.icon;
                    } else {
                        throw new Error(res.message || 'Failed to fetch announcement details');
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


    const handleSendMessage = () => {
        if (newMessage.trim()) {
            const newMsg: Message = { id: Date.now(), text: newMessage, sender: 'me' };
            if (type !== 'chat') {
                newMsg.senderName = "Me"; // Placeholder for current user's name
            }
            setMessages([...messages, newMsg]);
            setNewMessage('');
        }
    };
    
    if (!chatId) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-lg text-gray-500 dark:text-gray-400">Select a chat to start messaging</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center p-3 border-b border-gray-300 dark:border-gray-700">
                {loading ? (
                    <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse mr-4"></div>
                ) : (
                    <img src={chatIcon || ProfileIcon} alt="Profile" className="w-10 h-10 rounded-full mr-4" />
                )}
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    {loading ? 'Loading...' : error || chatName}
                </h2>
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
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Message Input */}
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
        </div>
    );
};

export default ChatWindow;

