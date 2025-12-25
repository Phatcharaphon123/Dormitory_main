import React, { useState, useMemo, useEffect } from "react";
import {
  FaEdit,
  FaEye,
  FaTrash,
  FaPlus,
  FaSearch,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaExclamationTriangle,
  FaCheck,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { MdSaveAs } from "react-icons/md";
import axios from "axios";
import Pagination from "../../components/common/Pagination";
import ExcelExportButton from "../../components/common/ExcelExportButton";
import { FaList } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API_URL from "../../config/api";

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย (สำหรับแสดงในหน้าเว็บ)
const formatThaiDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
  return `${day}-${month}-${year}`;
};

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย (สำหรับ Excel)
const formatThaiDateForExcel = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
  return `${day}/${month}/${year}`;
};

// ฟังก์ชันแปลงเดือนปีเป็นรูปแบบไทย
const formatThaiMonth = (monthString) => {
  if (!monthString) return "";
  const [year, month] = monthString.split("-");
  const thaiYear = parseInt(year) + 543;
  const monthNames = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  return `${monthNames[parseInt(month) - 1]} ${thaiYear}`;
};

function MeterReading() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterMonth, setFilterMonth] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const { dormId } = useParams();
  // เพิ่มข้อมูลตัวอย่างให้มากขึ้น
  const [meterReadings, setMeterReadings] = useState([]);

  // State สำหรับ confirmation popup
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [deleteItemInfo, setDeleteItemInfo] = useState(null);

  // ฟังก์ชันสำหรับกรองและเรียงลำดับข้อมูล
  const filteredAndSortedReadings = useMemo(() => {
    let filtered = meterReadings;

    // เพิ่มลำดับ "ครั้งที่จด" ให้กับแต่ละรายการ (ล่าสุดเป็นตัวเลขมากสุด)
    const sortedByDate = [...meterReadings].sort((a, b) => {
      const dateA = new Date(a.date + " " + a.time);
      const dateB = new Date(b.date + " " + b.time);
      return dateA - dateB; // เรียงจากเก่าสุดไปใหม่สุด
    });

    // กรองตามคำค้นหา
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((reading) => {
        // ค้นหาตามวันที่ในรูปแบบต่างๆ
        const dateFormatted = formatThaiDate(reading.date);
        const dateOriginal = reading.date;
        const readingOrderStr = reading.readingOrder.toString();

        return (
          dateFormatted.includes(searchTerm) ||
          dateOriginal.includes(searchTerm) ||
          readingOrderStr.includes(searchTerm) ||
          reading.time.includes(searchTerm) ||
          // ค้นหาแบบไม่สนใจตัวพิมพ์ใหญ่เล็ก
          dateFormatted.toLowerCase().includes(searchLower) ||
          dateOriginal.toLowerCase().includes(searchLower) ||
          reading.time.toLowerCase().includes(searchLower)
        );
      });
    }

    // กรองตามเดือน
    if (filterMonth) {
      const [filterYear, filterMonthNum] = filterMonth.split("-");

      filtered = filtered.filter((reading) => {
        // วิธีที่ 1: ตรวจสอบด้วย startsWith
        const method1 = reading.date.startsWith(filterMonth);

        // วิธีที่ 2: แยก year-month จาก reading.date และเปรียบเทียบ
        const dateparts = reading.date.split("-");
        const method2 =
          dateparts.length >= 2 &&
          dateparts[0] === filterYear &&
          dateparts[1] === filterMonthNum;

        // วิธีที่ 3: ใช้ Date object ในการเปรียบเทียบ
        const readingDate = new Date(reading.date);
        const method3 =
          !isNaN(readingDate) &&
          readingDate.getFullYear().toString() === filterYear &&
          (readingDate.getMonth() + 1).toString().padStart(2, "0") ===
            filterMonthNum;

        const matches = method1 || method2 || method3;

        return matches;
      });
    }

    // เรียงลำดับ
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "date") {
        aValue = new Date(a.date + " " + a.time);
        bValue = new Date(b.date + " " + b.time);
      } else if (sortBy === "time") {
        // แปลงเวลาให้เป็นค่าที่เปรียบเทียบได้
        aValue = new Date("1970-01-01 " + a.time);
        bValue = new Date("1970-01-01 " + b.time);
      } else if (sortBy === "readingOrder") {
        aValue = parseInt(a.readingOrder) || 0;
        bValue = parseInt(b.readingOrder) || 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [meterReadings, searchTerm, filterMonth, sortBy, sortOrder]);

  useEffect(() => {
    const fetchMeterReadings = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_URL}/api/meter-records/dormitories/${dormId}/all`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const records = response.data;

        // ✅ เรียงจากใหม่ → เก่า เพื่อให้ #1 เป็นของวันเก่า
        const sorted = records.sort(
          (a, b) => new Date(b.meter_record_date) - new Date(a.meter_record_date)
        );

        const processed = sorted.map((record, index) => {
          const dateObj = new Date(record.created_at);
          return {
            id: record.meter_record_id,
            date: record.meter_record_date,
            time: dateObj.toTimeString().split(" ")[0],
            readingOrder: sorted.length - index,
          };
        });

        setMeterReadings(processed);
      } catch (error) {
        console.error("❌ ไม่สามารถโหลดรายการใบจดมิเตอร์:", error);
      }
    };

    fetchMeterReadings();
  }, [dormId]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedReadings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReadings = filteredAndSortedReadings.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleDelete = (id) => {
    // หาข้อมูลรายการที่จะลบ
    const itemToDelete = meterReadings.find((reading) => reading.id === id);
    setDeleteItemId(id);
    setDeleteItemInfo(itemToDelete);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteItemId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_URL}/api/meter-records/dormitories/${dormId}/${deleteItemId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMeterReadings(
        meterReadings.filter((reading) => reading.id !== deleteItemId)
      );
      toast.success("ลบรายการจดมิเตอร์เรียบร้อยแล้ว", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } catch (error) {
      console.error("❌ ไม่สามารถลบรายการจดมิเตอร์:", error);
      toast.error("เกิดข้อผิดพลาดในการลบรายการ", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } finally {
      setShowDeleteConfirm(false);
      setDeleteItemId(null);
      setDeleteItemInfo(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteItemId(null);
    setDeleteItemInfo(null);
  };

  const handleEdit = (id) => {
    navigate(`/edit-meter-reading/${dormId}/${id}`);
  };

  const handleView = (id) => {
    navigate(`/view-meter-reading/${id}`);
  };

  const handleCreateMeterReading = () => {
    navigate(`/create-meter-reading/${dormId}`);
  };

  // ฟังก์ชันสำหรับสร้างรายการเดือนปี
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // สร้างตัวเลือกย้อนหลัง 24 เดือน
    for (let i = 0; i < 24; i++) {
      const date = new Date(currentYear, currentDate.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const value = `${year}-${month.toString().padStart(2, "0")}`;
      const label = formatThaiMonth(value);
      options.push({ value, label });
    }

    return options;
  };

  const handleMonthSelect = (monthValue) => {
    setFilterMonth(monthValue);
    setShowMonthPicker(false);
    setCurrentPage(1);
  };

  // ฟังก์ชันสำหรับปฏิทิน
  const navigateCalendar = (direction) => {
    const newDate = new Date(calendarDate);
    if (direction === "prev") {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCalendarDate(newDate);
  };

  const selectMonth = (monthIndex) => {
    const year = calendarDate.getFullYear();
    const month = monthIndex + 1;
    const monthValue = `${year}-${month.toString().padStart(2, "0")}`;
    setFilterMonth(monthValue);
    setShowMonthPicker(false);
    setCurrentPage(1);
  };

  const isSelectedMonth = (monthIndex) => {
    const year = calendarDate.getFullYear();
    const month = monthIndex + 1;
    const monthValue = `${year}-${month.toString().padStart(2, "0")}`;
    return filterMonth === monthValue;
  };

  // รายการเดือนภาษาไทย
  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
              <MdSaveAs className="text-gray-700 text-3xl" />
              จดมิเตอร์
            </h1>
            <p className="text-gray-500 mt-1">
              จำนวนรายการทั้งหมด: {filteredAndSortedReadings.length} รายการ
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExcelExportButton
              data={filteredAndSortedReadings}
              columns={{
                date: "วันที่จด",
                time: "เวลา",
                readingOrder: "ครั้งที่จด",
              }}
              fileName="ใบจดมิเตอร์"
              sheetName="รายการจดมิเตอร์"
              buttonText="ส่งออก Excel"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors shadow-sm"
              formatData={(data) =>
                data.map((item) => ({
                  "ครั้งที่จด": item.readingOrder,
                  "วันที่จด": formatThaiDateForExcel(item.date),
                  เวลา: item.time,
                }))
              }
            />
            <button
              onClick={handleCreateMeterReading}
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors shadow-sm"
            >
              <FaPlus className="w-4 h-4" />
              สร้างใบจดมิเตอร์
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4 mb-4 ">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ค้นหาตามวันที่, เวลา, หรือครั้งที่จด..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-2 relative">
              <FaCalendarAlt className="text-gray-400 w-4 h-4" />
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white text-left min-w-[140px] flex items-center justify-between"
              >
                <span className="text-gray-700">
                  {filterMonth ? formatThaiMonth(filterMonth) : "เลือกเดือน"}
                </span>
                <FaChevronLeft
                  className={`w-3 h-3 text-gray-400 transform transition-transform ${
                    showMonthPicker ? "rotate-90" : "-rotate-90"
                  }`}
                />
              </button>

              {showMonthPicker && (
                <div className="absolute top-full left-8 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 w-80">
                  {/* Year Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigateCalendar("prev")}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <FaChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <h4 className="font-semibold text-gray-800 text-lg">
                        {calendarDate.getFullYear() + 543}
                      </h4>
                      <button
                        onClick={() => navigateCalendar("next")}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <FaChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Months Grid */}
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {thaiMonths.map((monthName, index) => (
                        <button
                          key={index}
                          onClick={() => selectMonth(index)}
                          className={`p-3 text-sm font-medium rounded-md transition-colors ${
                            isSelectedMonth(index)
                              ? "bg-slate-600 text-white"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {monthName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Button */}
                  <div className="p-3 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setFilterMonth("");
                        setShowMonthPicker(false);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                    >
                      ล้างการเลือก
                    </button>
                  </div>
                </div>
              )}

              {filterMonth && (
                <button
                  onClick={() => {
                    setFilterMonth("");
                    setCurrentPage(1);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="ล้างการเลือกเดือน"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">แสดง:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-600">รายการ</span>
            </div>

            {/* Clear filters */}
            {(searchTerm || filterMonth) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterMonth("");
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                ล้างการกรอง
              </button>
            )}
          </div>
        </div>

        {/* Meter Reading List */}
        <div className="bg-white rounded-md shadow-sm border border-gray-300 overflow-hidden">
          {/* Table Header */}
          <div className="p-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">รายการจดมิเตอร์</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>เรียงตาม:</span>
                <button
                  onClick={() => handleSort("readingOrder")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                    sortBy === "readingOrder"
                      ? "bg-slate-100 text-slate-700"
                      : "hover:bg-gray-100"
                  }`}
                >
                  ครั้งที่จด
                  {sortBy === "readingOrder" ? (
                    sortOrder === "asc" ? (
                      <FaSortUp className="w-3 h-3" />
                    ) : (
                      <FaSortDown className="w-3 h-3" />
                    )
                  ) : (
                    <FaSort className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="p-4">
            {currentReadings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <FaSearch className="w-12 h-12 mx-auto mb-4" />
                </div>
                <p className="text-gray-500">ไม่พบข้อมูลการจดมิเตอร์</p>
                {(searchTerm || filterMonth) && (
                  <p className="text-gray-400 text-sm mt-1">
                    ลองเปลี่ยนเงื่อนไขการค้นหาหรือล้างการกรอง
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentReadings.map((reading) => (
                  <div
                    key={reading.id}
                    className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-800">
                            วันที่จด: {formatThaiDate(reading.date)}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <p>
                            สร้าง: {formatThaiDate(reading.date)} {reading.time}
                          </p>
                          <p>ครั้งที่จด: #{reading.readingOrder}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {/* แก้ไข */}
                        <button
                          onClick={() => handleEdit(reading.id)}
                          className="flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1 rounded-md text-sm hover:bg-green-100 transition-colors border border-green-200"
                        >
                          <FaEdit />
                          <span>แก้ไข</span>
                        </button>

                        {/* ลบ */}
                        <button
                          onClick={() => handleDelete(reading.id)}
                          className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-md text-sm hover:bg-red-100 transition-colors border border-red-200"
                        >
                          <FaTrash />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedReadings.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FaExclamationTriangle className="h-6 w-6 text-red-600" />
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ยืนยันการลบรายการ
              </h3>

              {deleteItemInfo && (
                <div className="text-sm text-gray-600 mb-4 text-left bg-gray-50 p-4 rounded-md">
                  <p>
                    <strong>วันที่จด:</strong> {formatThaiDate(deleteItemInfo.date)}
                  </p>
                </div>
              )}

              <p className="text-sm text-red-600 mb-4">
                คุณต้องการลบรายการจดมิเตอร์นี้หรือไม่?<br />
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-400 transition-colors"
                  onClick={cancelDelete}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  onClick={confirmDelete}
                >
                  <FaTrash />
                  ลบรายการ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{
          zIndex: 99999,
          position: "fixed",
          top: "20px",
          right: "20px",
        }}
      />
    </div>
  );
}

export default MeterReading;
