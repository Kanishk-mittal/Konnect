import React from 'react';
import Split from 'react-split';

interface ThreePanelSplitLayoutProps {
    leftPanel: React.ReactNode;      // Club Members (full height)
    rightTopPanel: React.ReactNode;  // Blocked Students
    rightBottomPanel: React.ReactNode; // Groups
}

const ThreePanelSplitLayout: React.FC<ThreePanelSplitLayoutProps> = ({
    leftPanel,
    rightTopPanel,
    rightBottomPanel
}) => {
    return (
        <div className="flex-grow flex p-3 split-layout-container">
            <Split
                sizes={[65, 35]}
                minSize={[150, 150]}
                gutterSize={8}
                className="flex h-full w-full split"
            >
                {/* Left Side - Full Height */}
                <div className="h-full w-full panel-container">
                    {leftPanel}
                </div>

                {/* Right Side with Vertical Split */}
                <div className="h-full w-full">
                    <Split
                        direction="vertical"
                        sizes={[60, 40]}  // Blocked Students 60%, Groups 40%
                        minSize={[50, 50]}
                        gutterSize={6}
                        className="flex flex-col h-full w-full split"
                    >
                        {/* Top Right - Blocked Students */}
                        <div className="h-full w-full panel-container">
                            {rightTopPanel}
                        </div>

                        {/* Bottom Right - Groups */}
                        <div className="h-full w-full panel-container">
                            {rightBottomPanel}
                        </div>
                    </Split>
                </div>
            </Split>
        </div>
    );
};

export default ThreePanelSplitLayout;
