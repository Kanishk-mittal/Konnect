import Title from "./Title"
import Logo from "../assets/Logo.png"
import ProfileIcon from "../assets/profile_icon.png"
import ThemeButton from "./ThemeButton"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "../store/store"
import { getData } from "../api/requests"



const Header = () => {
    const navigate = useNavigate()
    const { isAuthenticated, userId } = useSelector((state: RootState) => state.auth)
    const [profilePicture, setProfilePicture] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchProfilePicture = async () => {
            if (isAuthenticated && userId) {
                setLoading(true)
                try {
                    const response = await getData(`/api/admin/profile/picture/${userId}`)
                    if (response.status) {
                        setProfilePicture(response.profilePicture)
                    }
                } catch (error) {
                    console.error('Error fetching profile picture:', error)
                } finally {
                    setLoading(false)
                }
            }
        }

        fetchProfilePicture()
    }, [isAuthenticated, userId])

    const handleProfileClick = () => {
        // Navigate to profile page or show profile menu
        navigate("/profile")
    }

    return (
        <header className="flex justify-center items-center select-none">
            <div className="flex justify-between items-center h-[10vh] w-[90%]">
                <div onClick={()=>navigate("/")} className="flex items-center cursor-pointer">
                    <img src={Logo} alt="Logo" className="h-18 w-18" />
                    <Title style="text-3xl md:text-4xl font-bold ml-4" />
                </div>
                <div className="flex items-center gap-4">
                    {isAuthenticated && (
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
                    )}
                    <ThemeButton height={3.5} />
                </div>
            </div>
        </header>
    )
}

export default Header
