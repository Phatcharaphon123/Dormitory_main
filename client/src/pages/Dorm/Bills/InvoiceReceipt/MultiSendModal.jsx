import React, { useState, useEffect } from 'react';
import { FaTimes, FaEnvelope } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MultiSendModal = ({ 
  showModal, 
  onClose, 
  selectedMonth
}) => {
  const { dormId } = useParams();
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendHistory, setSendHistory] = useState([]);

  // เรียก API เมื่อ modal เปิดและมี selectedMonth
  useEffect(() => {
    if (showModal && selectedMonth && dormId) {
      fetchBillsData();
      fetchSendHistory();
    }
  }, [showModal, selectedMonth, dormId]);

  const fetchBillsData = async () => {
    setLoading(true);
    try {
      console.log('📊 MultiSendModal fetching API data for month:', selectedMonth);
      
      const response = await axios.get(`http://localhost:3001/api/bills/dormitories/${dormId}/invoices/by-month`, {
        params: { month: selectedMonth },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('📥 MultiSendModal API Response:', response.data);
      setBills(response.data);

    } catch (error) {
      console.error('❌ MultiSendModal API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSendHistory = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/bills/dormitories/${dormId}/send-history`, {
        params: { month: selectedMonth },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setSendHistory(response.data.data);
        console.log('📧 Send History:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching send history:', error);
    }
  };

  // ตรวจสอบว่าห้องนี้เคยส่งบิลแล้วหรือไม่
  const hasBeenSent = (bill) => {
    return sendHistory.some(history => 
      history.invoice_receipt_id === bill.id && 
      history.send_status === 'sent' &&
      history.send_method === 'email'
    );
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
    // หาห้องที่ยังไม่ส่งบิลทั้งหมด
    const unsentBills = filteredBills.filter(bill => 
      bill.tenant_email && 
      bill.status !== 'paid' && 
      !hasBeenSent(bill)
    );
    
    const unsentBillIds = unsentBills.map(bill => bill.id);
    const allUnsentSelected = unsentBillIds.length > 0 && unsentBillIds.every(id => selectedRooms.includes(id));
    
    if (allUnsentSelected) {
      setSelectedRooms([]);
      setSelectAll(false);
    } else {
      setSelectedRooms(unsentBillIds);
      setSelectAll(true);
    }
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
    const hasEmail = bill && bill.tenant_email;
    const isPaid = bill && bill.status === 'paid';
    const alreadySent = bill && hasBeenSent(bill);
    const canSelect = hasEmail && !isPaid;
    
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
          disabled={!canSelect}
        />
        <div className={`w-50 h-20 border-2 rounded-md flex flex-col items-center justify-center text-xs font-medium transition-colors ${
          isPaid
            ? 'bg-green-100 text-green-600 border-green-300 cursor-not-allowed'
            : !hasEmail
              ? 'bg-red-100 text-red-500 border-red-300 cursor-not-allowed'
              : isSelected
                ? 'bg-blue-500 text-white border-blue-500'
                : alreadySent
                  ? 'bg-orange-100 text-orange-600 border-orange-300'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-blue-300'
        }`}>
          <span>{roomNumber}</span>
          {isPaid && <span className="text-xs">ชำระแล้ว</span>}
          {!isPaid && !hasEmail && <span className="text-xs">ไม่มีอีเมล</span>}
          {!isPaid && hasEmail && alreadySent && <span className="text-xs">ส่งแล้ว ✓</span>}
          {!isPaid && hasEmail && !alreadySent && <span className="text-xs">ยังไม่ส่ง</span>}
        </div>
      </label>
    );
  };

  // ตรวจสอบว่าชั้นนี้เลือกครบหรือไม่
  const isFloorSelected = (floor) => {
    const floorBillIds = groupedBills[floor].map(bill => bill.id);
    return floorBillIds.length > 0 && floorBillIds.every(id => selectedRooms.includes(id));
  };

  // ฟังก์ชันส่งบิล
  const handleSendBills = async () => {
    if (selectedRooms.length === 0) {
      toast.warning('กรุณาเลือกห้องที่ต้องการส่งบิล');
      return;
    }

    const selectedBills = filteredBills.filter(bill => selectedRooms.includes(bill.id));
    
    if (selectedBills.length === 0) {
      toast.error('ไม่พบข้อมูลบิลที่เลือก');
      return;
    }

    // กรองออกห้องที่ชำระแล้ว
    const unpaidBills = selectedBills.filter(bill => bill.status !== 'paid');
    const paidBills = selectedBills.filter(bill => bill.status === 'paid');

    if (paidBills.length > 0) {
      toast.success(`${paidBills.length} ห้องชำระเงินแล้ว จะไม่ส่งบิล`);
    }

    if (unpaidBills.length === 0) {
      toast.warning('ไม่มีห้องที่ต้องส่งบิล (ทุกห้องชำระแล้ว)');
      return;
    }

    // ตรวจสอบว่ามีอีเมลหรือไม่
    const billsWithoutEmail = unpaidBills.filter(bill => !bill.tenant_email);

    if (billsWithoutEmail.length > 0) {
      if (!confirm(`${billsWithoutEmail.length} ห้องไม่มีอีเมล ต้องการดำเนินการต่อหรือไม่?`)) {
        return;
      }
    }

    setSending(true);
    
    try {
      // กรองเฉพาะบิลที่มีอีเมล
      const billsWithEmail = unpaidBills.filter(bill => bill.tenant_email);
      
      if (billsWithEmail.length === 0) {
        toast.warning('ไม่มีห้องที่มีอีเมลสำหรับส่งบิล');
        return;
      }

      // เตรียมข้อมูลสำหรับส่งไปยัง API
      const billIds = billsWithEmail.map(bill => bill.id);

      console.log('📧 กำลังส่งบิลไปยัง API:', {
        dormId,
        month: selectedMonth,
        billCount: billIds.length,
        bills: billIds
      });

      // เรียก API สำหรับส่งบิลหลายใบพร้อมกัน
      const response = await axios.post(`http://localhost:3001/api/bills/dormitories/${dormId}/invoices/send-email`, {
        month: selectedMonth,
        bills: billIds
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('✅ ผลลัพธ์การส่งบิล:', response.data);

      // แสดงผลลัพธ์ที่ละเอียด
      if (response.data.report) {
        const { sent, failed, noEmail, total, results } = response.data.report;
        
        // สร้างรายการห้องที่ส่งสำเร็จ
        const successRooms = [];
        const failedRooms = [];
        
        if (results && Array.isArray(results)) {
          results.forEach(result => {
            // หาข้อมูลห้องจาก billsWithEmail
            const billInfo = billsWithEmail.find(bill => 
              bill.invoice_number === result.invoice_number
            );
            
            if (result.success) {
              successRooms.push(`ห้อง ${billInfo?.room_number || 'N/A'}`);
            } else {
              failedRooms.push(`ห้อง ${billInfo?.room_number || 'N/A'} (${result.error || 'ไม่ทราบสาเหตุ'})`);
            }
          });
        }
        
        // สร้างข้อความแจ้งผลลัพธ์
        let resultMessage = `ส่งบิลทางอีเมลเสร็จสิ้น\n`;
        resultMessage += `- รวมทั้งสิ้น: ${total} ใบ\n`;
        resultMessage += `- ส่งสำเร็จ: ${sent} ใบ\n`;
        
        if (failed > 0) {
          resultMessage += `- ล้มเหลว: ${failed} ใบ\n`;
        }
        
        if (noEmail > 0) {
          resultMessage += `- ไม่มีอีเมล: ${noEmail} ใบ`;
        }
        
        toast.success(resultMessage, { autoClose: 3000 });
        // รีเฟรชประวัติและปิด popup หลังจาก Toast แสดง
        setTimeout(async () => {
          await fetchSendHistory();
          onClose();
        }, 3500);
      } else {
        // กรณีไม่มี report ให้แสดงแบบเดิม
        toast.success(`ส่งอีเมลเรียบร้อยแล้ว ${billsWithEmail.length} ห้อง`, { autoClose: 3000 });
        // รีเฟรชประวัติและปิด popup หลังจาก Toast แสดง
        setTimeout(async () => {
          await fetchSendHistory();
          onClose();
        }, 3500);
      }
      
    } catch (error) {
      console.error('❌ Error sending bills:', error);
      
      let errorMessage = 'เกิดข้อผิดพลาดในการส่งบิล';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setSending(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col border border-gray-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0 rounded-t-md">
          <h2 className="text-lg font-semibold text-gray-800">เลือกห้องที่ต้องการส่งบิลทางอีเมล</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-md transition-colors"
          >
            <FaTimes className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* สรุปสถานะ */}
        <div className="p-4 bg-blue-50 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FaEnvelope className="text-blue-600" />
              <span className="text-sm font-medium">ส่งบิลทางอีเมล</span>
            </div>
            
            <div className="flex gap-2 items-center">
              <span className="text-sm">เลือกแล้ว {selectedRooms.length} ห้อง</span>
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
              >
                {(() => {
                  const unsentBills = filteredBills.filter(bill => 
                    bill.tenant_email && 
                    bill.status !== 'paid' && 
                    !hasBeenSent(bill)
                  );
                  const unsentBillIds = unsentBills.map(bill => bill.id);
                  const allUnsentSelected = unsentBillIds.length > 0 && unsentBillIds.every(id => selectedRooms.includes(id));
                  
                  return allUnsentSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกห้องที่ยังไม่ส่ง';
                })()}
              </button>
            </div>
          </div>
        </div>

        {/* สถิติห้อง */}
        <div className="p-4 bg-gray-50 border-b flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{filteredBills.length}</div>
              <div className="text-gray-600">ห้องทั้งหมด</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {filteredBills.filter(bill => bill.status === 'paid').length}
              </div>
              <div className="text-gray-600">ชำระแล้ว</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {filteredBills.filter(bill => bill.status !== 'paid' && bill.tenant_email && hasBeenSent(bill)).length}
              </div>
              <div className="text-gray-600">ส่งแล้ว</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {filteredBills.filter(bill => bill.status !== 'paid' && bill.tenant_email && !hasBeenSent(bill)).length}
              </div>
              <div className="text-gray-600">ยังไม่ส่ง</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {filteredBills.filter(bill => bill.status !== 'paid' && !bill.tenant_email).length}
              </div>
              <div className="text-gray-600">ไม่มีอีเมล</div>
            </div>
          </div>
        </div>

        {/* รายการห้อง */}
        <div className="flex-1 overflow-y-auto min-h-0">
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
                    <div className="flex items-center gap-3 mb-3 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
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
                    <div className="grid grid-cols-4 sm:grid-cols-6  lg:grid-cols-7  gap-2 mb-4">
                      {generateRoomGrid(floor, floorBills)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* คำอธิบายสีสัญลักษณ์ */}
        <div className="px-4 py-2 bg-gray-50 border-t border-b text-xs text-gray-600 flex-shrink-0">
          <div className="flex gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded-md"></div>
              ห้องปกติ (มีอีเมล ยังไม่ส่ง)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-md"></div>
              ชำระแล้ว
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-md"></div>
              ส่งบิลแล้ว
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded-md"></div>
              ไม่มีอีเมล
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 border border-blue-500 rounded-md"></div>
              เลือกแล้ว
            </span>
            <span>✓ = ส่งแล้ว</span>
          </div>
        </div>

        {/* รายละเอียดห้องที่เลือก */}
        {selectedRooms.length > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-t text-sm flex-shrink-0">
            <div className="font-medium text-gray-700 mb-3">
              ห้องที่เลือกไว้ ({selectedRooms.length} ห้อง)
            </div>
            
            {/* สรุปผลการส่ง */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {(() => {
                const canSendCount = filteredBills.filter(bill => 
                  selectedRooms.includes(bill.id) && 
                  bill.status !== 'paid' && 
                  bill.tenant_email && 
                  !hasBeenSent(bill)
                ).length;
                
                const alreadySentCount = filteredBills.filter(bill => 
                  selectedRooms.includes(bill.id) && 
                  bill.status !== 'paid' && 
                  bill.tenant_email && 
                  hasBeenSent(bill)
                ).length;
                
                const paidCount = filteredBills.filter(bill => 
                  selectedRooms.includes(bill.id) && 
                  bill.status === 'paid'
                ).length;

                const noEmailCount = filteredBills.filter(bill => 
                  selectedRooms.includes(bill.id) && 
                  bill.status !== 'paid' && 
                  !bill.tenant_email
                ).length;

                return (
                  <>
                    <div className="text-center p-3 bg-green-50 rounded-md border border-green-200">
                      <div className="text-2xl font-bold text-green-600">{canSendCount}</div>
                      <div className="text-xs text-green-700">จะส่งได้</div>
                    </div>
                    
                    {alreadySentCount > 0 && (
                      <div className="text-center p-3 bg-orange-50 rounded-md border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">{alreadySentCount}</div>
                        <div className="text-xs text-orange-700">ส่งแล้ว</div>
                      </div>
                    )}
                    
                    {paidCount > 0 && (
                      <div className="text-center p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="text-2xl font-bold text-gray-600">{paidCount}</div>
                        <div className="text-xs text-gray-700">ชำระแล้ว</div>
                      </div>
                    )}
                    
                    {noEmailCount > 0 && (
                      <div className="text-center p-3 bg-red-50 rounded-md border border-red-200">
                        <div className="text-2xl font-bold text-red-600">{noEmailCount}</div>
                        <div className="text-xs text-red-700">ไม่มีอีเมล</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* ข้อความสรุป */}
            <div className="mt-3 text-center text-xs text-gray-600">
              {(() => {
                const canSendCount = filteredBills.filter(bill => 
                  selectedRooms.includes(bill.id) && 
                  bill.status !== 'paid' && 
                  bill.tenant_email && 
                  !hasBeenSent(bill)
                ).length;
                
                if (canSendCount > 0) {
                  return `✓ พร้อมส่งอีเมล ${canSendCount} ห้อง`;
                } else {
                  return "⚠ ไม่มีห้องที่สามารถส่งอีเมลได้";
                }
              })()}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0 rounded-b-md">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSendBills}
            disabled={selectedRooms.length === 0 || sending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังส่งอีเมล...
              </>
            ) : (
              <>
                <FaEnvelope className="w-4 h-4" />
                ส่งอีเมล
              </>
            )}
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default MultiSendModal;
