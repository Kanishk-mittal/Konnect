import React from 'react';

interface GroupsPanelProps {
    theme: 'light' | 'dark';
    backgroundColor: string;
}

const GroupsPanel: React.FC<GroupsPanelProps> = ({
    theme,
    backgroundColor
}) => {
    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col panel-minimized" style={{ backgroundColor }}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'} panel-title`}>
                Groups
            </h2>

            <div className="panel-content">
                <div className="flex-grow">
                    <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Groups content will be displayed here
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupsPanel;