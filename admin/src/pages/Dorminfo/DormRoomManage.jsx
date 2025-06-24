import { IoBuild } from "react-icons/io5";
import { FaPlus } from "react-icons/fa6";
import AddDorm from "../addform/AddDormTest";
import { useState } from "react";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";


function DormManage() {
  const [openAddDorm, setOpenAddDorm] = useState(false); // 
  const onCloseAddDorm = () => setOpenAddDorm(false); // 
  const navigate = useNavigate();
  return (
    <div className="m-5">
        <div className="text-2xl flex-1 bg-blue-900 p-3 rounded shadow-md mb-4">
          <div className="flex justify-center items-center">
            <IoBuild size={20} className="text-white mr-2" />
            <h1 className="font-semibold text-white">จัดการข้อมูลหอพักและห้องพัก</h1>
          </div>
        </div>
  

      <div className="bg-white p-3 rounded shadow-md mb-4 ">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-blue-950">เลือกตึก/หอพัก</h2>

            <select
              className="border border-gray-300 rounded px-3 py-[6px] w-64 text-sm focus:outline-none"
            >
              <option value="">ทั้งหมด</option>
              <option>ตึก 1</option>
              <option>ตึก 2</option>
              <option>ตึก 3</option>
            </select>

            <button
              onClick={() => setOpenAddDorm(true)}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 cursor-pointer text-white font-medium px-3 py-[6px] rounded shadow text-sm"
            >
              <FaPlus size={20} />
              เพิ่มตึก/หอพัก
            </button>
          </div>

        </div>
      </div>

      <div className="border border-gray-300 rounded overflow-hidden shadow-md mb-4">
        {/* Header */}
        <div className=" border-b border-gray-300  px-4 py-3 flex justify-between items-center">
          <p className=" text-xl font-bold text-blue-900">ชื่อตึก/หอ : A</p>
          <button 
            onClick={() => navigate("/dorm-info")}
            className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-3 py-2 rounded flex items-center gap-1">
            <HiOutlineBuildingOffice2 size={20} />
            ดูข้อมูลหอพัก/แก้ไข
          </button>
        </div>

        {/* Body (ข้อมูลเพิ่มเติมของหอ) */}
      <div className="bg-white px-4 py-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 text-sm text-gray-700">
          
          {/* ข้อมูลหอพัก */}
          <div className="space-y-1 break-words">
            <p><span className="font-bold text-[1rem]">ข้อมูลหอพัก</span></p>
            <p>จำนวนชั้น: 4 ชั้น</p>
            <p>จำนวนห้องรวม: 20 ห้อง</p>
            <p>เบอร์โทร: 099-123-4567</p>
            <p>ที่อยู่: 123 หมู่ 5 ต.บางกระทึก อ.สามพราน จ.นครปฐม</p>
            <p>วันที่สร้าง: 15 มิ.ย. 2568</p>
          </div>

          {/* ข้อมูลค่าสาธารณูปโภค */}
          <div className="space-y-1 break-words">
            <p className="font-bold text-[1rem]">ข้อมูลค่าสาธารณูปโภค</p>
            <p>ค่าน้ำ: 18 บาท/หน่วย</p>
            <p>ค่าไฟ: 8.5 บาท/หน่วย</p>
            <p>ค่าส่วนกลาง: 200 บาท</p>
            <p>มีผลตั้งแต่: 1 มิ.ย. 2568</p>
          <p className="font-bold text-[1rem] mt-3">วันตัดรอบบิล</p>
            <p>วันที่: 25 ของทุกเดือน</p>
          </div>

        </div>
      </div>
      </div>

            <div className="border border-gray-300 rounded overflow-hidden shadow-md mb-4">
        {/* Header */}
        <div className=" border-b border-gray-300  px-4 py-3 flex justify-between items-center">
          <p className=" text-xl font-bold text-blue-900">ชื่อตึก/หอ : A</p>
          <button 
            onClick={() => navigate("/edit-dorm-test")}
            className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-3 py-2 rounded flex items-center gap-1">
            <HiOutlineBuildingOffice2 size={20} />
            ดูข้อมูลหอพัก/แก้ไข
          </button>
        </div>

        {/* Body (ข้อมูลเพิ่มเติมของหอ) */}
      <div className="bg-white px-4 py-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 text-sm text-gray-700">
          
          {/* ข้อมูลหอพัก */}
          <div className="space-y-1 break-words">
            <p><span className="font-bold text-[1rem]">ข้อมูลหอพัก</span></p>
            <p>จำนวนชั้น: 4 ชั้น</p>
            <p>จำนวนห้องรวม: 20 ห้อง</p>
            <p>เบอร์โทร: 099-123-4567</p>
            <p>ที่อยู่: 123 หมู่ 5 ต.บางกระทึก อ.สามพราน จ.นครปฐม</p>
            <p>วันที่สร้าง: 15 มิ.ย. 2568</p>
          </div>

          {/* ข้อมูลค่าสาธารณูปโภค */}
          <div className="space-y-1 break-words">
            <p className="font-bold text-[1rem]">ข้อมูลค่าสาธารณูปโภค</p>
            <p>ค่าน้ำ: 18 บาท/หน่วย</p>
            <p>ค่าไฟ: 8.5 บาท/หน่วย</p>
            <p>ค่าส่วนกลาง: 200 บาท</p>
            <p>มีผลตั้งแต่: 1 มิ.ย. 2568</p>
          <p className="font-bold text-[1rem] mt-3">วันตัดรอบบิล</p>
            <p>วันที่: 25 ของทุกเดือน</p>
          </div>

        </div>
      </div>
      
      </div>

      {openAddDorm && <AddDorm onClose={onCloseAddDorm} />}
    </div>
  );
}

export default DormManage;
