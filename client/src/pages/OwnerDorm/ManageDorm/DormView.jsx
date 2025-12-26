import { FaPlus } from "react-icons/fa6";
import { FaRegImage } from "react-icons/fa";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../../../config/api";

function DormView() {

const navigate = useNavigate();
const [dormList, setDormList] = useState([]);
useEffect(() => {
  const fetchDorms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/dormitories/with-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setDormList(res.data);
    } catch (err) {
      console.error("❌ Error fetching dorms:", err);
    }
  };

  fetchDorms();
}, []);


  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* ปุ่มเพิ่มหอพัก */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/ownerdorm/add-dorm")}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-medium px-5 py-2 rounded-md shadow text-[1rem]"
        >
          <FaPlus size={18} />
          เพิ่มหอพัก
        </button>
      </div>

      {/* แสดงหอพักแบบ 2 คอลัมน์ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dormList.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <p className="text-gray-500 text-lg">ไม่พบข้อมูลหอพัก</p>
          </div>
        ) : (
          dormList.map((dorm) => (
          <div
            key={dorm.dorm_id}
            className="border border-gray-300 bg-white rounded-xl shadow-sm overflow-hidden"
          >
            {/* หัวข้อ */}
            <div className="flex justify-between items-center border-b border-gray-300 px-6 py-4 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-700">
                ชื่อหอ : {dorm.name}
              </h2>
              <button
                onClick={() => navigate(`/dashboard/${dorm.dorm_id}`)}
                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md"
              >
                <HiOutlineBuildingOffice2 size={20} />
                ดูข้อมูลหอพัก
              </button>
            </div>

            {/* เนื้อหา */}
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                {/* ซ้าย - ข้อมูลหอพัก */}
                <div className="flex gap-4 items-start">
                <div className="w-40 h-32 bg-gray-100 border border-gray-300 flex items-center justify-center rounded-md overflow-hidden flex-shrink-0">
                  {dorm.image_filename ? (
                    <img
                      src={`${API_URL}/uploads/${dorm.image_filename}`}
                      alt={dorm.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FaRegImage className="text-3xl mb-1" />
                      <p className="text-xs">ยังไม่มีรูปภาพ</p>
                    </div>
                  )}
                </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-bold text-base">ข้อมูลหอพัก</p>
                    <p>จำนวนชั้น: {dorm.actual_floors || 0} ชั้น</p>
                    <p>จำนวนห้องรวม: {dorm.actual_total_rooms || 0} ห้อง</p>
                    <p>ที่อยู่: {dorm.address} ต.{dorm.subdistrict || '-'} อ.{dorm.district || '-'} จ.{dorm.province || '-'}</p>
                    <p>
                      วันที่สร้าง:{" "}
                      {new Date(dorm.created_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* ขวา - สรุปสถิติ */}
                <div className="border border-gray-300 bg-white rounded-md px-5 py-5 shadow text-center w-40 h-24 flex flex-col justify-center flex-shrink-0">
                  <p className="text-2xl font-bold text-gray-900">
                    {dorm.available_rooms || 0}{" "}
                    <span className="text-xl font-normal text-gray-600">
                      / {dorm.actual_total_rooms || 0}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    ห้องว่าง / ทั้งหมด
                  </p>
                </div>
              </div>  
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DormView;
