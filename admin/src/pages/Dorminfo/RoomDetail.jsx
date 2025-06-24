import React from "react";

function RoomDetail({ onClose }) {
  const room = {
    number: "101",
    type: "ห้องแอร์",
    floor: "ชั้น 1",
    size: "24 ตร.ม.",
    rentalType: "รายเดือน",
    price: "3,000",
    deposit: "1,000",
    status: "ไม่ว่าง"
  };

  const renter = {
    name: "นายสมชาย ใจดี",
    phone: "089-123-4567",
    line: "@somchai",
    startDate: "1 มิ.ย. 2567",
    endDate: "31 พ.ค. 2568",
    lastPayment: "3,000 บาท (1 มิ.ย. 2567)"
  };

  const hasRenter = room.status !== "ว่าง";

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-bold mb-2">รายละเอียดห้องพัก ห้อง {room.number}</h2>

        {/* ข้อมูลห้องโดยละเอียด */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-700">ข้อมูลห้อง</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-800">
            <p><span className="font-bold">ชั้น:</span> {room.floor}</p>
            <p><span className="font-bold">ประเภทห้อง:</span> {room.type}</p>
            <p><span className="font-bold">ขนาด:</span> {room.size}</p>
            <p><span className="font-bold">ประเภทการเช่า:</span> {room.rentalType}</p>
            <p><span className="font-bold">ราคา:</span> {room.price} บาท</p>
            <p><span className="font-bold">มัดจำ:</span> {room.deposit} บาท</p>
            <p><span className="font-bold">สถานะ:</span> 
              <span className={`ml-1 px-2 py-0.5 rounded text-white text-xs ${
                room.status === "ว่าง" ? "bg-green-500" : "bg-red-500"
              }`}>
                {room.status}
              </span>
            </p>
          </div>
        </div>

        {/* ข้อมูลผู้เช่า */}
        {hasRenter && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-700">ข้อมูลผู้เช่า</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-800">
              <p><span className="font-bold">ชื่อ:</span> {renter.name}</p>
              <p><span className="font-bold">เบอร์โทร:</span> {renter.phone}</p>
              <p><span className="font-bold">เริ่มเช่า:</span> {renter.startDate}</p>
              <p><span className="font-bold">สิ้นสุดสัญญา:</span> {renter.endDate}</p>
              <p><span className="font-bold">ชำระล่าสุด:</span> {renter.lastPayment}</p>
            </div>
          </div>
        )}

        {/* ปุ่มปิด */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomDetail;
