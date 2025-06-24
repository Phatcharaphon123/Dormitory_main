import EditButton from "../../components/buttons/EditButton";
import EditUtility from "../editform/EditUtility";
import { useNavigate } from "react-router-dom";
import { useState } from 'react';

function UtilityBills() {
  const navigate = useNavigate();
  const [openAddRoom, setOpenAddRoom] = useState();
  return (
    <div>
      {/*<div className="m-5">*/}
      <div className="bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-semibold text-blue-950  mb-4">ค่าสาธารณูปโภค</h1>
        <table className="table-auto text-left border border-gray-300 w-full">
          <thead className="bg-blue-200"> 
            <tr>
              <th className="w-[12%] px-2 py-2 border">ค่าน้ำ</th>
              <th className="w-[12%] px-2 py-2 border">ค่าไฟ</th>
              <th className="w-[16%] px-2 py-2 border">ค่าจอดรถยนต์</th>
              <th className="w-[16%] px-2 py-2 border">ค่าจอดรถมอเตอร์ไซค์</th>
              <th className="w-[16%] px-2 py-2 border">ค่าส่วนกลาง</th>
              <th className="w-[8%] px-2 py-2 border text-center">แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-2 py-2">20 บาท/หน่วย</td>
              <td className="border px-2 py-2">15 บาท/หน่วย</td>
              <td className="border px-2 py-2">300 บาท/เดือน</td>
              <td className="border px-2 py-2">100 บาท/เดือน</td>
              <td className="border px-2 py-2">500 บาท/เดือน</td>
              <td className="px-2 py-1 border text-center"><EditButton onClick={() => setOpenAddRoom(true)} /></td>
            </tr>
          </tbody>
        </table>
      </div>
      {openAddRoom && (
        <EditUtility onClose={() => setOpenAddRoom(false)} />
      )}
    </div>
  )
}

export default UtilityBills
