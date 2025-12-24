import Title from "./Title"
import Logo from "../assets/Logo.png"
import ProfileIcon from "../assets/profile_icon.png"
import ThemeButton from "./ThemeButton"
import EditProfileModal from "./EditProfileModal"
import { postData } from "../api/requests"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import type { RootState } from "../store/store"
import { getData } from "../api/requests"

interface HeaderProps {
    editProfileUrl?: string;
}

const Header = ({ editProfileUrl }: HeaderProps) => {
    const navigate = useNavigate()
    const location = useLocation()
    const dispatch = useDispatch();
    const { isAuthenticated, userId } = useSelector((state: RootState) => state.auth)

    // Debug: Log authentication state
    useEffect(() => {
        console.log('isAuthenticated:', isAuthenticated, 'userId:', userId)
    }, [isAuthenticated, userId])
    const [profilePicture, setProfilePicture] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    // Check if we're on a login page
    const isLoginPage = ['/admin/login', '/club/login', '/student/login', '/login'].includes(location.pathname)

    useEffect(() => {
        const fetchProfilePicture = async () => {
            // Don't fetch if on login page or not authenticated
            if (isLoginPage || !isAuthenticated || !userId) {
                setProfilePicture(null)
                return
            }

            setLoading(true)
            try {
                const response = await getData(`/admin/profile/picture/${userId}`)
                if (response.status) {
                    setProfilePicture(response.profilePicture)
                }
            } catch (error) {
                // Error fetching profile picture
            } finally {
                setLoading(false)
            }
        }

        fetchProfilePicture()
    }, [isAuthenticated, userId, isLoginPage])

    // Handle click outside tooltip
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

    // Debug: Log profilePicture value
    useEffect(() => {
        console.log('Profile picture value:', profilePicture)
    }, [profilePicture])

    const handleEditProfile = () => {
        setShowEditModal(true)
        setShowTooltip(false)
    }

    const handleLogout = () => {
        // Call backend to clear JWT token using postData helper
        postData('/admin/logout', {})
            .finally(() => {
                // Always clear Redux state and navigate even if logout fails
                navigate('/');
                dispatch({ type: 'auth/clearAuth' });
            });
    }

    return (
        <header className="flex justify-center items-center select-none pt-1">
            <div className="flex justify-between items-center h-[10vh] w-[90%]">
                <div onClick={() => navigate("/")} className="flex items-center cursor-pointer">
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
                                {loading ? (
                                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                                ) : profilePicture ? (
                                    <img
                                        src={profilePicture}
                                        alt="Profile"
                                        className="w-10 h-10 rounded-full object-contain border-2 border-gray-300"
                                    />
                                ) : (
                                    <img
                                        src={ProfileIcon}
                                        alt="Profile"
                                        className="w-10 h-10 rounded-full object-contain border-2 border-gray-300"
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

            {/* Edit Profile Modal */}
            {isAuthenticated && userId && (
                <EditProfileModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    userId={userId}
                />
            )}
        </header>
    )
}

export default Header
