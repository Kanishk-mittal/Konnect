//styles
import styles from "./Landing.module.css"
//types
import type {featurePropsType} from "../components/Features"

//assets
import logo from "../assets/Logo.png"
import gatekeeper from "../assets/Gatekeeper.png"
import connectivity from "../assets/Connectivity.png"
import door from "../assets/Door.png"
import encryption from "../assets/Encryption.png"


//components
import Title from "../components/Title"
import { Link } from "react-router-dom"
import Features from "../components/Features"

// features data
const featuresData: featurePropsType[] = [
  {
    image: encryption,
    title: "End to End Encryption",
    description: "All chats are protected with end-to-end encryption using industry-standard protocols, ensuring that only the sender and recipient can read the messages — not even our servers have access to the content",
    imageSide: "right",
  },
  {
    image: connectivity,
    title: "Better communication",
    description: "Provide a unified platform for all your college-related communication in one place, offering features specifically designed for academic life like notice boards, announcements,\n and much more. . .",
    imageSide: "left"
  }
]


const Landing = () => {
  return (
    <>
      <div className={styles.bg}>
        <div className={styles.top}>
          <img className={styles.logo} src={logo} alt="" />
          <div className={styles["top-glass"]}>
            <Title style="text-4xl md:text-6xl font-bold" />
            <div className="kaushan-script-regular text-lg md:text-2xl w-4/5 md:w-1/3 text-center px-4 md:px-0">
              A single platform for every announcement, event, and conversation that matters.
            </div>
            <img className="w-[25vw] md:w-[13vw]" src={gatekeeper} />
            <div className="buttons flex flex-col md:flex-row gap-4 md:gap-6 w-full md:w-auto px-4 md:px-0 items-center">
              <Link to={"/club/login"} className="flex justify-center">
                <div className="bg-[#3C096C] text-white text-base md:text-2xl h-10 md:h-14 w-32 md:w-40 flex justify-center items-center rounded-tl-2xl rounded-b-2xl">
                  Club
                </div>
              </Link>
              <Link to={"/admin/login"} className="flex justify-center">
                <div className="bg-[#8f4cc9] text-white text-base md:text-2xl h-10 md:h-14 w-32 md:w-40 flex justify-center items-center rounded-b-2xl">
                  Admin
                </div>
              </Link>
              <Link to={"/student/login"} className="flex justify-center">
                <div className="bg-[#FF7900] text-white text-base md:text-2xl h-10 md:h-14 w-32 md:w-40 flex justify-center items-center rounded-tr-2xl rounded-b-2xl">
                  Student
                </div>
              </Link>
            </div>
          </div>
        </div>
        <div className={styles.bottom}>
          {
            featuresData.map((feature, index) => (
              <Features
                key={index}
                image={feature.image}
                title={feature.title}
                description={feature.description}
                imageSide={feature.imageSide}
              />
            ))
          }
          <div className='flex flex-col items-center w-full'>
            <div className='flex flex-col md:flex-row md:justify-between w-[90%] mx-auto items-center gap-4 md:gap-0'>
              <div className={`flex flex-col justify-center w-full md:w-[40%] gap-4 md:gap-2 text-center md:text-left order-2 md:order-none`}>
                <span className='text-2xl md:text-4xl font-extrabold italic mb-2 md:mb-3 text-white'>
                  Register your college now and experience smart and streamlined campus communication
                </span>
                <div className='text-sm md:text-lg mt-1 md:mt-2 text-white'>
                  Note :- if you are a student please contact your college administration to join us
                </div>
              </div>
                <img className='w-[60%] h-[15vh] md:w-[30%] md:h-[20vh] object-contain order-1 md:order-none' src={door} />
            </div>
          </div>
          {/* this div is just to provide a gap i know this is not a good practice but this is the easiest fix */}
          <div className="h-10" ></div>
          <Link to={"/admin/register"} className="mx-4 md:mx-28 text-center flex justify-center items-center">
            <div className="bg-[#FF7900] text-white font-bold text-lg md:text-xl py-3 px-8 rounded-lg shadow-lg w-48 md:w-60 h-12 md:h-14 flex justify-center items-center">
              Register
            </div>
          </Link>
          {/* same here*/}
          <div className="h-10" ></div>
        </div>
      </div>
    </>
  )
}

export default Landing


// #8f4cc9   this will be the bg color for third button