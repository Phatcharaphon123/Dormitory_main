import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPrint, FaDownload } from 'react-icons/fa';
import PrintReceipt from './PrintReceipt';

function ReceiptPrint() {
  const { dormId, contractId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ตรวจสอบว่ามาจากหน้า MonthlyContract หรือไม่ (state.fromMonthlyContract === true)
  const fromMonthlyContract = location.state?.fromMonthlyContract === true;

  useEffect(() => {
    fetchReceipt();
  }, [contractId]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/api/receipts/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceipt(response.data);
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError('ไม่สามารถโหลดใบเสร็จได้');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // ใช้ PrintReceipt แทนการพิมพ์แบบเดิม
    const receiptItems = PrintReceipt.generateReceiptItemsFromReceipt(receipt);
    PrintReceipt.printSingleReceipt(receipt, {}, '', 'ใบเสร็จรับเงิน', receiptItems);
  };

  const handleDownload = () => {
    // ใช้ PrintReceipt สำหรับการสร้าง HTML แล้วแปลงเป็น PDF
    const receiptItems = PrintReceipt.generateReceiptItemsFromReceipt(receipt);
    const receiptHTML = PrintReceipt.generateReceiptHTMLWithItems(receipt, {}, receiptItems, '');
    
    // สร้าง new window เพื่อแสดง preview และให้ผู้ใช้สามารถ Save as PDF ได้
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ใบเสร็จรับเงิน - ${receipt.receipt_number}</title>
          <meta charset="utf-8">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          ${PrintReceipt.getPrintStyles()}
        </head>
        <body>
          <div class="print-area">
            ${receiptHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Focus เพื่อให้ user สามารถใช้ Ctrl+P หรือ Save as PDF ได้
    printWindow.focus();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">กำลังโหลดใบเสร็จ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg">ไม่พบใบเสร็จ</p>
        </div>
      </div>
    );
  }

  // แยกรายการตามประเภท
  const allItems = receipt.all_items || [];
  const depositItems = allItems.filter(item => item.item_type === 'deposit');
  const advanceItems = allItems.filter(item => item.item_type === 'advance');
  const serviceItems = allItems.filter(item => item.item_type === 'service');
  const discountItems = allItems.filter(item => item.item_type === 'discount');
  
  // Fallback ใช้ข้อมูลเดิมถ้าไม่มี all_items
  const fallbackServices = receipt.services ? JSON.parse(receipt.services) : [];

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto">
        {/* Header with actions */}
        <div className="bg-white rounded-md shadow-sm p-6 mb-4 print:hidden border border-gray-300">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-700">
                ใบเสร็จรับเงิน
              </h1>
              <p className="text-gray-500 mt-1">เลขที่: {receipt.receipt_number}</p>
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
            <h1 className="text-2xl font-bold text-gray-700 mb-1">ใบเสร็จรับเงิน</h1>
            <h2 className="text-lg text-gray-600">{receipt.dorm_name}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {receipt.dorm_address && (
                <>
                  {receipt.dorm_address}<br/>
                  {[
                    receipt.dorm_subdistrict && `ตำบล${receipt.dorm_subdistrict}`,
                    receipt.dorm_district && `อำเภอ${receipt.dorm_district}`,
                    receipt.dorm_province && `จังหวัด${receipt.dorm_province}`
                  ].filter(Boolean).join(' ')}<br/>
                </>
              )}
              {!receipt.dorm_address && (
                <>
                  86/12 ถนนราชพฤกษ์<br/>
                  ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี<br/>
                </>
              )}
              {receipt.dorm_phone && `โทรศัพท์: ${receipt.dorm_phone}`}
              {!receipt.dorm_phone && 'โทรศัพท์: 061-234-5678'}
            </p>
          </div>

          {/* Customer and Date Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                ข้อมูลผู้ชำระ
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">ชื่อ:</span> {receipt.first_name} {receipt.last_name}</p>
                <p><span className="font-medium">เบอร์โทร:</span> {receipt.phone_number}</p>
                <p><span className="font-medium">ที่อยู่:</span> {receipt.address ? receipt.address : 'ไม่ระบุที่อยู่'} </p>
                {receipt.address && (
                  <>
                    <p>ตำบล{receipt.subdistrict} อำเภอ{receipt.district} จังหวัด{receipt.province}</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                รายละเอียดใบเสร็จ
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">เลขที่ / No:</span> {receipt.receipt_number}</p>
                <p><span className="font-medium">วันที่ / Date:</span> {receipt.created_at ? new Date(receipt.created_at).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')}</p>
                <p><span className="font-medium">ห้อง / Room:</span> {receipt.room_number}</p>
                <p><span className="font-medium">ประเภทห้อง / Roomtype:</span> {receipt.room_type}</p>
              </div>
            </div>
          </div>

          {/* Receipt Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              รายการค่าใช้จ่าย
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
                  {/* เงินประกัน (ค่าจำ) */}
                  {depositItems.length > 0 ? (
                    depositItems.map((item, index) => (
                      <tr key={`deposit-${index}`}>
                        <td className="border-r border-b border-gray-400 py-2 px-3">{item.description}</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">{item.quantity}</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3">{Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-gray-400 text-right py-2 px-3">{Number(item.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    parseFloat(receipt.deposit_amount || receipt.deposit_monthly || 0) > 0 && (
                      <tr>
                        <td className="border-r border-b border-gray-400 py-2 px-3">เงินประกัน</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">1</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3">{Number(receipt.deposit_amount || receipt.deposit_monthly).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-gray-400 text-right py-2 px-3">{Number(receipt.deposit_amount || receipt.deposit_monthly).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )
                  )}
                  
                  {/* ค่าเช่าล่วงหน้า */}
                  {advanceItems.length > 0 ? (
                    advanceItems.map((item, index) => (
                      <tr key={`advance-${index}`}>
                        <td className="border-r border-b border-gray-400 py-2 px-3">{item.description}</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">{item.quantity}</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3">{Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-gray-400 text-right py-2 px-3">{Number(item.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    parseFloat(receipt.advance_amount || 0) > 0 && (
                      <tr>
                        <td className="border-r border-b border-gray-400 py-2 px-3">ค่าเช่าล่วงหน้า</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">1</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3">{Number(receipt.advance_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-gray-400 text-right py-2 px-3">{Number(receipt.advance_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )
                  )}
                  
                  {/* บริการเพิ่มเติม */}
                  {serviceItems.length > 0 ? (
                    serviceItems.map((item, index) => (
                      <tr key={`service-${index}`}>
                        <td className="border-r border-b border-gray-400 py-2 px-3">{item.description}</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">{item.quantity}</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3">{Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-gray-400 text-right py-2 px-3">{Number(item.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    fallbackServices.map((service, index) => (
                      <tr key={`fallback-${index}`}>
                        <td className="border-r border-b border-gray-400 py-2 px-3">{service.description || service.name}</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">{service.quantity || 1}</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3">{Number(service.unitPrice || service.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-gray-400 text-right py-2 px-3">{Number(service.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  )}

                  {/* ส่วนลด */}
                  {discountItems.length > 0 ? (
                    discountItems.map((item, index) => (
                      <tr key={`discount-${index}`}>
                        <td className="border-r border-b border-gray-400 py-2 px-3 text-red-600">{item.description}</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">{item.quantity}</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3 text-red-600">{Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-gray-400 text-right py-2 px-3 text-red-600">{Number(item.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    parseFloat(receipt.discount || 0) > 0 && (
                      <tr>
                        <td className="border-r border-b border-gray-400 py-2 px-3 text-red-600">ส่วนลด</td>
                        <td className="border-r border-b border-gray-400 text-center py-2 px-3">1</td>
                        <td className="border-r border-b border-gray-400 text-right py-2 px-3 text-red-600">-{Number(receipt.discount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-gray-400 text-right py-2 px-3 text-red-600">-{Number(receipt.discount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )
                  )}
                  
                  {/* ยอดรวม */}
                  <tr className="bg-gray-50">
                    <td className="border-r border-gray-400 py-3 px-3 font-bold text-gray-700" colSpan="3">รวมทั้งสิ้น / Grand Total</td>
                    <td className="text-right py-3 px-3 font-bold text-gray-700">
                      {Number(receipt.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
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
                {/* กล่องวิธีการชำระเงิน */}
                <div className="border border-gray-400 rounded p-3 mb-4 bg-gray-50 w-[250px]">
                  <p className="font-medium text-gray-700 mb-1">วิธีการชำระเงิน</p>
                  <p className="text-sm text-gray-800">
                    {receipt.payment_method === 'cash' && 'เงินสด'}
                    {receipt.payment_method === 'bank_transfer' && 'โอนเงิน'}
                    {receipt.payment_method === 'promptpay' && 'พร้อมเพย์'}
                    {receipt.payment_method === 'credit_card' && 'บัตรเครดิต'}
                    {!['cash','bank_transfer','promptpay','credit_card'].includes(receipt.payment_method) && 'เงินสด'}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-3 underline">หมายเหตุ:</p>
                {/* แสดงหมายเหตุใบเสร็จ */}
                <p className="text-xs text-gray-500">{receipt.receipt_note}</p>      
              </div>
              {/* ขวา: กล่องผู้รับเงิน */}
              <div className="text-center">
                <div className="border border-gray-400 p-4 rounded bg-gray-50">
                  <p className="font-medium text-gray-700 mb-6">ผู้รับเงิน</p>
                  {/* ช่องจำนวนเงิน */}
                  <div className="mb-4">
                    <div className="text-center">
                      <span className="text-sm text-gray-600">จำนวน</span>
                      <div className="border-b border-gray-500 inline-block w-20 mx-2 text-center">
                        <span className="text-sm">{Number(receipt.total_amount).toLocaleString('th-TH')}</span>
                      </div>
                      <span className="text-sm text-gray-600">บาท</span>
                    </div>
                    <div className="mt-1 text-center">
                      <span className="text-xs text-gray-500">( _______________________________________ )</span>
                    </div>
                  </div>
                  {/* ช่องชื่อผู้ชำระ/ผู้รับ */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="border-b border-gray-500 h-6 mb-1"></div>
                      <p className="text-xs text-gray-600">ผู้ชำระเงิน</p>
                      <p className="text-xs text-gray-500 mt-1">( ___________________________ )</p>
                    </div>
                    <div>
                      <div className="border-b border-gray-500 h-6 mb-1"></div>
                      <p className="text-xs text-gray-600">ผู้รับเงิน</p>
                      <p className="text-xs text-gray-500 mt-1">( ___________________________ )</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/* ปุ่มดูข้อมูลผู้เช่า เฉพาะกรณีมาจากหน้า MonthlyContract */}
    {fromMonthlyContract && (
      <div className="flex justify-center mt-6 print:hidden">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-md flex items-center gap-2 transition-all duration-200"
          onClick={() => navigate(`/dorm/${dormId}/contracts/${contractId}/detail`)}
        >
          ดูข้อมูลผู้เช่า
        </button>
      </div>
    )}
  </div>
  );
}

export default ReceiptPrint;
