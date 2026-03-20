import Title from "./Title"
import Logo from "../assets/Logo.png"
import ProfileIcon from "../assets/profile_icon.png"
import ThemeButton from "./ThemeButton"
import EditProfileModal from "./EditProfileModal"
import { postData, getData } from "../api/requests"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import type { RootState, AppDispatch } from "../store/store"
import { clearAuth } from "../store/authSlice"
import { clearUser } from "../store/userSlice"
import { deletePrivateKey } from "../services/cryptoService"
import { deleteUserDatabase } from "../utils/db"


const Header = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const dispatch: AppDispatch = useDispatch();
    const { isAuthenticated, userId, userType } = useSelector((state: RootState) => state.auth)
    const { profile } = useSelector((state: RootState) => state.user);

    const [loading, setLoading] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    // Check if we're on a login page
    const isLoginPage = ['/admin/login', '/club/login', '/student/login', '/login'].includes(location.pathname)

    const fetchProfilePicture = () => {
        // No fetching needed here anymore, as the userSlice handles it.
        // We just get the picture from the profile.
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setShowTooltip(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleProfileClick = () => {
        setShowTooltip(!showTooltip)
    }

    const handleEditProfile = () => {
        setShowEditModal(true)
        setShowTooltip(false)
    }

    const handleLogout = async () => {
        if (userId) {
          // Clear the securely stored private key from IndexedDB
          await deletePrivateKey(userId);
          // Also delete the entire DB for the user for a full cleanup
          await deleteUserDatabase(userId);
        }
        // Clear Redux state for both auth and user
        dispatch(clearAuth());
        dispatch(clearUser());
        // Navigate to home
        navigate('/');
    }

    const userStatus = useSelector((state: RootState) => state.user.status);

    return (
        <header className="flex justify-center items-center select-none pt-1">
            <div className="flex justify-between items-center h-[10vh] w-[90%]">
                <div onClick={() => {
                    if (userType === 'admin') navigate('/admin/dashboard');
                    else if (userType === 'club') navigate('/club/dashboard');
                    else navigate('/');
                }} className="flex items-center cursor-pointer">
                    <img src={Logo} alt="Logo" className="h-18 object-contain" />
                    <Title style="text-3xl md:text-4xl font-bold ml-4" />
                </div>
                <div className="flex items-center gap-4">
                    {isAuthenticated && (
                        <div className="relative">
                            <div
                                onClick={handleProfileClick}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                {userStatus === 'loading' && !profile?.profilePicture ? (
                                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                                ) : profile?.profilePicture ? (
                                    <img
                                        src={profile.profilePicture}
                                        alt="Profile"
                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                                    />
                                ) : (
                                    <img
                                        src={ProfileIcon}
                                        alt="Profile"
                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                                    />
                                )}
                            </div>

                            {/* Tooltip */}
                            {showTooltip && (
                                <div
                                    ref={tooltipRef}
                                    className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-40"
                                >
                                    <button
                                        onClick={handleEditProfile}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors first:rounded-t-lg"
                                    >
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors last:rounded-b-lg text-red-600"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <ThemeButton height={3.5} />
                </div>
            </div>

            {isAuthenticated && userId && (
                <EditProfileModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    userId={userId}
                    onProfileUpdate={() => dispatch(fetchUser())}
                />
            )}
        </header>
    )
}

export default Header
