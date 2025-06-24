import React, { useState } from "react";

function EditRoom({ onClose }) {
  const [hasRenter, setHasRenter] = useState(true);

  const [roomNumber, setRoomNumber] = useState("101");
  const [roomType, setRoomType] = useState("ห้องแอร์");
  const [rentalType, setRentalType] = useState("รายเดือน");
  const [price, setPrice] = useState("3000");
  const [deposit, setDeposit] = useState("1000");
  const [status, setStatus] = useState("ไม่ว่าง");

  const isDisabled = hasRenter;

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 relative space-y-4">
        <h2 className="text-xl font-bold mb-1">ข้อมูลห้องพัก ห้อง {roomNumber}</h2>

        {hasRenter && (
          <p className="text-red-600 font-medium mb-2">
            ไม่สามารถแก้ไขได้ เนื่องจากมีผู้เช่าอยู่แล้ว
          </p>
        )}

        {/* กล่องข้อมูลแบบ 2 คอลัมน์ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">หมายเลขห้อง:</label>
            <input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              disabled={isDisabled}
              className="w-full border px-3 py-2 rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-medium">ประเภทห้อง:</label>
            <input
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              disabled={isDisabled}
              className="w-full border px-3 py-2 rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-medium">ประเภทการเช่า:</label>
            <input
              value={rentalType}
              onChange={(e) => setRentalType(e.target.value)}
              disabled={isDisabled}
              className="w-full border px-3 py-2 rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-medium">ราคา:</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isDisabled}
              className="w-full border px-3 py-2 rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-medium">มัดจำ:</label>
            <input
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              disabled={isDisabled}
              className="w-full border px-3 py-2 rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-medium">สถานะ:</label>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isDisabled}
              className="w-full border px-3 py-2 rounded bg-gray-100"
            />
          </div>
        </div>

        {/* ปุ่มควบคุม */}
        <div className="flex justify-between items-center pt-6">
          <div className="space-x-2">
            <button
              onClick={() => setHasRenter(true)}
              className={`px-4 py-2 rounded border ${
                hasRenter ? "bg-red-600 text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              มีผู้เช่า
            </button>
            <button
              onClick={() => setHasRenter(false)}
              className={`px-4 py-2 rounded border ${
                !hasRenter ? "bg-green-600 text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              ไม่มีผู้เช่า
            </button>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            {!hasRenter && (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                บันทึก
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditRoom;
