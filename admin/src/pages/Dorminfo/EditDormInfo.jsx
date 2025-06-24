import React, { useState } from "react";

function EditDorminfo({ onClose }) {
  const [formData, setFormData] = useState({
    dormName: "A",
    phone: "099-123-4567",
    address: "123 หมู่ 5 ต.บางกระทึก อ.สามพราน จ.นครปฐม",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("📋 ข้อมูลที่กรอก:", formData);
    onClose(); // ปิด popup โดยไม่ส่งข้อมูลไปไหน
  };

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6 relative">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-800">
          แก้ไขข้อมูลหอพัก
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ชื่อตึก/หอ */}
          <div>
            <label className="block text-sm font-semibold mb-1">ชื่อตึก/หอ</label>
            <input
              type="text"
              name="dormName"
              value={formData.dormName}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          {/* เบอร์โทร */}
          <div>
            <label className="block text-sm font-semibold mb-1">เบอร์โทร</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          {/* ที่อยู่ */}
          <div>
            <label className="block text-sm font-semibold mb-1">ที่อยู่</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              rows={3}
              required
            ></textarea>
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditDorminfo;
