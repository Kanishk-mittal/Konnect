import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import Header from '../components/Header';

const NotFound = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const navigate = useNavigate();
  const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]";
  const transparentClasses = "bg-transparent";

  return (
    <div className={`min-h-[100vh] w-[100vw] ${theme === 'dark' ? 'bg-[#0E001B]' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0]'}`}>
      <div className={`h-full w-full ${theme === 'dark' ? transparentClasses : gradientClasses}`}>
        <Header />
        <div className="flex flex-col justify-center items-center h-[80vh]">
          <div className={`flex flex-col gap-8 w-[90%] max-w-3xl items-center justify-center ${theme === 'dark' ? "bg-[#240046]/70" : "bg-[#FFDEA8]/60"} rounded-xl p-12 backdrop-blur-md`}>
            
            {/* 404 Number */}
            <div className={`text-[10rem] font-bold leading-none ${theme === 'dark' ? 'text-[#FF7900]' : 'text-[#5A189A]'} drop-shadow-lg`}>
              404
            </div>
            
            {/* Message */}
            <div className={`text-4xl font-bold text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-[#421271]'}`}>
              Oops! Page Not Found
            </div>
            
            <div className={`text-xl text-center max-w-lg ${theme === 'dark' ? 'text-gray-300' : 'text-[#421271]/80'}`}>
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </div>
            
            {/* Decorative Element */}
            <div className="w-24 h-1 rounded-full my-2 bg-gradient-to-r from-yellow-400 to-purple-500"></div>
            
            {/* Back to Home Button */}
            <button
              onClick={() => navigate('/')}
              className={`mt-6 px-8 py-4 text-lg text-white font-semibold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                theme === 'dark' 
                  ? 'bg-[#FF7900] hover:bg-[#E86C00]' 
                  : 'bg-[#5A189A] hover:bg-[#4C1184]'
              }`}
            >
              Back to Home
            </button>
            
            {/* Optional SVG for decoration - simplified lost illustration */}
            <div className="mt-4 opacity-60">
              <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60 10C37.909 10 20 27.909 20 50H100C100 27.909 82.091 10 60 10Z" 
                      fill={theme === 'dark' ? '#FF7900' : '#5A189A'} opacity="0.5" />
                <path d="M45 35C45 38.866 41.866 42 38 42C34.134 42 31 38.866 31 35C31 31.134 34.134 28 38 28C41.866 28 45 31.134 45 35Z" 
                      fill={theme === 'dark' ? '#FF7900' : '#5A189A'} />
                <path d="M89 35C89 38.866 85.866 42 82 42C78.134 42 75 38.866 75 35C75 31.134 78.134 28 82 28C85.866 28 89 31.134 89 35Z" 
                      fill={theme === 'dark' ? '#FF7900' : '#5A189A'} />
                <path d="M60 45C53.373 45 48 40.627 48 34H72C72 40.627 66.627 45 60 45Z" 
                      fill={theme === 'dark' ? '#FFFFFF' : '#421271'} opacity="0.7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
