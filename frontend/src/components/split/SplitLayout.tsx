import React from 'react';
import Split from 'react-split';

interface SplitLayoutProps {
    leftTopPanel: React.ReactNode;      // All Students
    leftBottomPanel: React.ReactNode;   // Clubs (minimized by default)
    rightTopPanel: React.ReactNode;     // Blocked Students
    rightBottomPanel: React.ReactNode;  // Groups
}

const SplitLayout: React.FC<SplitLayoutProps> = ({
    leftTopPanel,
    leftBottomPanel,
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
                {/* Left Side with Vertical Split */}
                <div className="h-full w-full">
                    <Split
                        direction="vertical"
                        sizes={[85, 15]}  // All Students gets 85%, Clubs gets 15% (minimized)
                        minSize={[150, 50]}  // All Students min 150px, Clubs min 50px
                        gutterSize={6}
                        className="flex flex-col h-full w-full split"
                    >
                        {/* Top Left - All Students */}
                        <div className="h-full w-full panel-container">
                            {leftTopPanel}
                        </div>

                        {/* Bottom Left - Clubs (minimized by default) */}
                        <div className="h-full w-full panel-container">
                            {leftBottomPanel}
                        </div>
                    </Split>
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

export default SplitLayout;