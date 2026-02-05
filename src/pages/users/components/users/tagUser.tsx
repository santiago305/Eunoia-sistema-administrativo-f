import { UserRound, UserRoundCheck, UserRoundX } from 'lucide-react';


interface Props {
    totals: {
        inactive: number,
        active: number,
        total:number
    }
}
const tagUser = ({totals}: Props ) => {
  return (
          <div className="w-full flex justify-center">
            <div className="
                grid grid-cols-1 md:grid-cols-3
                gap-2 md:gap-15 mt-2 mb-5
                justify-items-center
                max-w-4xl
                "
            >

              <div className="justify-center hidden md:flex">
                  <div className="w-[250px] h-[100px] bg-[#f1fff5] border-e-[#21b8a6] border-e-6 rounded-2xl">
                      <div className="pb-4">
                          <p className="pl-4 pt-3 text-md text-gray-600 font-semibold font-sans text-start">Total desabilitados</p>
                          <span className="pl-4  text-3xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.inactive}
                              <UserRoundX className="ml-1 p-2 mt-4 bg-red-500 rounded-full text-white " size={39} />
                          </span>
                      </div>
                  </div>
              </div>

              <div className="justify-center hidden md:flex">
                  <div className="w-[250px] h-[100px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                      <div className="pb-4">
                          <p className="pl-4 pt-3 text-md text-gray-600 font-semibold font-sans text-start">Total activos</p>
                          <span className="pl-4  text-3xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.active}
                              <UserRoundCheck className="ml-1 p-2 mt-4 bg-blue-500 rounded-full text-white " size={39} />
                          </span>
                      </div>
                  </div>
              </div>

              <div className="justify-center hidden md:flex">
                  <div className="w-[250px] h-[100px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                      <div className="pb-4">
                          <p className="pl-4 pt-3 text-md text-gray-600 font-semibold font-sans text-start">Total usuarios</p>
                          <span className="pl-4  text-3xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.total}
                              <UserRound className="ml-1 p-2 mt-4 bg-[#107168b7] rounded-full text-white " size={39} />
                          </span>
                      </div>
                  </div>
              </div>
              <div className="md:hidden justify-center flex">
                  <div className="w-[250px] h-[80px] bg-[#f1fff5] border-e-[#21b8a6] border-e-6 rounded-2xl">
                      <div className="pb-4">
                          <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.inactive}
                              <UserRoundX className="ml-1 p-2 mt-4 bg-red-500 rounded-full text-white " size={39} />
                          </span>
                      </div>
                  </div>
              </div>
              <div className="justify-center flex md:hidden">
                  <div className="w-[250px] h-[80px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                      <div className="pb-4">
                          <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.active}
                              <UserRoundCheck className="ml-1 p-2 mt-4 bg-blue-500 rounded-full text-white " size={39} />
                          </span>
                      </div>
                  </div>
              </div>

              <div className="flex justify-center md:hidden">
                  <div className="w-[250px] h-[80px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                      <div className="pb-4">
                          <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.total}
                              <UserRound className="ml-1 p-2 mt-4 bg-[#107168b7] rounded-full text-white " size={39} />
                          </span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}

export default tagUser