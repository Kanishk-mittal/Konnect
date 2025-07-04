export type featurePropsType = {
    image: string;
    title: string;
    description: string;
    imageSide: "left" | "right";
}

const Features = (params: featurePropsType) => {
    return (
        <div className='flex flex-col items-center w-full'>
            <div className='flex flex-col md:flex-row md:justify-between w-[90%] mx-auto items-center gap-4 md:gap-0'>
                {params.imageSide === "left" && (
                    <img className='w-[60%] h-[15vh] md:w-[30%] md:h-[20vh] object-contain order-1 md:order-none' src={params.image} alt={params.title} />
                )}
                <div className={`flex flex-col justify-center w-full md:w-[40%] gap-4 md:gap-20 ${params.imageSide === "left" ? "text-center md:text-right" : "text-center md:text-left"} order-2 md:order-none`}>
                        <span className='text-2xl md:text-4xl font-extrabold italic mb-2 md:mb-3 text-[#260348] underline underline-offset-10 decoration-[#FF7900]'>{params.title}</span>
                    <div className='text-sm md:text-lg mt-1 md:mt-2 text-white'>{params.description}</div>
                </div>
                {params.imageSide === "right" && (
                    <img className='w-[60%] h-[15vh] md:w-[30%] md:h-[20vh] object-contain order-1 md:order-none' src={params.image} alt={params.title} />
                )}
            </div>
            <div className='w-full h-[1px] bg-white mt-4 md:mt-8'></div>
        </div>
    )
}

export default Features
