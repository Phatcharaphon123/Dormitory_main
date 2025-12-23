import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaPrint, FaDownload, FaArrowLeft, FaHome } from 'react-icons/fa';
import MoveOutReceiptPrint from './MoveOutReceiptPrint';

function MoveOutReceipt() {
  const { dormId, roomNumber, moveOutReceiptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [moveOutData, setMoveOutData] = useState(null);
  const [dormData, setDormData] = useState(null);
  const [defaultNote, setDefaultNote] = useState(''); // เพิ่ม state สำหรับหมายเหตุเริ่มต้น
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ฟังก์ชันแปลงประเภทรายการให้แสดงผล
  const getItemDisplayType = (itemType) => {
    switch (itemType) {
      case 'deposit_refund':
      case 'discount':
      case 'refund':
        return 'refund';
      case 'water':
      case 'electric':
      case 'utility':
      case 'meter':
        return 'utility';
      case 'damage':
      case 'cleaning':
      case 'penalty':
      case 'charge':
      case 'other':
        return 'charge';
      default:
        return 'charge';
    }
  };

  const fetchDormData = async () => {
    try {
      const token = localStorage.getItem('token');
      const dormResponse = await axios.get(`http://localhost:3001/api/dormitories/${dormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return dormResponse.data;
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลหอพัก:', error);
      throw error;
    }
  };

  const fetchDefaultNote = async () => {
    try {
      const token = localStorage.getItem('token');
      const noteResponse = await axios.get(`http://localhost:3001/api/receipts/dormitories/${dormId}/default-note?receipt_type=move_out`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (noteResponse.data && noteResponse.data.note_content) {
        setDefaultNote(noteResponse.data.note_content);
      }
    } catch (noteErr) {
      console.log('ℹ️ ไม่พบหมายเหตุเริ่มต้น หรือเกิดข้อผิดพลาดในการดึงข้อมูล:', noteErr);
    }
  };

  const fetchDormAndNoteOnly = async (dataFromState) => {
    try {
      setLoading(true);
      setError(null);
      
      const dormInfo = await fetchDormData();
      setDormData(dormInfo);
      await fetchDefaultNote();
      setMoveOutData(dataFromState);
      setLoading(false);
      
      console.log('✅ ใช้ข้อมูลจาก state สำเร็จ:', dataFromState);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลหอพัก:', error);
      setError('เกิดข้อผิดพลาดในการดึงข้อมูลหอพัก');
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    let isCancelled = false;
    
    try {
      setLoading(true);
      setError(null);
      
      // ดึงข้อมูลหอพักและข้อมูลการย้ายออก
      const dormInfo = await fetchDormData();
      if (isCancelled) return;
      
      setDormData(dormInfo);

      // ดึงข้อมูลการย้ายออก - ใช้ API ใหม่แบบเรียบง่าย
      const apiUrl = moveOutReceiptId 
        ? `http://localhost:3001/api/move-out-receipts/${moveOutReceiptId}`  // ใช้ move_out_receipt_id (PK)
        : `http://localhost:3001/api/move-out-receipts/dormitories/${dormId}/rooms/${roomNumber}`;  // ใช้เดิม
      const token = localStorage.getItem('token');
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (isCancelled) return;
      
      if (response.data.success) {
        // รวมข้อมูลหอพักเข้ากับข้อมูลการย้ายออก
        const apiData = response.data.data;
        
        console.log('🔍 Raw API Data:', apiData);
        console.log('🔍 API finalAmount:', apiData.finalAmount);
        
        // จัดการข้อมูลให้เป็นรูปแบบเดียวกัน (ใช้ API ใหม่เท่านั้น)
        const basicMoveOutData = {
          // ข้อมูลพื้นฐาน 
          moveOutId: apiData.moveOutId,
          receiptId: apiData.move_out_receipt_id,
          receiptNumber: apiData.receiptNumber,
          receipt_number: apiData.receiptNumber || apiData.receipt_number, // ใช้ receiptNumber เป็นหลัก
          
          // เพิ่ม contract_id สำหรับการนำทางไป MoveOutDetail
          contractId: apiData.contractId || apiData.contract_id,
          contract_id: apiData.contractId || apiData.contract_id,
          
          roomNumber: apiData.roomNumber,
          tenantName: apiData.tenantName,
          tenantPhone: apiData.tenantPhone,
          tenantAddress: apiData.tenantAddress || '',
          tenantAddressMain: apiData.tenantAddressMain || '',
          tenantSubdistrict: apiData.tenantSubdistrict || '',
          tenantDistrict: apiData.tenantDistrict || '',
          tenantProvince: apiData.tenantProvince || '',
          roomType: apiData.roomType,
          checkoutDate: apiData.checkoutDate,
          finalAmount: parseFloat(apiData.finalAmount || 0),
          paymentMethod: apiData.paymentMethod || 'เงินสด',
          receiptNote: apiData.receiptNote || '',
          
          // ข้อมูลการเงิน
          deposit: parseFloat(apiData.deposit || 0),
          advance: parseFloat(apiData.advance || 0),
          monthlyRent: parseFloat(apiData.monthlyRent || 0),
          
          // ข้อมูลมิเตอร์
          initialMeterReading: apiData.initialMeterReading || { water: 0, electric: 0 },
          currentMeterReading: apiData.currentMeterReading || { water: 0, electric: 0 },
          rates: apiData.rates || { water: 15, electric: 7 },
          
          // ข้อมูลหอพัก 
          dormName: apiData.dormName || dormInfo.name,
          dormAddress: apiData.dormAddress || `${dormInfo.address}${dormInfo.subdistrict ? ` ตำบล${dormInfo.subdistrict}` : ''}${dormInfo.district ? ` อำเภอ${dormInfo.district}` : ''}${dormInfo.province ? ` จังหวัด${dormInfo.province}` : ''}`,
          dormPhone: apiData.dormPhone || dormInfo.phone,
          
          // รายการค่าใช้จ่าย - ใช้ข้อมูลจาก move_out_receipt_items  
          items: (apiData.items || []).map(item => {
            const processedItem = {
              description: item.description,
              quantity: parseFloat(item.unit || item.quantity || 1),
              unitPrice: parseFloat(item.price_per_unit || item.pricePerUnit || item.unit_price || item.unitPrice || 0),
              totalPrice: parseFloat(item.amount || item.totalPrice || item.total_price || 0),
              type: getItemDisplayType(item.type || item.item_type || 'charge')
            };
            return processedItem;
          }),
          
          // ข้อมูลเพิ่มเติม
          createdAt: apiData.createdAt
        };
        
        setMoveOutData(basicMoveOutData);
        
        console.log('🎯 basicMoveOutData.finalAmount:', basicMoveOutData.finalAmount);
        
        // Validate ข้อมูลสำคัญ
        if (!basicMoveOutData.tenantName || !basicMoveOutData.roomNumber) {
          setTimeout(() => {
            if (moveOutReceiptId && !moveOutData?.tenantName) {
              console.log('🔄 Retry: ดึงข้อมูลใหม่');
              fetchAllData();
            }
          }, 1000);
        }

        // ดึงหมายเหตุเริ่มต้น
        if (!isCancelled) {
          await fetchDefaultNote();
        }
      } else {
        console.log('❌ API response ไม่สำเร็จ:', response.data);
        if (!isCancelled) {
          setError('ไม่พบข้อมูลการย้ายออก');
        }
      }
    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาด:', err);
      if (err.response) {
        console.error('❌ Response error:', err.response.data);
        console.error('❌ Status:', err.response.status);
      }
      if (!isCancelled) {
        setError(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`);
      }
    } finally {
      if (!isCancelled) {
        setLoading(false);
      }
    }
    
    return () => {
      isCancelled = true;
    };
  };

  useEffect(() => {
    // ตรวจสอบว่ามีข้อมูลจาก state หรือไม่ (มาจาก MoveOutDetail หรือ CancelContract)
    if (location.state && location.state.moveOutData) {
      const isFromDetail = location.state.fromDetail;
      const isFromCancel = !location.state.fromDetail && location.state.moveOutData;
      
      console.log('🎯 ใช้ข้อมูลจาก location state:', {
        from: isFromDetail ? 'MoveOutDetail' : 'CancelContract',
        data: location.state.moveOutData
      });
      
      // เก็บข้อมูลใน sessionStorage เป็น backup กันข้อมูลหาย
      const backupKey = `moveOutReceipt_${dormId}_${roomNumber}${moveOutReceiptId ? `_${moveOutReceiptId}` : ''}`;
      sessionStorage.setItem(backupKey, JSON.stringify({
        moveOutData: location.state.moveOutData,
        receiptNumber: location.state.receiptNumber,
        fromDetail: isFromDetail,
        fromCancel: isFromCancel,
        timestamp: Date.now()
      }));
      
      // ตรวจสอบว่าข้อมูลครบถ้วนหรือไม่
      const dataFromState = location.state.moveOutData;
      
      // สำหรับข้อมูลจาก CancelContract - ดึงข้อมูลล่าสุดจาก API
      if (isFromCancel) {
      
        // ดึงข้อมูลล่าสุดจาก API เพื่อให้ได้ข้อมูลจาก move_out_receipts และ move_out_receipt_items
        fetchAllData();
        return;
      }
      
      // สำหรับข้อมูลจาก MoveOutDetail - ดึงข้อมูลใหม่จาก API เพื่อให้ได้ items
      if (isFromDetail && dataFromState && dataFromState.tenant && dataFromState.room) {
        console.log('🔄 มาจาก MoveOutDetail - ดึงข้อมูลใหม่จาก API เพื่อให้ได้ items');
        fetchAllData();
        return;
      }
      
      // สำหรับข้อมูลจาก MoveOutDetail - ข้อมูลไม่ครบถ้วน
      if (!dataFromState || !dataFromState.tenant || !dataFromState.room) {
        console.log('⚠️ ข้อมูลจาก location state ไม่ครบถ้วน, จะดึงข้อมูลใหม่');
        fetchAllData();
        return;
      }
      
      // เพิ่มข้อมูลหอพักและใช้ข้อมูลที่ส่งมา (ถ้าไม่ใช่มาจาก Detail)
      if (!isFromDetail) {
        fetchDormData().then((dormInfo) => {
          const completeData = {
            ...dataFromState,
            dormName: dormInfo.name,
            dormAddress: `${dormInfo.address}${dormInfo.subdistrict ? ` ตำบล${dormInfo.subdistrict}` : ''}${dormInfo.district ? ` อำเภอ${dormInfo.district}` : ''}${dormInfo.province ? ` จังหวัด${dormInfo.province}` : ''}`,
            dormPhone: dormInfo.phone
          };
          setMoveOutData(completeData);
          setDormData(dormInfo);
          setLoading(false);
          
          // ดึงหมายเหตุเริ่มต้น
          fetchDefaultNote();
        }).catch((err) => {
          console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลหอพัก:', err);
          // ถ้าดึงข้อมูลหอพักไม่ได้ ให้ใช้ข้อมูลจาก state เพียงอย่างเดียว
          setMoveOutData(dataFromState);
          setLoading(false);
          fetchDefaultNote();
        });
      }
    } 
    // ถ้าไม่มี state data หรือมี moveOutReceiptId ให้ลองหา backup ก่อน
    else {
      // ลองดึงข้อมูลจาก sessionStorage
      const backupKey = `moveOutReceipt_${dormId}_${roomNumber}${moveOutReceiptId ? `_${moveOutReceiptId}` : ''}`;
      const backupData = sessionStorage.getItem(backupKey);
      
      if (backupData) {
        try {
          const parsedBackup = JSON.parse(backupData);
          const isRecent = (Date.now() - parsedBackup.timestamp) < 300000; // 5 นาที
          
          if (isRecent && parsedBackup.moveOutData) {
            fetchDormAndNoteOnly(parsedBackup.moveOutData);
            return;
          }
        } catch (parseErr) {
          console.log('⚠️ ไม่สามารถ parse ข้อมูล backup ได้:', parseErr);
        }
      }
      fetchAllData();
    }
  }, [dormId, roomNumber, moveOutReceiptId]);

  useEffect(() => {
    // จัดการการกดปุ่มย้อนกลับของบราวเซอร์ - ทำงานหลังจากโหลดข้อมูลเสร็จแล้ว
    if (!loading) {
      const handlePopState = (event) => {
        // ป้องกันการย้อนกลับปกติ
        event.preventDefault();
        // ล้าง sessionStorage
        const backupKey = `moveOutReceipt_${dormId}_${roomNumber}${moveOutReceiptId ? `_${moveOutReceiptId}` : ''}`;
        sessionStorage.removeItem(backupKey);
        // นำทางไปที่ RoomPlan แทน (ใช้ route ที่ถูกต้อง)
        navigate(`/moveout/completed/${dormId}`, { replace: true });
      };

      // เพิ่ม state ใหม่เพื่อป้องกันการย้อนกลับ
      window.history.pushState(null, null, window.location.pathname);
      
      // เพิ่ม event listener
      window.addEventListener('popstate', handlePopState);

      // ทำความสะอาดเมื่อ component unmount
      return () => {
        window.removeEventListener('popstate', handlePopState);
        // ล้าง sessionStorage เมื่อออกจากหน้า
        const backupKey = `moveOutReceipt_${dormId}_${roomNumber}`;
        sessionStorage.removeItem(backupKey);
      };
    }
  }, [dormId, navigate, loading, roomNumber]);

  const handlePrint = () => {
    if (!moveOutData) return;

    console.log('🖨️ เปิด Print Dialog สำหรับใบเสร็จการย้ายออก:', moveOutData);

    // เรียกใช้ MoveOutReceiptPrint และเปิด print dialog อัตโนมัติ
    const receiptNote = defaultNote || 'ใบเสร็จการย้ายออกจากหอพัก';
    
    // ส่งข้อมูล roomNumber ที่ถูกต้อง
    const currentRoomNumber = moveOutData.roomNumber || moveOutData.room?.number || roomNumber;
    
    MoveOutReceiptPrint.printMoveOutReceipt(
      moveOutData, 
      dormData, 
      receiptNote, 
      'ใบเสร็จการย้ายออก',
      currentRoomNumber  // ส่ง roomNumber แยกต่างหาก
    );
  };

  const generateMoveOutReceiptItems = (moveOutData) => {
    if (!moveOutData) {
      console.log('❌ ไม่มีข้อมูล moveOutData - จบการทำงาน');
      return [];
    }
    const items = [];    
    // 1. รายการจาก items ที่มีอยู่แล้ว (ข้อมูลจาก move_out_receipt_items)
    if (moveOutData.items && moveOutData.items.length > 0) {
      moveOutData.items.forEach((item) => {
        const quantity = Number(item.unit ?? item.quantity ?? 1);
        const itemType = item.type || item.item_type || 'charge';

        // ดึงราคาต่อหน่วยจากทุกคีย์ที่เป็นไปได้ (รวม unitPrice ด้วย)
        const rawUnit =
          item.price_per_unit ??
          item.pricePerUnit ??
          item.unit_price ??
          item.unitPrice;

        let unitPrice = Number(rawUnit);

        // ถ้าไม่มี/เป็น NaN/เป็น 0 ให้คำนวณจาก total ÷ qty (ใช้ abs เผื่อเป็น refund)
        if (!Number.isFinite(unitPrice) || unitPrice === 0) {
          const total = Number(item.amount ?? item.totalPrice ?? item.total_price);
          if (Number.isFinite(total) && quantity > 0) {
            unitPrice = Math.abs(total) / quantity;
          } else {
            unitPrice = 0;
          }
        }

        // ปรับปรุงการคำนวณ totalPrice ให้ถูกต้องตามประเภท
        let totalPrice = Number(item.amount ?? item.totalPrice ?? item.total_price ?? 0);
        
        // ตรวจสอบประเภทรายการเพื่อจัดการเครื่องหมาย
        const displayType = getItemDisplayType(itemType);
        if (displayType === 'refund') {
          // สำหรับ refund ให้เป็นค่าลบ (หักออกจากยอดรวม)
          totalPrice = -Math.abs(totalPrice);
          unitPrice = Math.abs(unitPrice); // unitPrice แสดงเป็นบวก แต่ total เป็นลบ
        } else {
          // สำหรับ charge/utility ให้เป็นค่าบวก (เพิ่มเข้ายอดรวม)
          totalPrice = Math.abs(totalPrice);
          unitPrice = Math.abs(unitPrice);
        }

        items.push({
          description: item.description,
          quantity,
          unitPrice,
          totalPrice,
          type: displayType,
          meterStart: item.meterStart,
          meterEnd: item.meterEnd,
          meterUsage: item.meterUsage || item.unit,
        });
      });

    } else {
      console.log('⚠️ ไม่พบรายการจาก move_out_receipt_items');
      console.log('⚠️ moveOutData.items คือ:', moveOutData.items);
    }
    
    // หากไม่มีข้อมูลเลย ให้แสดงข้อความแจ้งเตือน
    if (items.length === 0) {
      console.log('⚠️ ไม่พบรายการใดๆ - แสดงข้อความแจ้งเตือน');
      items.push({
        description: 'ไม่มีรายการค่าใช้จ่าย',
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        type: 'info'
      });
    }
    return items;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">กำลังโหลดข้อมูล</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                fetchAllData();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ลองใหม่
            </button>
            <button
              onClick={() => navigate(`/moveout/completed/${dormId}`)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              กลับไปหน้าประวัติการย้ายออก
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!moveOutData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg">ไม่พบข้อมูลการย้ายออก</p>
          <button
            onClick={() => navigate(`/rooms-plan/${dormId}`)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            กลับ
          </button>
        </div>
      </div>
    );
  }

  if (!moveOutData) {
    console.log('❌ moveOutData is null/undefined');
    return (
      <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:py-0">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-red-500">ไม่พบข้อมูลการย้ายออก</p>
          </div>
        </div>
      </div>
    );
  }
  
  const allItems = generateMoveOutReceiptItems(moveOutData);
  
  const refundItems = allItems.filter(item => item.type === 'refund');
  const chargeItems = allItems.filter(item => item.type === 'charge');
  const utilityItems = allItems.filter(item => item.type === 'utility');
  
  // ใช้ net_amount จากฐานข้อมูลเป็นหลัก (ค่าที่ถูกต้องที่บันทึกไว้แล้ว)
  const finalAmount = (moveOutData?.finalAmount !== undefined && moveOutData?.finalAmount !== null) 
    ? moveOutData.finalAmount 
    : null; // ใช้ null แทน 0 เพื่อให้เห็นว่าไม่มีข้อมูล
  
  // หาก finalAmount เป็น null ให้แสดงข้อความแจ้งเตือน
  if (finalAmount === null) {
    console.warn('⚠️ finalAmount is null - no data from database');
  }

  // ใช้ receipt number จากฐานข้อมูล
  const receiptNumber = moveOutData?.receiptNumber || moveOutData?.receipt_number || 'ไม่ระบุ';
  
  return (
    <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto">
        {/* Header with actions */}
        <div className="bg-white rounded-md shadow-sm p-6 mb-4 print:hidden border border-gray-300">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-700">
                ใบเสร็จการย้ายออก
              </h1>
              <p className="text-gray-500 mt-1">
                เลขที่: {receiptNumber}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <FaPrint />
                พิมพ์หรือดาวน์โหลด
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="bg-white rounded-md shadow-sm p-6 print:shadow-none print:rounded-none border border-gray-300">
          {/* Header */}
          <div className="text-center border-b border-gray-300 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-700 mb-1">ใบเสร็จการย้ายออก</h1>
            <h2 className="text-lg text-gray-600">{dormData?.name || moveOutData.dormName || 'หอพักไม่ระบุ'}</h2>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              {(dormData || moveOutData.dormAddress) ? (
                <>
                  <p>{dormData?.address || moveOutData.dormAddress?.split(' ')[0] || ''}</p>
                  <p>
                    {dormData ? 
                      `${dormData.subdistrict ? `ตำบล${dormData.subdistrict}` : ''} ${dormData.district ? `อำเภอ${dormData.district}` : ''} ${dormData.province ? `จังหวัด${dormData.province}` : ''}`.trim() :
                      moveOutData.dormAddress?.split(' ').slice(1).join(' ') || ''
                    }
                  </p>
                </>
              ) : (
                <>
                  <p>86/12 ถนนราชพฤกษ์</p>
                  <p>ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี</p>
                </>
              )}
              <p>
                {(dormData?.phone || moveOutData.dormPhone) ? 
                  `โทรศัพท์: ${dormData?.phone || moveOutData.dormPhone}` : 
                  'โทรศัพท์: 061-234-5678'
                }
              </p>
            </div>
          </div>

          {/* Customer and Date Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                ข้อมูลผู้ย้ายออก
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">ชื่อ:</span> {(moveOutData.tenantName || '').trim() || moveOutData.tenant?.fullName || 'ไม่ระบุ'}</p>
                <p><span className="font-medium">เบอร์โทร:</span> {moveOutData.tenantPhone || moveOutData.tenant?.phone || 'ไม่ระบุ'}</p>
                <p><span className="font-medium">ที่อยู่:</span> {moveOutData.tenantAddressMain || moveOutData.tenantAddress?.split(' ')[0] || 'ไม่ระบุที่อยู่'}</p>
                {(moveOutData.tenantSubdistrict || moveOutData.tenantDistrict || moveOutData.tenantProvince) && (
                  <p>
                    {moveOutData.tenantSubdistrict ? `ตำบล${moveOutData.tenantSubdistrict}` : ''}
                    {moveOutData.tenantDistrict ? ` อำเภอ${moveOutData.tenantDistrict}` : ''}
                    {moveOutData.tenantProvince ? ` จังหวัด${moveOutData.tenantProvince}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                รายละเอียดการย้ายออก
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">เลขที่ / No:</span> {receiptNumber}</p>
                <p><span className="font-medium">วันที่ย้ายออก / Date:</span> {moveOutData.checkoutDate ? new Date(moveOutData.checkoutDate).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')}</p>
                <p><span className="font-medium">ห้อง / Room:</span> {moveOutData.roomNumber || moveOutData.room?.number || roomNumber}</p>
                <p><span className="font-medium">ประเภทห้อง / Roomtype:</span> {moveOutData.roomType || moveOutData.room?.type || 'ไม่ระบุ'}</p>
                {moveOutData.deposit && (
                  <p><span className="font-medium">เงินประกัน / Deposit:</span> {Number(moveOutData.deposit).toLocaleString()} บาท</p>
                )}
                {moveOutData.outstandingBills && moveOutData.outstandingBills.length > 0 && (
                  <p><span className="font-medium">ใบแจ้งหนี้ค้างชำระ:</span> {moveOutData.outstandingBills.length} รายการ</p>
                )}
              </div>
            </div>
          </div>

          {/* Receipt Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              รายการการชำระ
            </h3>
            
            <div className="rounded overflow-hidden ring-1 ring-gray-400">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="border-r border-b border-gray-400 bg-gray-50">
                    <th className="border-r border-b border-gray-400 text-left py-2 px-3 font-medium text-gray-700">รายการ / Description</th>
                    <th className="border-r border-b border-gray-400 text-center py-2 px-3 font-medium text-gray-700">จำนวนหน่วย</th>
                    <th className="border-r border-b border-gray-400 text-center py-2 px-3 font-medium text-gray-700">ราคาต่อหน่วย</th>
                    <th className="border-b border-gray-400 text-center py-2 px-3 font-medium text-gray-700">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {/* แสดงข้อความเมื่อไม่มีรายการ */}
                  {chargeItems.length === 0 && utilityItems.length === 0 && refundItems.length === 0 && (
                    <tr>
                      <td colSpan="4" className="border-b border-gray-400 py-4 px-3 text-center text-gray-500">
                        ไม่มีรายการการชำระ
                      </td>
                    </tr>
                  )}
                  
                  {/* ค่าสาธารณูปโภค (ค่าน้ำ-ไฟ) - แสดงก่อน */}
                  {utilityItems.map((item, index) => {
                    return (
                      <tr key={`utility-${index}`}>
                        <td className="border-r border-b border-gray-400 py-2 px-3">
                          {item.description}
                          {item.meterStart !== undefined && item.meterEnd !== undefined && (
                            <div className="text-xs text-gray-500 mt-1">
                              มิเตอร์: {item.meterStart} → {item.meterEnd} (ใช้ {item.meterUsage || item.quantity} หน่วย)
                            </div>
                          )}
                        </td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">{item.quantity}</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3">
                          {Number(item.unitPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border-b border-gray-400 text-right py-2 px-3">{Number(item.totalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                  
                  {/* ค่าใช้จ่ายอื่นๆ - แสดงหลังค่าน้ำ-ไฟ */}
                  {chargeItems.map((item, index) => {
                    return (
                      <tr key={`charge-${index}`}>
                        <td className="border-r border-b border-gray-400 py-2 px-3">{item.description}</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">{item.quantity}</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3">
                          {Number(item.unitPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border-b border-gray-400 text-right py-2 px-3">{Number(item.totalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}

                  {/* เงินคืน - แสดงสุดท้าย */}
                  {refundItems.map((item, index) => {
                    return (
                      <tr key={`refund-${index}`}>
                        <td className="border-r border-b border-gray-400 py-2 px-3 text-green-600">{item.description}</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">{item.quantity}</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3 text-green-600">
                          -{Number(Math.abs(item.unitPrice) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border-b border-gray-400 text-right py-2 px-3 text-green-600">
                          {Number(item.totalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* ยอดรวม */}
                  <tr className="bg-gray-50">
                    <td className="border-r border-gray-400 py-3 px-3 font-bold text-gray-700" colSpan="3">
                      รวมทั้งสิ้น / Grand Total
                    </td>
                    <td className="text-right py-3 px-3 font-bold text-gray-700">
                      {finalAmount !== null 
                        ? Number(finalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' บาท'
                        : 'ไม่พบข้อมูลยอดรวม'
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Section */}
          <div className="border-t border-gray-300 pt-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ซ้าย: วิธีการชำระเงิน + หมายเหตุ */}
              <div>
                <div className="border border-gray-400 rounded p-3 mb-4 bg-gray-50 w-[250px]">
                  <p className="font-medium text-gray-700 mb-1">วิธีการชำระเงิน</p>
                  <p className="text-sm text-gray-800">
                    {moveOutData.paymentMethod === 'เงินสด' && 'เงินสด'}
                    {moveOutData.paymentMethod === 'โอนเงิน' && 'โอนเงิน'}
                    {moveOutData.paymentMethod === 'พร้อมเพย์' && 'พร้อมเพย์'}
                    {moveOutData.paymentMethod === 'บัตรเครดิต' && 'บัตรเครดิต'}
                    {!['เงินสด','โอนเงิน','พร้อมเพย์','บัตรเครดิต'].includes(moveOutData.paymentMethod) && moveOutData.paymentMethod}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-3 underline">หมายเหตุ:</p>
                <div className="text-xs text-gray-500 whitespace-pre-wrap">
                  {defaultNote ? (
                    defaultNote
                  ) : (
                    `การย้ายออกจากหอพัก - ห้อง ${moveOutData.roomNumber || roomNumber}`
                  )}
                </div>      
              </div>
              {/* ขวา: กล่องผู้รับเงิน */}
              <div className="text-center">
                <div className="border border-gray-400 p-4 rounded bg-gray-50">
                  <p className="font-medium text-gray-700 mb-6">
                    {finalAmount >= 0 ? 'ผู้รับเงิน' : 'ผู้จ่ายเงินคืน'}
                  </p>
                  <div className="mb-4">
                    <div className="text-center">
                      <span className="text-sm text-gray-600">จำนวน</span>
                      <div className="border-b border-gray-500 inline-block w-20 mx-2 text-center">
                        <span className="text-sm">{Number(Math.abs(finalAmount)).toLocaleString('th-TH')}</span>
                      </div>
                      <span className="text-sm text-gray-600">บาท</span>
                    </div>
                    <div className="mt-1 text-center">
                      <span className="text-xs text-gray-500">( _______________________________________ )</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="border-b border-gray-500 h-6 mb-1"></div>
                      <p className="text-xs text-gray-600">
                        {finalAmount >= 0 ? 'ผู้ชำระเงิน' : 'ผู้รับเงินคืน'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">( ___________________________ )</p>
                    </div>
                    <div>
                      <div className="border-b border-gray-500 h-6 mb-1"></div>
                      <p className="text-xs text-gray-600">
                        {finalAmount >= 0 ? 'ผู้รับเงิน' : 'ผู้จ่ายเงินคืน'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">( ___________________________ )</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ปุ่มดูข้อมูลผู้เช่าที่ย้ายออก */}
      <div className="flex justify-center mt-6 print:hidden">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-semibold shadow-md flex items-center gap-2 transition-all duration-200"
          onClick={() => {
            console.log('🔄 กำลังนำทางไปหน้า MoveOutDetail...');
            console.log('📋 ข้อมูลที่ใช้:', {
              dormId,
              roomNumber,
              moveOutReceiptId,
              moveOutData
            });

            // หา contract_id จากข้อมูล moveOutData ก่อน
            let contractId = null;
            
            if (moveOutData) {
              // ลำดับความสำคัญในการหา contract_id
              contractId = moveOutData.contractId || 
                          moveOutData.contract_id ||
                          moveOutData.contract?.contract_id;
            }

            // ถ้าไม่มี contract_id ให้ใช้ receiptNumber หรือ moveOutReceiptId
            if (!contractId) {
              contractId = moveOutReceiptId || 
                          moveOutData?.receiptId || 
                          moveOutData?.move_out_receipt_id ||
                          roomNumber; // fallback สุดท้าย
              
              console.log('⚠️ ไม่พบ contract_id, ใช้ fallback:', contractId);
            }


            try {
              navigate(`/dorm/${dormId}/move-out/detail/${contractId}`, {
                state: {
                  moveOutData: moveOutData,
                  fromReceipt: true,
                  dormData: dormData,
                  originalRoomNumber: roomNumber // เก็บ roomNumber ต้นฉบับไว้
                }
              });
            } catch (error) {
              console.error('❌ เกิดข้อผิดพลาดในการนำทาง:', error);
              
              // ลองวิธีอื่น - ไปหน้าประวัติการย้ายออกแทน
              console.log('🔄 ลองนำทางไปหน้าประวัติการย้ายออกแทน');
              navigate(`/moveout/completed/${dormId}`);
            }
          }}
        >
          ดูข้อมูลผู้เช่าที่ย้ายออก
        </button>
      </div>
    </div>
  );
}

export default MoveOutReceipt;
