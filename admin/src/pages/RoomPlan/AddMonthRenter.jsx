import { FaCalendarAlt } from "react-icons/fa";

function AddMonthRenter({ room, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-[1000px] rounded-lg shadow-lg p-6 relative">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-700 flex items-center gap-2">
            <FaCalendarAlt />
            เพิ่มผู้เช่ารายเดือน – ห้อง {room?.roomNumber || "-"}
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
          {/* คอลัมน์ซ้าย */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">เลขบัตรประชาชน</label>
              <input type="text" placeholder="13 หลัก" className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">ชื่อ-สกุล</label>
              <input type="text" placeholder="ชื่อ-นามสกุล" className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">เพศ</label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2">
                  <input type="radio" name="gender" value="ชาย" />
                  ชาย
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="gender" value="หญิง" />
                  หญิง
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="gender" value="อื่นๆ" />
                  อื่นๆ
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">วันเกิด</label>
              <input type="date" className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">เบอร์โทร</label>
              <input type="tel" placeholder="เบอร์โทร 10 หลัก" className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">อาชีพ / สถานะ</label>
              <input type="text" placeholder="นักศึกษา / พนักงาน / อื่นๆ" className="w-full border px-3 py-2 rounded" />
            </div>
          </div>

          {/* คอลัมน์ขวา */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">ผู้ติดต่อกรณีฉุกเฉิน</label>
              <textarea placeholder="ชื่อและเบอร์โทร" className="w-full border px-3 py-2 rounded" rows={3}></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium">วันที่เข้าพัก</label>
              <input type="date" className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">ข้อมูลรถ</label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2">
                  <input type="radio" name="vehicle" value="ไม่มีรถ" />
                  ไม่มีรถ
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="vehicle" value="รถยนต์" />
                  รถยนต์
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="vehicle" value="มอเตอร์ไซค์" />
                  มอเตอร์ไซค์
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">ทะเบียนรถ</label>
              <input type="text" placeholder="ทะเบียนรถ *ถ้ามี" className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">หมายเหตุเพิ่มเติม</label>
              <textarea placeholder="ระบุหมายเหตุ..." className="w-full border px-3 py-2 rounded" rows={2}></textarea>
            </div>
          </div>

          {/* ปุ่ม */}
          <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              เพิ่มข้อมูล
            </button>
            <button type="button" onClick={onClose} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddMonthRenter;
