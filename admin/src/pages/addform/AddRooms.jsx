import { IoClose } from "react-icons/io5";
import SaveButton from "../../components/buttons/SaveButton";
import CancelButton from "../../components/buttons/CancelButton";

function AddRooms({ onClose }) {
  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-semibold text-blue-950 mb-2">
          ฟอร์มเพิ่มข้อมูลห้องพัก
        </h1>
        
         <hr className="border-b-2 border-gray-300 mt-4 rounded-4xl" />

        <form className="space-y-4 mt-4">
          {/* ประเภทห้อง */}
          <div className="flex items-center gap-4">
            <label className="w-32 font-semibold">ประเภทห้อง</label>
            <select className="border border-gray-300 rounded px-3 py-2 w-full">
              <option>-- เลือกข้อมูล --</option>
              <option>ห้องพักรายวัน</option>
              <option>ห้องพักรายเดือน (แอร์)</option>
              <option>ห้องพักวิวทะเล</option>
            </select>
          </div>

          {/* เลขห้อง */}
          <div className="flex items-center gap-4">
            <label className="w-32 font-semibold">เลขห้อง</label>
            <input
              type="text"
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="เลขห้อง/ชื่อห้อง"
            />
          </div>

          {/* ค่าเช่า */}
          <div className="flex items-center gap-4">
            <label className="w-32 font-semibold">ค่าเช่า/วัน/เดือน</label>
            <input
              type="number"
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="ค่าเช่า/รายวัน/รายเดือน"
            />
          </div>

          {/* มัดจำ */}
          <div className="flex items-center gap-4">
            <label className="w-32 font-semibold">มัดจำ</label>
            <input
              type="number"
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="มัดจำ"
            />
          </div>

          {/* ล่วงหน้า */}
          <div className="flex items-center gap-4">
            <label className="w-32 font-semibold">ล่วงหน้า</label>
            <input
              type="number"
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="ล่วงหน้า"
            />
          </div>

          {/* สถานะห้อง */}
          <div className="flex items-center gap-4">
            <label className="w-32 font-semibold">สถานะห้อง</label>
            <select className="border border-gray-300 rounded px-3 py-2 w-full">
              <option>-- ปกติ/ว่าง --</option>
              <option>ว่าง</option>
              <option>มีผู้เช่า</option>
            </select>
          </div>

          {/* ปุ่มเพิ่มข้อมูลและยกเลิก */}
          <div className="flex justify-end gap-2 pt-4">
            <SaveButton onClick={() => alert("ข้อมูลห้องพักถูกบันทึก")} />
            <CancelButton onClick={onClose} />
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddRooms;
