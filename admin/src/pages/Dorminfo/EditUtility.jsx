import React, { useState } from "react";

function EditUtility({ onClose }) {
  const [formData, setFormData] = useState({
    waterType: "flat", // flat = เหมาจ่าย, unit = คิดตามหน่วย
    waterFlatPrice: 200,
    waterFlatLimit: 100,
    waterFlatRate: 4,
    waterUnitRate: 100,
    electricRate: 8.5,
    serviceFee: 200,
    effectiveDate: "2025-06-01",
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === "number" ? parseFloat(value) : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("📋 ข้อมูลค่าสาธารณูปโภค:", formData);
    onClose(); // ปิด popup
  };

  billingDay: "25"

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-800">
          แก้ไขข้อมูลสาธารณูปโภค
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">

        {/* ค่าน้ำ */}
        <div>
          <h3 className="text-md font-semibold mb-2 text-blue-700">ค่าน้ำ</h3>

          {/* เหมาจ่าย */}
          <div className="mb-4 border p-4 rounded bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">แบบเหมาจ่าย</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm">ราคาเหมาจ่าย</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="waterFlatPrice"
                    value={formData.waterFlatPrice}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-1"
                  />
                  <span className="ml-2 text-sm text-gray-600">บาท</span>
                </div>
              </div>
              <div>
                <label className="block text-sm">จำนวนหน่วยที่รวม</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="waterFlatLimit"
                    value={formData.waterFlatLimit}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-1"
                  />
                  <span className="ml-2 text-sm text-gray-600">หน่วย</span>
                </div>
              </div>
              <div>
                <label className="block text-sm">อัตราเกินหน่วย</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="waterFlatRate"
                    value={formData.waterFlatRate}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-1"
                  />
                  <span className="ml-2 text-sm text-gray-600">บาท/หน่วย</span>
                </div>
              </div>
            </div>
          </div>

          {/* คิดตามหน่วย */}
          <div className="border p-4 rounded bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">แบบคิดตามหน่วย</h4>
            <div>
              <label className="block text-sm">ค่าน้ำต่อหน่วย</label>
              <div className="flex items-center">
                <input
                  type="number"
                  name="waterUnitRate"
                  value={formData.waterUnitRate}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-1"
                />
                <span className="ml-2 text-sm text-gray-600">บาท/หน่วย</span>
              </div>
            </div>
          </div>
        </div>


          {/* ค่าไฟและค่าส่วนกลาง */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm">ค่าไฟ (บาท/หน่วย)</label>
            <input
              type="number"
              name="electricRate"
              value={formData.electricRate}
              onChange={handleChange}
              className="w-full border rounded px-3 py-1"
            />
          </div>
          <div>
            <label className="block text-sm">ค่าส่วนกลาง</label>
            <input
              type="number"
              name="serviceFee"
              value={formData.serviceFee}
              onChange={handleChange}
              className="w-full border rounded px-3 py-1"
            />
          </div>
          <div>
            <label className="block text-sm">วันตัดรอบบิล</label>
            <select
              name="billingDay"
              value={formData.billingDay}
              onChange={handleChange}
              className="w-full border rounded px-3 py-1"
            >
              <option value="">เลือกวัน</option>
              {[...Array(31)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  วันที่ {i + 1} ของทุกเดือน
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm">มีผลตั้งแต่</label>
            <input
              type="date"
              name="effectiveDate"
              value={formData.effectiveDate}
              onChange={handleChange}
              className="w-full border rounded px-3 py-1"
            />
          </div>
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

export default EditUtility;
