import React, { useState } from "react";

function AddRoomType({ onClose }) {
  const [formData, setFormData] = useState({
    typeName: "",
    size: "",
    maxPeople: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("✅ เพิ่มประเภทห้องใหม่:", formData);
    onClose(); // ปิด popup หลังเพิ่ม
  };

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-800">
          เพิ่มประเภทห้องพัก
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ประเภทห้อง */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              ประเภทห้อง
            </label>
            <input
              type="text"
              name="typeName"
              value={formData.typeName}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="เช่น ห้องพักรายวัน"
              required
            />
          </div>

          {/* ขนาดห้อง */}
          <div>
            <label className="block text-sm font-semibold mb-1">ขนาดห้อง</label>
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="เล็ก, กลาง, ใหญ่, อื่นๆ"
              required
            />
          </div>

          {/* จำนวนคนสูงสุด */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              จำนวนคนสูงสุด
            </label>
            <input
              type="number"
              name="maxPeople"
              value={formData.maxPeople}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="เช่น 2"
              min={1}
              required
            />
          </div>

          {/* ปุ่ม */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              เพิ่มห้อง
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddRoomType;
