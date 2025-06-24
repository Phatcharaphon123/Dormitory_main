import React, { useState } from 'react';
import AddButton from '../../components/buttons/AddButton.jsx';
import EntriesPerPageSelect from '../../components/table/EntriesPerPageSelect.jsx';
import SearchBox from '../../components/table/SearchBox.jsx';
import PaginationControls from '../../components/table/PaginationControls.jsx';
import PaginationInfo from '../../components/table/PaginationInfo.jsx';
import roomTestData from '../../assets/Rooms.js';
import EditButton from '../../components/buttons/EditButton.jsx';
import DeleteButton from '../../components/buttons/DeleteButton.jsx';
import AddRooms from '../addform/AddRooms.jsx';


function RoomsManage() {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [rooms, setRooms] = useState(roomTestData);

  const filteredRooms = rooms.filter((room) => {
  const search = searchTerm.toLowerCase();
  return (
    room.roomNumber.toString().toLowerCase().includes(search) ||
    room.type.toLowerCase().includes(search) ||
    room.deposit.toString().toLowerCase().includes(search) ||
    room.advance.toString().toLowerCase().includes(search) ||
    room.status.toLowerCase().includes(search)
  );
  });

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentRooms = filteredRooms.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredRooms.length / entriesPerPage);

  const [openAddRooms, setOpenAddRooms] = useState(false);
  const onCloseAddRooms = () => {
  setOpenAddRooms(false);
  };

  return (
    <div className="m-5">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-semibold text-blue-950">จัดการห้องพัก</h1>
        <AddButton onClick={() => setOpenAddRooms(!openAddRooms)}/>
      </div>

      <div className="bg-white p-4 rounded shadow-md overflow-x-auto">
        <div className="flex justify-between items-center mb-4 flex-wrap">
          <EntriesPerPageSelect
            entriesPerPage={entriesPerPage}
            setEntriesPerPage={setEntriesPerPage}
            setCurrentPage={setCurrentPage}
          />
          <SearchBox
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setCurrentPage={setCurrentPage}
          />
        </div>

        <table className="table-auto text-left border border-gray-300 w-full">
          <thead className="bg-blue-200">
            <tr>
              <th className="px-2 py-2 border">เลขห้อง</th>
              <th className="px-2 py-2 border">ประเภท</th>
              <th className="px-2 py-2 border">มัดจำ</th>
              <th className="px-2 py-2 border">ล่วงหน้า</th>
              <th className="px-2 py-2 border">สถานะห้องพัก</th>
              <th className="px-2 py-2 border text-center">แก้ไข</th>
              <th className="px-2 py-2 border text-center">ลบ</th>
            </tr>
          </thead>
          <tbody>
            {currentRooms.map((room, index) => (
              <tr 
                key={room.id}
                className={index % 2 === 1 ? "bg-white" : "bg-gray-100"}>
                <td className="w-[12%] border px-2 py-2">{room.roomNumber}</td>
                <td className="w-[32%] border px-2 py-2">{room.type}</td>
                <td className="w-[12%] border px-2 py-2">{room.deposit.toFixed(2)}</td>
                <td className="w-[12%] border px-2 py-2">{room.advance.toFixed(2)}</td>
                <td
                  className={`w-[12%] border px-2 py-2 font-semibold ${
                    room.status === "มีผู้เช่า" ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {room.status}
                </td>
                <td className="w-[10%] border px-2 py-1 text-center">
                  <EditButton />
                </td>
                <td className="w-[10%] border px-2 py-1 text-center">
                  <DeleteButton />
                </td>
              </tr>
            ))}
          </tbody>

        </table>

        <div className="flex justify-between items-center mt-4 flex-wrap">
          <PaginationInfo
            indexOfFirst={indexOfFirst}
            indexOfLast={indexOfLast}
            totalEntries={filteredRooms.length}
          />
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>
      {openAddRooms && <AddRooms onClose={onCloseAddRooms} />}
    </div>
  );
}

export default RoomsManage;
