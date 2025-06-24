import React, { useState } from 'react';
import EntriesPerPageSelect from '../../components/table/EntriesPerPageSelect.jsx';
import SearchBox from '../../components/table/SearchBox.jsx';
import PaginationControls from '../../components/table/PaginationControls.jsx';
import PaginationInfo from '../../components/table/PaginationInfo.jsx';
import monthCustomerData from '../../assets/monthCustomer.js';
import OpenButton from '../../components/buttons/OpenButton.jsx';

function MonthlyCustomer() {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState(monthCustomerData);

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.room.toLowerCase().includes(search) ||
      customer.name.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search) ||
      customer.contractType.toLowerCase().includes(search) ||
      customer.contractPeriod.toLowerCase().includes(search) ||
      customer.status.toLowerCase().includes(search)
    );
  });

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredCustomers.length / entriesPerPage);

  return (
    <div className='m-5'>
        <h1 className="text-2xl font-semibold mb-4 text-blue-950">รายการลูกค้ารายเดือน</h1>
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
              <th className="w-[5%] px-2 py-2 border text-center">No.</th>
              <th className="w-[5%] px-2 py-2 border text-center">เลขห้อง</th>
              <th className="w-[15%] px-2 py-2 border">ชื่อ-นามสกุล</th>
              <th className="w-[10%] px-2 py-2 border">เบอร์โทร</th>
              <th className="w-[10%] px-2 py-2 border text-center">ประเภทสัญญาเช่า</th>
              <th className="w-[15%] px-2 py-2 border text-center">วันเริ่ม-สิ้นสุด</th>
              <th className="w-[10%] px-2 py-2 border text-center">สถานะ</th>
              <th className="w-[10%] px-2 py-2 border text-center">รายละเอียด</th>
            </tr>
          </thead>

        <tbody>
          {currentCustomers.map((customer, index) => (
            <tr
              key={customer.id}
              className={index % 2 === 1 ? "bg-white" : "bg-gray-100"}
            >
              <td className="border px-2 py-2 text-center">{indexOfFirst + index + 1}</td>
              <td className="border px-2 py-2 text-center">{customer.room}</td>
              <td className="border px-2 py-2">{customer.name}</td>
              <td className="border px-2 py-2">{customer.phone}</td>
              <td className="border px-2 py-2 text-center">{customer.contractType}</td>
              <td className="border px-2 py-2 text-center">{customer.contractPeriod}</td>
              <td
                className={`border px-2 py-2 text-center font-semibold ${
                  customer.status === "เช่าอยู่" ? "text-blue-600" : "text-red-500"
                }`}
              >
                {customer.status}
              </td>
              <td className="border px-2 py-1 text-center">
                <OpenButton
                  text="รายละเอียด"
                  onClick={() => {
                    alert(`รายละเอียดสำหรับ ${customer.name}`);
                  }}
                />
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

export default MonthlyCustomer;
