import React from 'react';

interface GroupsClubsPanelProps {
    selectedTab: 'Groups' | 'Clubs';
    setSelectedTab: (tab: 'Groups' | 'Clubs') => void;
    theme: 'light' | 'dark';
    bottomRightSectionColor: string;
}

const GroupsClubsPanel: React.FC<GroupsClubsPanelProps> = ({
    selectedTab,
    setSelectedTab,
    theme,
    bottomRightSectionColor
}) => {
    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col panel-minimized" style={{ backgroundColor: bottomRightSectionColor }}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'} panel-title`}>
                {selectedTab}
            </h2>

            <div className="panel-content">
                {/* Sliding Tab Selector */}
                <div className="flex justify-center mb-4">
                    <div className="flex relative rounded-lg p-1 w-[97%] justify-around" style={{
                        backgroundColor: theme === 'dark' ? '#111827' : 'rgba(255,158,0,0.4)'
                    }}>
                        {/* Groups Tab */}
                        <button
                            onClick={() => setSelectedTab('Groups')}
                            className={`px-6 py-2 rounded-md font-medium transition-all duration-300 relative ${selectedTab === 'Groups'
                                ? `${theme === 'dark' ? 'text-white' : 'text-black'} font-bold`
                                : `${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
                                }`}
                        >
                            Groups
                            {selectedTab === 'Groups' && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                                    style={{
                                        backgroundColor: theme === 'dark' ? '#FFA4A4' : '#FF0404'
                                    }}
                                />
                            )}
                        </button>

                        {/* Clubs Tab */}
                        <button
                            onClick={() => setSelectedTab('Clubs')}
                            className={`px-6 py-2 rounded-md font-medium transition-all duration-300 relative ${selectedTab === 'Clubs'
                                ? `${theme === 'dark' ? 'text-white' : 'text-black'} font-bold`
                                : `${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
                                }`}
                        >
                            Clubs
                            {selectedTab === 'Clubs' && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                                    style={{
                                        backgroundColor: theme === 'dark' ? '#FFA4A4' : '#FF0404'
                                    }}
                                />
                            )}
                        </button>
                    </div>
                </div>

                {/* Content based on selected tab */}
                <div className="flex-grow">
                    {selectedTab === 'Groups' ? (
                        <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Groups content will be displayed here
                        </div>
                    ) : (
                        <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Clubs content will be displayed here
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupsClubsPanel;