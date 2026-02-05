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
      <div>
          <div className="w-full h-40 grid grid-cols-3 gap-4 px-10 items-center">
              <div className="justify-center hidden md:flex">
                  <div className="w-[350px] h-[120px] bg-[#f1fff5] border-e-[#21b8a6] border-e-6 rounded-2xl">
                      <div className="pb-4">
                          <p className="pl-4 pt-4 text-lg text-gray-600 font-semibold font-sans text-start">Total desabilitados</p>
                          <span className="pl-4  text-5xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.inactive}
                              <UserRoundX className="ml-1 p-2 mt-4 bg-red-500 rounded-full text-white " size={45} />
                          </span>
                      </div>
                  </div>
              </div>

              <div className="justify-center hidden md:flex">
                  <div className="w-[350px] h-[120px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                      <div className="pb-4">
                          <p className="pl-4 pt-4 text-lg text-gray-600 font-semibold font-sans text-start">Total activos</p>
                          <span className="pl-4  text-5xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.active}
                              <UserRoundCheck className="ml-1 p-2 mt-4 bg-blue-500 rounded-full text-white " size={45} />
                          </span>
                      </div>
                  </div>
              </div>

              <div className="justify-center hidden md:flex">
                  <div className="w-[350px] h-[120px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                      <div className="pb-4">
                          <p className="pl-4 pt-4 text-lg text-gray-600 font-semibold font-sans text-start">Total usuarios</p>
                          <span className="pl-4  text-5xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.total}
                              <UserRound className="ml-1 p-2 mt-4 bg-[#107168b7] rounded-full text-white " size={45} />
                          </span>
                      </div>
                  </div>
              </div>
              <div className="md:hidden justify-center flex">
                  <div className="w-[250px] h-[80px] bg-[#f1fff5] border-e-[#21b8a6] border-e-6 rounded-2xl">
                      <div className="pb-4">
                          <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.inactive}
                              <UserRoundX className="ml-1 p-2 mt-4 bg-red-500 rounded-full text-white " size={45} />
                          </span>
                      </div>
                  </div>
              </div>
              <div className="justify-center flex md:hidden">
                  <div className="w-[250px] h-[80px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                      <div className="pb-4">
                          <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.active}
                              <UserRoundCheck className="ml-1 p-2 mt-4 bg-blue-500 rounded-full text-white " size={45} />
                          </span>
                      </div>
                  </div>
              </div>

              <div className="flex justify-center md:hidden">
                  <div className="w-[250px] h-[80px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                      <div className="pb-4">
                          <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                              {totals.total}
                              <UserRound className="ml-1 p-2 mt-4 bg-[#107168b7] rounded-full text-white " size={45} />
                          </span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}

export default tagUser