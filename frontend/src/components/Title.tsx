type inputType = {
  style: string;
}

const Title = (params: inputType) => {
  return (
    <>
      <div className={"flex "+params.style}>
        <div className="text-[#F26B0F]">
          KON
        </div>
        <div className='text-[#641BAA]'>
          NECT
        </div>
      </div>
    </>
  )
}

export default Title
