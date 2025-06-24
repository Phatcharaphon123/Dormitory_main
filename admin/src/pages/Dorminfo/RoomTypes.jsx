import { useState } from "react";
import roomTypesTestData from "../../assets/RoomtypeTestData";
import PaginationControls from "../../components/table/PaginationControls";
import PaginationInfo from "../../components/table/PaginationInfo";
import SearchBox from "../../components/table/SearchBox";
import EditButton from "../../components/buttons/EditButton";
import DeleteButton from "../../components/buttons/DeleteButton";
import EditRoomType from "./EditRoomType";
import AddRoomType from "./AddRoomType";
import { FaPlus } from "react-icons/fa";


function RoomTypesTableOnly() {
  const [roomTypes] = useState(roomTypesTestData);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(3);

  const filteredRoomTypes = roomTypes.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentRoomTypes = filteredRoomTypes.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredRoomTypes.length / entriesPerPage);

  const [openAddRoom, setOpenAddRoom] = useState(false);
  const [editData, setEditData] = useState(null);

  return (
    <div className="bg-white p-4 rounded overflow-x-auto">
      {/* Search + Pagination */}
      <div className="flex justify-between items-center mb-4 flex-wrap">
        <button
          onClick={() => setOpenAddRoom(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 cursor-pointer text-white font-medium px-3 py-[6px] rounded shadow text-sm"
        >
          <FaPlus size={20} />
          เพิ่มประเภทห้องพัก
        </button>

        <SearchBox
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {/* Table */}
      <table className="table-auto text-left border border-gray-300 w-full">
        <thead className="bg-blue-200">
          <tr>
            <th className="w-[5%] px-2 py-2 border text-center">No.</th>
            <th className="w-[25%] px-2 py-2 border">ประเภทห้อง</th>
            <th className="w-[15%] px-2 py-2 border">ขนาด</th>
            <th className="w-[15%] px-2 py-2 border">จำนวนคนสูงสุด</th>
            <th className="w-[15%] px-2 py-2 border text-center">แก้ไข</th>
            <th className="w-[15%] px-2 py-2 border text-center">ลบ</th>
          </tr>
        </thead>
        <tbody>
          {currentRoomTypes.map((room, index) => (
            <tr
              key={room.id}
              className={index % 2 === 1 ? "bg-white" : "bg-gray-100"}
            >
              <td className="border px-2 py-2 text-center">{room.id}</td>
              <td className="border px-2 py-2">{room.name}</td>
              <td className="border px-2 py-2"></td>
              <td className="border px-2 py-2"></td>
              <td className="border px-2 py-1 text-center">
                <EditButton onClick={() =>
                setEditData({ typeName: "ห้องพักรายเดือน", size: "3x3", maxPeople: 2 })} />
              </td>
              <td className="border px-2 py-1 text-center">
                <DeleteButton onClick={() => console.log("delete", room.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 flex-wrap">
        <PaginationInfo
          indexOfFirst={indexOfFirst}
          indexOfLast={indexOfLast}
          totalEntries={filteredRoomTypes.length}
        />
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
      {openAddRoom && <AddRoomType onClose={() => setOpenAddRoom(false)} />}
      {editData && (<EditRoomType onClose={() => setEditData(null)} editData={editData} />)}
    </div>
  );
}

export default RoomTypesTableOnly;
