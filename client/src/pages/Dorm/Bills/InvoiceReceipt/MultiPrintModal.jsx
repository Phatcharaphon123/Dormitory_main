import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PrintInvoice from './PrintInvoice';

const MultiPrintModal = ({ 
  showModal, 
  onClose, 
  selectedMonth
}) => {
  const { dormId } = useParams();
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bills, setBills] = useState([]);
  const [invoiceNote, setInvoiceNote] = useState('');
  const [invoiceData, setInvoiceData] = useState({});
  const [loading, setLoading] = useState(false);

  // เรียก API เมื่อ modal เปิดและมี selectedMonth
  useEffect(() => {
    if (showModal && selectedMonth && dormId) {
      fetchBillsData();
    }
  }, [showModal, selectedMonth, dormId]);

  const fetchBillsData = async () => {
    setLoading(true);
    try {
      console.log('� MultiPrintModal fetching API data for month:', selectedMonth);
      
      const response = await axios.get(`http://localhost:3001/api/bills/dormitories/${dormId}/invoices/by-month`, {
        params: { month: selectedMonth },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('📥 MultiPrintModal API Response:', response.data);
      setBills(response.data);

      // ดึงหมายเหตุจากตาราง default_receipt_notes เหมือน InvoiceReceipt
      try {
        const noteResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/receipts/default-note/${dormId}?receipt_type=monthly`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (noteResponse.data && noteResponse.data.note_content) {
          setInvoiceNote(noteResponse.data.note_content);
          console.log('✅ MultiPrintModal using default note from API:', noteResponse.data.note_content);
        } else {
          setInvoiceNote('กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พัชพล ยอดราช ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน์ หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท');
          console.log('❌ MultiPrintModal using fallback note - no data from API');
        }
      } catch (noteErr) {
        console.error('❌ MultiPrintModal โหลดหมายเหตุเริ่มต้นล้มเหลว:', noteErr);
        setInvoiceNote('กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พัชพล ยอดราช ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน์ หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท');
      }

      // ตั้งค่า invoiceData จากบิลแรก
      if (response.data.length > 0) {
        const firstBill = response.data[0];
        setInvoiceData({
          dorm_name: firstBill.dorm_name,
          dorm_address: firstBill.dorm_address,
          dorm_phone: firstBill.dorm_phone,
          dorm_subdistrict: firstBill.dorm_subdistrict,
          dorm_district: firstBill.dorm_district,
          dorm_province: firstBill.dorm_province
        });
      }

    } catch (error) {
      console.error('❌ MultiPrintModal API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // กรองเฉพาะบิลในเดือนที่เลือก
  const filteredBills = bills.filter(bill => bill.bill_month === selectedMonth);

  // จัดกลุ่มตามชั้น
  const groupedBills = filteredBills.reduce((acc, bill) => {
    const floor = bill.floor;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(bill);
    return acc;
  }, {});

  // ฟังก์ชันเลือก/ยกเลิกเลือกห้อง
  const toggleRoom = (roomId) => {
    setSelectedRooms(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      } else {
        return [...prev, roomId];
      }
    });
  };

  // ฟังก์ชันเลือก/ยกเลิกเลือกทั้งหมด
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(filteredBills.map(bill => bill.id));
    }
    setSelectAll(!selectAll);
  };

  // ฟังก์ชันเลือกตามชั้น
  const toggleFloor = (floor) => {
    const floorBills = groupedBills[floor];
    const floorBillIds = floorBills.map(bill => bill.id);
    const allFloorSelected = floorBillIds.every(id => selectedRooms.includes(id));

    if (allFloorSelected) {
      // ยกเลิกเลือกชั้นนี้
      setSelectedRooms(prev => prev.filter(id => !floorBillIds.includes(id)));
    } else {
      // เลือกชั้นนี้ทั้งหมด
      setSelectedRooms(prev => {
        const newSelected = [...prev];
        floorBillIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

  // ฟังก์ชันสร้างตารางห้องตามชั้น
  const generateRoomGrid = (floor, floorBills) => {
    const rooms = [];
    
    // ใช้ข้อมูลจริงที่มีในระบบเท่านั้น
    floorBills
      .sort((a, b) => {
        // เรียงลำดับตามเลขห้อง
        const roomA = parseInt(a.room_number) || 0;
        const roomB = parseInt(b.room_number) || 0;
        return roomA - roomB;
      })
      .forEach(bill => {
        rooms.push(renderRoomButton(bill.room_number, bill));
      });
    
    return rooms;
  };

  // ฟังก์ชันสร้างปุ่มห้อง
  const renderRoomButton = (roomNumber, bill) => {
    const hasData = !!bill;
    const isSelected = bill && selectedRooms.includes(bill.id);
    
    return (
      <label
        key={bill ? `${roomNumber}-${bill.id}` : `empty-${roomNumber}`}
        className="flex items-center justify-center cursor-pointer"
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleRoom(bill.id)}
          className="sr-only"
        />
        <div className={`w-50 h-20 border-2 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
          isSelected
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-blue-300'
        }`}>
          {roomNumber}
        </div>
      </label>
    );
  };

  // ตรวจสอบว่าชั้นนี้เลือกครบหรือไม่
  const isFloorSelected = (floor) => {
    const floorBillIds = groupedBills[floor].map(bill => bill.id);
    return floorBillIds.length > 0 && floorBillIds.every(id => selectedRooms.includes(id));
  };

  // ฟังก์ชันพิมพ์
  const handlePrint = () => {
    if (selectedRooms.length === 0) {
      alert('กรุณาเลือกห้องที่ต้องการพิมพ์');
      return;
    }

    const selectedBills = filteredBills.filter(bill => selectedRooms.includes(bill.id));
    
    if (selectedBills.length === 0) {
      alert('ไม่พบข้อมูลบิลที่เลือก');
      return;
    }

    // Debug: ตรวจสอบข้อมูลก่อนพิมพ์
    console.log('🖨️ กำลังเรียก PrintInvoice.printMultipleBills', {
      selectedBills,
      invoiceData,
      invoiceNote,
      selectedBillsLength: selectedBills.length
    });

    // ใช้ PrintInvoice ในการพิมพ์หลายบิล
    const title = `ใบแจ้งหนี้หลายห้อง-${selectedRooms.length}ห้อง`;
    PrintInvoice.printMultipleBills(selectedBills, invoiceData, invoiceNote, title);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white rounded-md shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 mx-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">เลือกห้องที่ต้องการออกใบแจ้งหนี้</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-md transition-colors"
          >
            <FaTimes className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* สรุปสถานะ */}
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex justify-between items-center text-sm">
            <div>เลือกแล้ว {selectedRooms.length} ห้อง</div>
            <div className="flex gap-2">
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
              >
                {selectAll ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            </div>
          </div>
        </div>

        {/* รายการห้อง */}
        <div className="flex-1 overflow-y-auto max-h-106">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : Object.keys(groupedBills).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>ไม่มีข้อมูลบิลในเดือนที่เลือก</p>
            </div>
          ) : (
            <div className="p-4">
              {Object.entries(groupedBills)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([floor, floorBills]) => (
                  <div key={floor} className="mb-6">
                    {/* Floor Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFloorSelected(floor)}
                          onChange={() => toggleFloor(floor)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="font-semibold text-gray-700">ชั้นที่ {floor}: {floorBills.length} ห้อง</span>
                      </label>
                    </div>

                    {/* Rooms Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {/* แสดงห้องทั้งหมดในชั้น (1011-1014, 105x8, 109x6, 110x3) */}
                      {generateRoomGrid(floor, floorBills)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            ยกเลิก
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedRooms.length === 0}
            className="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            พิมพ์
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiPrintModal;
