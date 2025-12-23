import React, { useState } from 'react';

function DeleteRoom({ deleteTarget, onConfirm, onCancel }) {
  const [input, setInput] = useState('');

  const handleConfirm = () => {
    const confirmText = "ยืนยันการลบ";
    if (input !== confirmText) {
      alert(`กรุณาพิมพ์ "${confirmText}" เพื่อยืนยัน`);
      return;
    }
    onConfirm();
  };

  // ตรวจสอบว่าเป็นการลบหลายห้องหรือห้องเดียว
  const isMultipleDelete = deleteTarget.type === 'multiple';
  const roomsToDelete = isMultipleDelete ? deleteTarget.rooms : [{ roomNumber: deleteTarget.roomNumber, floorNumber: deleteTarget.floorNumber || 1 }];

  // จัดกลุ่มห้องตามชั้น
  const groupedRooms = roomsToDelete.reduce((acc, room) => {
    const floorNum = room.floorNumber;
    if (!acc[floorNum]) {
      acc[floorNum] = [];
    }
    acc[floorNum].push(room.roomNumber);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-10">
      <div className="bg-white rounded shadow-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-red-600">
          {isMultipleDelete ? `ยืนยันการลบ ${roomsToDelete.length} ห้อง` : 'ยืนยันการลบห้อง'}
        </h2>
        
        <div className="mb-4">
          <p className="mb-2 text-gray-700">
            {isMultipleDelete ? 'รายการห้องที่จะลบ:' : 'ห้องที่จะลบ:'}
          </p>
          <div className="bg-gray-50 p-3 rounded border max-h-40 overflow-y-auto">
            {Object.entries(groupedRooms).map(([floorNumber, roomNumbers]) => (
              <div key={floorNumber} className="mb-2 last:mb-0">
                <div className="font-semibold text-blue-700 mb-1">ชั้น {floorNumber}:</div>
                <div className="ml-4 text-gray-800">
                  {roomNumbers.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-red-600 font-medium">
            กรุณาพิมพ์ <strong>"ยืนยันการลบ"</strong> เพื่อยืนยัน:
          </p>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            placeholder="พิมพ์ ยืนยันการลบ"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            {isMultipleDelete ? `ลบ ${roomsToDelete.length} ห้อง` : 'ลบห้อง'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteRoom;