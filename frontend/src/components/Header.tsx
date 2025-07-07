import Title from "./Title"
import Logo from "../assets/Logo.png"
import ThemeButton from "./ThemeButton"


const Header = () => {
    return (
        <header className="flex justify-center items-center select-none">
            <div className="flex justify-between items-center h-[10vh] w-[90%]">
                <div className="flex items-center">
                    <img src={Logo} alt="Logo" className="h-18 w-18" />
                    <Title style="text-3xl md:text-4xl font-bold ml-4" />
                </div>
                <ThemeButton height={3.5} />
            </div>
        </header>
    )
}

export default Header
