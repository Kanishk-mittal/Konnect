import { useSelector, useDispatch } from 'react-redux';
import { setTheme } from '../store/themeSlice';
import type { RootState } from '../store/store';
import Sun from '../assets/Sun.png';
import Moon from '../assets/Moon.png';

interface ThemeButtonProps {
    height: number; // height in vh units
}

const ThemeButton = ({ height }: ThemeButtonProps) => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const dispatch = useDispatch();

    const toggleTheme = () => {
        dispatch(setTheme(theme === 'light' ? 'dark' : 'light'));
    };

    const backgroundWidth = height * 2;
    const buttonRadius = height;

    return (
        <div
            className={`relative flex items-center cursor-pointer transition-colors duration-300 ${
                theme === 'light' ? 'bg-[#FCAE67]' : 'bg-[#361952]'
            }`}
            style={{
                height: `${height}vh`,
                width: `${backgroundWidth}vh`,
                borderRadius: `${height / 2}vh`,
            }}
            onClick={toggleTheme}
        >
            <div
                className={`absolute flex items-center justify-center rounded-full transition-all duration-300 ${
                    theme === 'light' ? 'bg-[#FF7900] left-0' : 'bg-[#0E001B] right-0'
                }`}
                style={{
                    width: `${buttonRadius}vh`,
                    height: `${buttonRadius}vh`,
                }}
            >
                <img
                    src={theme === 'light' ? Sun : Moon}
                    alt={theme === 'light' ? 'Sun' : 'Moon'}
                    className="w-3/4 h-3/4 object-contain"
                />
            </div>
        </div>
    );
};

export default ThemeButton;
