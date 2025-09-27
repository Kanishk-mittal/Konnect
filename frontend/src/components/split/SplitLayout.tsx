import React from 'react';
import Split from 'react-split';

interface SplitLayoutProps {
    leftPanel: React.ReactNode;
    rightTopPanel: React.ReactNode;
    rightBottomPanel: React.ReactNode;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({
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
                {/* Left Panel */}
                <div className="h-full w-full panel-container">
                    {leftPanel}
                </div>

                {/* Right Panel with Vertical Split */}
                <div className="h-full w-full">
                    <Split
                        direction="vertical"
                        sizes={[60, 40]}
                        minSize={[50, 50]}
                        gutterSize={6}
                        className="flex flex-col h-full w-full split"
                    >
                        {/* Top Right */}
                        <div className="h-full w-full panel-container">
                            {rightTopPanel}
                        </div>

                        {/* Bottom Right */}
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