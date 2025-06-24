import { useState, useEffect } from "react";
import { FaCalendarDay } from "react-icons/fa";

function AddDayRenter({ room, onClose }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalDays, setTotalDays] = useState(0);
  const pricePerNight = room?.pricePerNight || 1200;
  const deposit = room?.deposit || 500;

  useEffect(() => {
    if (checkIn && checkOut) {
      const inDate = new Date(checkIn);
      const outDate = new Date(checkOut);
      const days = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24)));
      setTotalDays(days);
    }
  }, [checkIn, checkOut]);

  const totalPrice = totalDays * pricePerNight + deposit;

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-[900px] rounded-lg shadow-lg p-6 relative space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-green-700 flex items-center gap-2">
            <FaCalendarDay />
            เพิ่มผู้เช่ารายวัน – ห้อง {room?.roomNumber || "-"}
          </h2>
          <button
            onClick={onClose}
            className="text-red-600 border border-red-600 rounded px-3 py-1 hover:bg-red-600 hover:text-white"
          >
            ปิด
          </button>
        </div>

        {/* Form */}
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" value={room?.roomNumber} />

          <div>
            <label className="block text-sm font-medium">เลขบัตรประชาชน</label>
            <input type="text" placeholder="13 หลัก" className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium">ชื่อ-สกุล</label>
            <input type="text" placeholder="ชื่อ-นามสกุล" className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium">เบอร์โทร</label>
            <input type="tel" placeholder="เบอร์โทร" className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium">ผู้ติดต่อกรณีฉุกเฉิน</label>
            <textarea placeholder="ชื่อและเบอร์โทร" className="w-full border px-3 py-2 rounded" rows={2}></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium">วันที่เข้าพัก (Check-in)</label>
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium">วันที่ออก (Checkout)</label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium">รวม (วัน)</label>
            <input type="number" value={totalDays} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium">ค่าห้อง/คืน</label>
            <input type="number" value={pricePerNight} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium">มัดจำ</label>
            <input type="number" value={deposit} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium">รวม (บาท)</label>
            <input type="number" value={totalPrice} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">ข้อมูลรถ</label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2">
                <input type="radio" name="vehicle" value="ไม่มีรถ" /> ไม่มีรถ
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="vehicle" value="รถยนต์" /> รถยนต์
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="vehicle" value="มอเตอร์ไซค์" /> มอเตอร์ไซค์
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">ทะเบียนรถ</label>
            <input type="text" placeholder="ทะเบียนรถ *ถ้ามี" className="w-full border px-3 py-2 rounded" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">วิธีชำระเงิน</label>
            <select className="w-full border px-3 py-2 rounded">
              <option value="">-- เลือกวิธี --</option>
              <option>เงินสด</option>
              <option>โอนผ่านบัญชี</option>
              <option>QR PromptPay</option>
            </select>
          </div>

          {/* ปุ่ม */}
          <div className="md:col-span-2 flex justify-end gap-3 pt-4">
            <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded">
              เพิ่มข้อมูล
            </button>
            <button type="button" onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDayRenter;
