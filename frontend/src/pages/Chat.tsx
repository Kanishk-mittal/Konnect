// React and Redux imports
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import type { RootState } from '../store/store';

// Components
import Header from '../components/Header';

const Chat = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const { chatType, id } = useParams();

  const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]";
  const transparentClasses = "bg-transparent";

  return (
    <div className={`min-h-screen w-screen ${theme === 'dark' ? 'bg-[#0E001B]' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0]'}`}>
      <div className={`h-screen w-full ${theme === 'dark' ? transparentClasses : gradientClasses}`}>
        <Header />
        <div className="flex justify-center">
          <div className={`flex flex-col gap-6 w-11/12 h-full md:w-4/5 ${theme === 'dark' ? "bg-[#240046]" : "bg-[#FFDEA8]/45"} rounded-lg p-8`}>
            <div className={`heading ${theme === "dark" ? "text-[#FF9E00]" : "text-[#421271]"} text-2xl text-center font-bold mb-4`}>
              Chat Page
            </div>
            <div className="text-center">
              <p>Chat Type: {chatType || 'Not specified'}</p>
              <p>ID: {id || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
