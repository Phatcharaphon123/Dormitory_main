import React, { useState } from "react";

function AddRoom({ onClose }) {
    const [formData, setFormData] = useState({
      roomNumber: "",
      roomType: "ห้องแอร์", 
      rentalType: "รายเดือน", 
      floor: "",
      status: "",
      pricePerDay: "",
      pricePerMonth: "",
      depositPerDay: "",
      depositPerMonth: "",
    });


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("✅ เพิ่มห้องใหม่:", formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-xl rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-blue-800 text-center mb-4">
          เพิ่มห้องพักใหม่
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* หมายเลขห้อง */}
          <div>
            <label className="block text-sm font-semibold mb-1">หมายเลขห้อง</label>
            <input
              type="text"
              name="roomNumber"
              value={formData.roomNumber}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="เช่น 101"
              required
            />
          </div>

          {/* ประเภทห้อง */}
          <div>
            <label className="block text-sm font-semibold mb-1">ประเภทห้อง</label>
            <select
              name="roomType"
              value={formData.roomType}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="ห้องพัดลม">ห้องพัดลม</option>
              <option value="ห้องแอร์">ห้องแอร์</option>
              <option value="ห้อง VIP">ห้อง VIP</option>
            </select>
          </div>


          {/* ประเภทการเช่า */}
          <div>
            <label className="block text-sm font-semibold mb-1">ประเภทการเช่า</label>
            <select
              name="rentalType"
              value={formData.rentalType}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="รายวัน">รายวัน</option>
              <option value="รายเดือน">รายเดือน</option>
            </select>
          </div>


          {/* ชั้น */}
          <div>
            <label className="block text-sm font-semibold mb-1">ชั้น</label>
            <select
              name="floor"
              value={formData.floor}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">-- กรุณาเลือกชั้น --</option>
              <option value="1">ชั้น 1</option>
              <option value="2">ชั้น 2</option>
              <option value="3">ชั้น 3</option>
              <option value="4">ชั้น 4</option>
            </select>
          </div>

          {/* สถานะห้องพัก */}
          <div>
            <label className="block text-sm font-semibold mb-1">สถานะห้องพัก</label>
            <select
              name="status"
              value={formData.status || "ว่าง"}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">-- กรุณาเลือกสถานะ --</option>
              <option value="ว่าง">ว่าง</option>
            </select>
          </div>


          {/* ราคา */}
          <div className="grid grid-cols-2 gap-4">
            {formData.rentalType === "รายวัน" && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1">ราคาต่อวัน</label>
                  <input
                    type="number"
                    name="pricePerDay"
                    value={formData.pricePerDay}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">มัดจำรายวัน</label>
                  <input
                    type="number"
                    name="depositPerDay"
                    value={formData.depositPerDay}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </>
            )}

            {formData.rentalType === "รายเดือน" && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1">ราคาต่อเดือน</label>
                  <input
                    type="number"
                    name="pricePerMonth"
                    value={formData.pricePerMonth}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">มัดจำรายเดือน</label>
                  <input
                    type="number"
                    name="depositPerMonth"
                    value={formData.depositPerMonth}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </>
            )}
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

export default AddRoom;
