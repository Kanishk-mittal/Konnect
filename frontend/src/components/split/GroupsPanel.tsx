import React from 'react';
import type { NavigateFunction } from 'react-router-dom';

interface GroupsPanelProps {
    theme: 'light' | 'dark';
    backgroundColor: string;
    navigate: NavigateFunction;
}

const GroupsPanel: React.FC<GroupsPanelProps> = ({
    theme,
    backgroundColor,
    navigate
}) => {
    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col panel-minimized overflow-hidden" style={{ backgroundColor }}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'} panel-title`}>
                Groups
            </h2>

            <div className="panel-content flex flex-col flex-grow overflow-hidden">
                <div className="flex-grow overflow-y-auto min-h-0 student-list-container">
                    <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Groups content will be displayed here
                    </div>
                </div>

                <div className="groupControlButtons flex gap-3 mt-4 justify-center">
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#22C55E' }}
                        onClick={() => navigate('/admin/add-group')}
                    >
                        Add Group
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupsPanel;