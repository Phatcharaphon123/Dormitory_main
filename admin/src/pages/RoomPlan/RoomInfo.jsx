import React from "react";
import { FaDoorOpen, FaInfoCircle, FaTags, FaMoneyBillWave } from "react-icons/fa";

function RoomInfo({ room }) {
  const isDaily = room?.rentalType === "รายวัน";

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      {/* หัวข้อ */}
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-blue-700">
          <FaDoorOpen className="text-orange-500" />
          ข้อมูลห้องพัก
        </h3>
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded">
          แก้ไข
        </button>
      </div>

      {/* หมวด: ข้อมูลทั่วไป */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
          <FaInfoCircle className="text-blue-500" />
          ข้อมูลทั่วไป
        </h4>
        <div className="grid grid-cols-1 text-sm text-gray-700 pl-6 py-2">
          <div className="grid grid-cols-[1fr_1fr]">
            <div className="bg-white">
              <div><span className="font-semibold">ชื่อห้อง:</span> ห้อง {room?.roomNumber || "-"}</div>
              <div><span className="font-semibold">ชั้น:</span> -</div>
              <div><span className="font-semibold">ประเภทห้อง:</span> ห้อง {room?.rentalType || "-"}</div>
              <div><span className="font-semibold">ขนาด:</span> {room?.size || "-"}</div>
              <div>
                <span className="font-semibold">ประเภทการเช่า:</span>{" "}
                <span className={`inline-block text-white text-xs px-2 py-0.5 rounded ${
                  isDaily ? "bg-yellow-500" : "bg-blue-600"
                }`}>
                  {room?.rentalType || "-"}
                </span>
              </div>
              <div>
                <span className="font-semibold">สถานะ:</span>{" "}
                <span className={`px-2 py-0.7 rounded text-white ${room?.status === "ว่าง" ? "bg-green-500" : "bg-red-500"}`}>
                  {room?.status || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* หมวด: ราคา */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
          <FaMoneyBillWave className="text-green-600" />
          ข้อมูลราคา
        </h4>
        <div className="grid grid-cols-1 text-sm text-gray-700 pl-6 py-2">
          <div className="grid grid-cols-[1fr_1fr]">
            <div className="bg-white">
              <div><span className="font-semibold">{isDaily ? "รายวัน" : "รายเดือน"}</span></div>
              <div><span className="font-semibold">ราคา:</span> {room?.price || "-"}</div>
              <div><span className="font-semibold">มัดจำ:</span> {room?.deposit || "-"}</div>
            </div>
            <div className="bg-white">
              <div><span className="font-semibold">ค่าน้ำ:</span> {isDaily ? "-" : "10 บาท/หน่วย"}</div>
              <div><span className="font-semibold">ค่าไฟ:</span> {isDaily ? "-" : "20 บาท/หน่วย"}</div>
              <div><span className="font-semibold">ค่าส่วนกลาง:</span> {isDaily ? "-" : "100 บาท/เดือน"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* หมวดเสริม */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
          <FaTags className="text-purple-600" />
          หมวดเสริม
        </h4>
        <div className="pl-6 text-sm text-gray-700">
          <p>ไม่มีสิทธิ์พิเศษ หรือข้อมูลเพิ่มเติม</p>
        </div>
      </div>
    </div>
  );
}

export default RoomInfo;