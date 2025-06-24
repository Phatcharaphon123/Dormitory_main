import { IoBuild } from "react-icons/io5";
import BackButton from "../../components/buttons/BackButton";
import RoomTypesTableOnly from "./RoomTypes";
import MapWithControl from "./MapWithControl";
import Roomlist from "./Roomlist";
import EditDormInfo from "./EditDormInfo";
import EditUtility from "./EditUtility";
import AddRoomType from "./AddRoomType";
import { useState } from "react";



function DormInfo() {
  const [openEditDorm, setOpenEditDorm] = useState(false);
  const [openEditUtility, setOpenEditUtility] = useState(false);
 

  return (
    <div className="m-5">
      <div className="flex items-center mb-4 gap-4">
        <BackButton onClick={() => window.history.back()} />
        <div className="flex-1 bg-blue-900 p-2 rounded shadow-md">
          <div className="flex justify-center">
            <IoBuild size={20} className="text-white mr-2" />
            <h1 className="font-semibold text-white">
              แก้ไขข้อมูลหอพักและห้องพัก
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 h-full gap-y-4">
        <div className=" grid grid-cols-[1fr_2fr] gap-4">
          <div className="border border-gray-300 p-5 rounded shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-blue-800 font-bold text-lg">ข้อมูลหอพัก</h2>
                <button
                  onClick={() => setOpenEditDorm(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-1 rounded text-sm"
                >
                  แก้ไข
                </button>
            </div>
            <div className="bg-white rounded p-4 text-sm text-slate-700 shadow-inner">
              <p className="mb-1">
                <span className="font-semibold">ชื่อตึก/หอ:</span> A
              </p>
              <p className="mb-1">
                <span className="font-semibold">จำนวนชั้น:</span> 4 ชั้น
              </p>
              <p className="mb-1">
                <span className="font-semibold">จำนวนห้องรวม:</span> 20 ห้อง
              </p>
              <p className="mb-1">
                <span className="font-semibold">เบอร์โทร:</span> 099-123-4567
              </p>
              <p className="mb-1">
                <span className="font-semibold">ที่อยู่:</span> 123 หมู่ 5
                ต.บางกระทึก อ.สามพราน จ.นครปฐม
              </p>
              <p>
                <span className="font-semibold">วันที่สร้าง:</span> 15 มิ.ย.
                2568
              </p>
            </div>
          </div>
          {/* ----------------------------------------------------------------------------------------------------------------------- */}
          <div className="border border-gray-300 p-5 rounded shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-blue-800 font-bold text-lg">
                ข้อมูลสาธารณูปโภค
              </h2>
              <button 
              onClick={() => setOpenEditUtility(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-1 rounded text-sm">
                แก้ไข
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ค่าน้ำฝั่งซ้าย */}
              <div className="bg-white rounded p-4 text-sm text-slate-700 shadow-inner">
                {/* เหมาจ่าย */}
                <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold">ค่าน้ำ</p>
                  <label className="flex items-center gap-2">
                    <span className="text-gray-700">เหมาจ่าย</span>
                    <input
                      type="radio"
                      name="waterType"
                      value="flat"
                      className="accent-blue-600"
                    />
                  </label>
                </div>
                <div className="space-y-1 ml-2">
                  <p>
                    เหมาจ่ายคนละ: <span className="ml-2">200 บาท</span>
                  </p>
                  <p>
                    ถ้าเกิน: <span className="ml-2">100 หน่วย</span> จ่าย{" "}
                    <span className="ml-2">4 บาท/หน่วย</span>
                  </p>
                </div>

                <hr className="my-3" />

                {/* คิดตามหน่วย */}
                <div className="flex justify-between items-center">
                  <p className="font-semibold">ค่าน้ำ</p>
                  <label className="flex items-center gap-2">
                    <span className="text-gray-700">คิดตามหน่วย</span>
                    <input
                      type="radio"
                      name="waterType"
                      value="unit"
                      className="accent-blue-600"
                    />
                  </label>
                </div>
                <div className="ml-2 mt-1">
                  <p>
                    ค่าน้ำ: <span className="ml-2">100 บาท/หน่วย</span>
                  </p>
                </div>
              </div>

              {/* ค่าไฟฝั่งขวา */}
              <div className="bg-white rounded p-4 text-sm text-slate-700 shadow-inner">
                <p className="mb-2">
                  <span className="font-semibold">ค่าไฟ:</span> 8.5 บาท/หน่วย
                </p>
                <p className="mb-2">
                  <span className="font-semibold">ค่าส่วนกลาง:</span> 200 บาท/เดือน
                </p>
                <p className="mb-2">
                  <span className="font-semibold">มีผลตั้งแต่:</span> 1 มิ.ย. 2568
                </p>
                <p className="mb-2">
                  <span className="font-semibold">วันตัดรอบบิล:</span> 25 ของทุกเดือน
                </p>

    
              </div>
            </div>
          </div>
          {/* ----------------------------------------------------------------------------------------------------------------------- */}
          <div className="border border-gray-300 p-5 rounded shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-blue-800 font-bold text-lg">แผนที่</h2>
            </div>
            <div className="relative z-0">
              <MapWithControl />
            </div>
            
          </div>
          {/* ----------------------------------------------------------------------------------------------------------------------- */}
          <div className="border border-gray-300 p-5 rounded shadow-md">
            <h2 className="text-blue-800 font-bold text-lg mb-4">
              ประเภทห้องพัก
            </h2>
            <RoomTypesTableOnly />
          </div>
        </div>
        {/* ----------------------------------------------------------------------------------------------------------------------- */}

        <div className="border border-gray-300 p-5 rounded shadow-md">
          <Roomlist />
        </div>
      
      </div>
      {openEditDorm && <EditDormInfo onClose={() => setOpenEditDorm(false)} />}
      {openEditUtility && <EditUtility onClose={() => setOpenEditUtility(false)} />}
    </div>
  );
}

export default DormInfo;
