export type featurePropsType = {
    image: string;
    title: string;
    description: string;
    imageSide: "left" | "right";
}

const Features = (params: featurePropsType) => {
    return (
        <div className='flex flex-col items-center w-full'>
            <div className='flex justify-between w-[90%] mx-auto'>
                {params.imageSide === "left" && (
                    <img className='w-[30%] h-[20vh] object-contain' src={params.image} alt={params.title} />
                )}
                <div className={`flex flex-col justify-center w-[40%] gap-20 ${params.imageSide === "left" ? "text-right" : "text-left"}`}>
                        <span className='text-4xl font-extrabold italic mb-3 text-[#260348] underline underline-offset-10 decoration-[#FF7900]'>{params.title}</span>
                    <div className='text-lg mt-2 text-white'>{params.description}</div>
                </div>
                {params.imageSide === "right" && (
                    <img className='w-[30%] h-[20vh] object-contain' src={params.image} alt={params.title} />
                )}
            </div>
            <div className='w-full h-[1px] bg-white mt-8'></div>
        </div>
    )
}

export default Features
