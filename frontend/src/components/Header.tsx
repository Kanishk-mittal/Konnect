import Title from "./Title"
import Logo from "../assets/Logo.png"
import ProfileIcon from "../assets/profile_icon.png"
import ThemeButton from "./ThemeButton"
import { useNavigate } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "../store/store"
import { getData } from "../api/requests"

interface HeaderProps {
    editProfileUrl?: string;
}

const Header = ({ editProfileUrl }: HeaderProps) => {
    const navigate = useNavigate()
    const { isAuthenticated, userId } = useSelector((state: RootState) => state.auth)
    const [profilePicture, setProfilePicture] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchProfilePicture = async () => {
            if (isAuthenticated && userId) {
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
        }

        fetchProfilePicture()
    }, [isAuthenticated, userId])

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

    const handleEditProfile = () => {
        if (editProfileUrl) {
            navigate(editProfileUrl)
        } else {
            // Fallback to prompt if no URL is provided
            const promptUrl = prompt('Enter the edit profile URL:')
            if (promptUrl) {
                navigate(promptUrl)
            }
        }
        setShowTooltip(false)
    }

    const handleLogout = () => {
        // TODO: Complete logout implementation - clear Redux state, localStorage, etc.
        setShowTooltip(false)
        navigate('/')
    }

    return (
        <header className="flex justify-center items-center select-none">
            <div className="flex justify-between items-center h-[10vh] w-[90%]">
                <div onClick={()=>navigate("/")} className="flex items-center cursor-pointer">
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
        </header>
    )
}

export default Header
