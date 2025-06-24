import React, { useState } from 'react';
import EntriesPerPageSelect from '../../components/table/EntriesPerPageSelect.jsx';
import SearchBox from '../../components/table/SearchBox.jsx';
import PaginationControls from '../../components/table/PaginationControls.jsx';
import PaginationInfo from '../../components/table/PaginationInfo.jsx';
import OpenButton from '../../components/buttons/OpenButton.jsx';
import dailyCustomersData from '../../assets/dailyCustomers.js';

function DailyCustomer() {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState(dailyCustomersData);

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.bill.toString().toLowerCase().includes(search) ||
      customer.room.toString().toLowerCase().includes(search) ||
      customer.name.toLowerCase().includes(search) ||
      customer.checkin.toLowerCase().includes(search) ||
      customer.status.toLowerCase().includes(search)
    );
  });

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredCustomers.length / entriesPerPage);


  return (
    <div className='m-5'>
        <h1 className="text-2xl font-semibold mb-4 text-blue-950">รายการลูกค้ารายวัน</h1>
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
              <th className="w-[7%] px-2 py-2 border text-center">Bill</th>
              <th className="w-[5%] px-2 py-2 border text-center">ห้อง</th>
              <th className="w-[17%] px-2 py-2 border text-center">ชื่อ - นามสกุล</th>
              <th className="w-[15%] px-2 py-2 border text-center">เข้าพัก</th>
              <th className="w-[3%] px-2 py-2 border text-center">รวม(วัน)</th>
              <th className="w-[9%] px-2 py-2 border text-center">ค่าห้อง(บาท)</th>
              <th className="w-[9%] px-2 py-2 border text-center">มัดจำ</th>
              <th className="w-[9%] px-2 py-2 border text-center">เสียหาย</th>
              <th className="w-[9%] px-2 py-2 border text-center">รวม(บาท)</th>
              <th className="w-[5%] px-2 py-2 border text-center">สถานะ</th>
              <th className="w-[7%] px-2 py-2 border text-center">รายละเอียด</th>
            </tr>
          </thead>

          <tbody>
           {currentCustomers.map((customer, index) => (
          <tr key={customer.bill} className={index % 2 === 1 ? "bg-white" : "bg-gray-100"}>
            <td className="border px-2 py-2 text-center">{customer.bill}</td>
            <td className="border px-2 py-2 text-center">{customer.room}</td>
            <td className="border px-2 py-2">{customer.name}</td>
            <td className="border px-2 py-2 text-center">{customer.checkin}</td>
            <td className="border px-2 py-2 text-center">{customer.days}</td>
            <td className="border px-2 py-2 text-right">{customer.roomPrice}</td>
            <td className="border px-2 py-2 text-right">{customer.deposit}</td>
            <td className="border px-2 py-2 text-right">{customer.damage}</td>
            <td className="border px-2 py-2 text-right">{customer.total}</td>
            <td className="border px-2 py-2 text-center">{customer.status}</td>
            <td className="border px-2 py-1 text-center">
              <OpenButton onClick={() => alert(`Details for Bill: ${customer.bill}`)} />
            </td>
          </tr>
        ))}

          </tbody>
        </table>

        <div className="flex justify-between items-center mt-4 flex-wrap">
          <PaginationInfo
            indexOfFirst={indexOfFirst}
            indexOfLast={indexOfLast}
            totalEntries={filteredCustomers.length}
          />
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>
    </div>
  )
}

export default DailyCustomer;
