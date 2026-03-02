import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const EditGroupPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const theme = useSelector((state: RootState) => state.theme.theme);

    const chatGroupId = searchParams.get('chatGroupId');
    const announcementGroupId = searchParams.get('announcementGroupId');

    const containerBg = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
    const textColor = theme === 'dark' ? 'text-white' : 'text-black';

    return (
        <div className={`min-h-screen ${containerBg} ${textColor}`}>
            <Header />
            <main className="flex flex-col items-center justify-center pt-10">
                <h1 className="text-4xl font-bold mb-6">Edit Group</h1>
                <div className="p-6 rounded-lg shadow-md text-lg space-y-2">
                    {chatGroupId && (
                        <p>
                            <span className="font-semibold">Chat Group ID:</span> {chatGroupId}
                        </p>
                    )}
                    {announcementGroupId && (
                        <p>
                            <span className="font-semibold">Announcement Group ID:</span> {announcementGroupId}
                        </p>
                    )}
                    {!chatGroupId && !announcementGroupId && (
                        <p>No group ID provided.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default EditGroupPage;
