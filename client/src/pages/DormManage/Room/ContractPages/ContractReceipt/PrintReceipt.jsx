import React from 'react';

/**
 * Component สำหรับสร้าง HTML และพิมพ์ใบเสร็จรับเงิน
 * ใช้ร่วมกันระหว่าง ReceiptPrint และส่วนอื่นๆ ที่ต้องการพิมพ์ใบเสร็จ
 */
const PrintReceipt = {
  // ฟังก์ชันสร้าง receipt items จากข้อมูลใบเสร็จ
  createReceiptItems: (receipt) => {
    const formattedItems = [];

    // แยกรายการตามประเภท
    const allItems = receipt.all_items || [];
    const depositItems = allItems.filter(item => item.item_type === 'deposit');
    const advanceItems = allItems.filter(item => item.item_type === 'advance');
    const serviceItems = allItems.filter(item => item.item_type === 'service');
    const discountItems = allItems.filter(item => item.item_type === 'discount');
    
    // Fallback ใช้ข้อมูลเดิมถ้าไม่มี all_items
    const fallbackServices = receipt.services ? JSON.parse(receipt.services) : [];

    // เพิ่มเงินประกัน (ค่าจำ)
    if (depositItems.length > 0) {
      depositItems.forEach((item, index) => {
        formattedItems.push({
          id: `deposit_${index}`,
          description: item.description,
          type: 'deposit',
          units: parseInt(item.quantity) || 1,
          rate: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.total_price) || 0
        });
      });
    } else if (parseFloat(receipt.deposit_amount || receipt.deposit_monthly || 0) > 0) {
      formattedItems.push({
        id: `deposit_${receipt.id}`,
        description: 'เงินประกัน',
        type: 'deposit',
        units: 1,
        rate: parseFloat(receipt.deposit_amount || receipt.deposit_monthly),
        amount: parseFloat(receipt.deposit_amount || receipt.deposit_monthly)
      });
    }

    // เพิ่มค่าเช่าล่วงหน้า
    if (advanceItems.length > 0) {
      advanceItems.forEach((item, index) => {
        formattedItems.push({
          id: `advance_${index}`,
          description: item.description,
          type: 'advance',
          units: parseInt(item.quantity) || 1,
          rate: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.total_price) || 0
        });
      });
    } else if (parseFloat(receipt.advance_amount || 0) > 0) {
      formattedItems.push({
        id: `advance_${receipt.id}`,
        description: 'ค่าเช่าล่วงหน้า',
        type: 'advance',
        units: 1,
        rate: parseFloat(receipt.advance_amount),
        amount: parseFloat(receipt.advance_amount)
      });
    }

    // เพิ่มบริการเพิ่มเติม
    if (serviceItems.length > 0) {
      serviceItems.forEach((item, index) => {
        formattedItems.push({
          id: `service_${index}`,
          description: item.description,
          type: 'service',
          units: parseInt(item.quantity) || 1,
          rate: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.total_price) || 0
        });
      });
    } else if (fallbackServices.length > 0) {
      fallbackServices.forEach((service, index) => {
        formattedItems.push({
          id: `fallback_service_${index}`,
          description: service.description || service.name,
          type: 'service',
          units: parseInt(service.quantity) || 1,
          rate: parseFloat(service.unitPrice || service.price) || 0,
          amount: parseFloat(service.price) || 0
        });
      });
    }

    // เพิ่มส่วนลด
    if (discountItems.length > 0) {
      discountItems.forEach((item, index) => {
        formattedItems.push({
          id: `discount_${index}`,
          description: item.description,
          type: 'discount',
          units: parseInt(item.quantity) || 1,
          rate: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.total_price) || 0
        });
      });
    } else if (parseFloat(receipt.discount || 0) > 0) {
      formattedItems.push({
        id: `discount_${receipt.id}`,
        description: 'ส่วนลด',
        type: 'discount',
        units: 1,
        rate: -parseFloat(receipt.discount),
        amount: -parseFloat(receipt.discount)
      });
    }

    return formattedItems;
  },

  // ฟังก์ชันสร้าง receipt data จากข้อมูลใบเสร็จ
  createReceiptData: (receipt, receiptData = {}) => {
    const formattedItems = PrintReceipt.createReceiptItems(receipt);
    
    // คำนวณยอดรวม - ใช้ total_amount จาก API หรือคำนวณเป็น fallback
    const apiTotal = parseFloat(receipt.total_amount || receipt.amount) || 0;
    const calculatedTotal = formattedItems.reduce((sum, item) => sum + item.amount, 0);
    const finalTotal = apiTotal > 0 ? apiTotal : calculatedTotal;

    return {
      dormInfo: {
        name: receipt.dorm_name || receiptData?.dormInfo?.name || 'Sweet Roomie Dorm',
        address: receipt.dorm_address || receiptData?.dormInfo?.address || '86/12 ถนนราชพฤกษ์',
        phone: receipt.dorm_phone || receiptData?.dormInfo?.phone || '061-234-5678',
        subdistrict: receipt.dorm_subdistrict || receiptData?.dormInfo?.subdistrict || '',
        district: receipt.dorm_district || receiptData?.dormInfo?.district || '',
        province: receipt.dorm_province || receiptData?.dormInfo?.province || '',
      },
      tenantInfo: {
        name: `${receipt.first_name || ''} ${receipt.last_name || ''}`.trim() || 'ไม่ระบุชื่อผู้เช่า',
        phone: receipt.phone_number || '',
        address: receipt.address || receiptData?.tenantInfo?.address || 'ไม่ระบุที่อยู่',
        subdistrict: receipt.subdistrict || receiptData?.tenantInfo?.subdistrict || '',
        district: receipt.district || receiptData?.tenantInfo?.district || '',
        province: receipt.province || receiptData?.tenantInfo?.province || '',
      },
      receiptNumber: receipt.receipt_number || 'RCP' + (receipt.id || Date.now()),
      roomNumber: receipt.room_number || 'N/A',
      roomType: receipt.room_type || 'N/A',
      date: receipt.created_at ? new Date(receipt.created_at).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH'),
      paymentMethod: receipt.payment_method || 'cash',
      total: finalTotal,
      items: formattedItems,
      note: receipt.receipt_note || ''
    };
  },

  // ฟังก์ชันสร้าง HTML สำหรับใบเสร็จรับเงิน (แบบใหม่ที่รับ receiptItems)
  generateReceiptHTMLWithItems: (receipt, receiptData = {}, receiptItems = [], receiptNote = '') => {
    // ใช้ receiptItems ที่ส่งมา หากไม่มีก็สร้างใหม่
    const actualReceiptItems = receiptItems && receiptItems.length > 0 
      ? receiptItems 
      : PrintReceipt.createReceiptItems(receipt);
      
    // คำนวณยอดรวมจาก receiptItems ที่ใช้จริง
    const calculatedTotal = actualReceiptItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const apiTotal = parseFloat(receipt.total_amount || receipt.amount) || 0;
    const totalAmount = apiTotal > 0 ? apiTotal : calculatedTotal;

    // สร้าง currentReceiptData โดยไม่ใช้ createReceiptData เพื่อหลีกเลี่ยงการสร้าง items ซ้ำ
    const currentReceiptData = {
      dormInfo: {
        name: receipt.dorm_name || receiptData?.dormInfo?.name || 'Sweet Roomie Dorm',
        address: receipt.dorm_address || receiptData?.dormInfo?.address || '86/12 ถนนราชพฤกษ์',
        phone: receipt.dorm_phone || receiptData?.dormInfo?.phone || '061-234-5678',
        subdistrict: receipt.dorm_subdistrict || receiptData?.dormInfo?.subdistrict || '',
        district: receipt.dorm_district || receiptData?.dormInfo?.district || '',
        province: receipt.dorm_province || receiptData?.dormInfo?.province || '',
      },
      tenantInfo: {
        name: `${receipt.first_name || ''} ${receipt.last_name || ''}`.trim() || receiptData?.tenantInfo?.name || 'ไม่ระบุชื่อผู้เช่า',
        phone: receipt.phone_number || receiptData?.tenantInfo?.phone || '',
        address: receipt.address || receiptData?.tenantInfo?.address || 'ไม่ระบุที่อยู่',
        subdistrict: receipt.subdistrict || receiptData?.tenantInfo?.subdistrict || '',
        district: receipt.district || receiptData?.tenantInfo?.district || '',
        province: receipt.province || receiptData?.tenantInfo?.province || '',
      },
      receiptNumber: receipt.receipt_number || receiptData?.receiptNumber || 'RCP' + (receipt.id || Date.now()),
      roomNumber: receipt.room_number || receiptData?.roomNumber || 'N/A',
      roomType: receipt.room_type || receiptData?.roomType || 'N/A',
      date: receipt.created_at ? new Date(receipt.created_at).toLocaleDateString('th-TH') : receiptData?.date || new Date().toLocaleDateString('th-TH'),
      paymentMethod: receipt.payment_method || receiptData?.paymentMethod || 'cash',
      note: receipt.receipt_note || receiptData?.note || ''
    };

    // แปลงวิธีการชำระเงิน
    const getPaymentMethodText = (method) => {
      switch (method) {
        case 'cash': return 'เงินสด';
        case 'bank_transfer': return 'โอนเงิน';
        case 'promptpay': return 'พร้อมเพย์';
        case 'credit_card': return 'บัตรเครดิต';
        default: return 'เงินสด';
      }
    };

    return `
      <div class="print-container">
        <div class="print-header">
          <div class="print-header-content">
            <h1 class="print-receipt-title">ใบเสร็จรับเงิน</h1>
            <h2 class="print-company-name">${currentReceiptData.dormInfo.name}</h2>
            <div class="print-company-details">
              ${currentReceiptData.dormInfo.address ? currentReceiptData.dormInfo.address : '86/12 ถนนราชพฤกษ์'}<br/>
              ${[
                currentReceiptData.dormInfo.subdistrict && `ตำบล${currentReceiptData.dormInfo.subdistrict}`,
                currentReceiptData.dormInfo.district && `อำเภอ${currentReceiptData.dormInfo.district}`,
                currentReceiptData.dormInfo.province && `จังหวัด${currentReceiptData.dormInfo.province}`
              ].filter(Boolean).join(' ') || 'ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี'}<br/>
              โทรศัพท์: ${currentReceiptData.dormInfo.phone || '061-234-5678'}
            </div>
          </div>
        </div>

        <div class="print-info-section">
          <div class="print-info-left">
            <h3 class="print-customer-title">ข้อมูลผู้ชำระ</h3>
            <div class="print-info-details">
              <p><span class="print-label">ชื่อ:</span> ${currentReceiptData.tenantInfo.name}</p>
              <p><span class="print-label">เบอร์โทร:</span> ${currentReceiptData.tenantInfo.phone || '-'}</p>
              <p><span class="print-label">ที่อยู่:</span> ${currentReceiptData.tenantInfo.address}</p>
              ${currentReceiptData.tenantInfo.address && currentReceiptData.tenantInfo.address !== 'ไม่ระบุที่อยู่' ? `<p>${[
                currentReceiptData.tenantInfo.subdistrict && `ตำบล${currentReceiptData.tenantInfo.subdistrict}`,
                currentReceiptData.tenantInfo.district && `อำเภอ${currentReceiptData.tenantInfo.district}`,
                currentReceiptData.tenantInfo.province && `จังหวัด${currentReceiptData.tenantInfo.province}`
              ].filter(Boolean).join(' ')}</p>` : ''}
            </div>
          </div>
          <div class="print-info-right">
            <h3 class="print-receipt-details-title">รายละเอียดใบเสร็จ</h3>
            <div class="print-receipt-details">
              <p><span class="print-label">เลขที่ / No:</span> ${currentReceiptData.receiptNumber}</p>
              <p><span class="print-label">วันที่ / Date:</span> ${currentReceiptData.date}</p>
              <p><span class="print-label">ห้อง / Room:</span> ${currentReceiptData.roomNumber}</p>
              <p><span class="print-label">ประเภทห้อง / Roomtype:</span> ${currentReceiptData.roomType}</p>
            </div>
          </div>
        </div>

        <div class="print-table-section">
          <h3 class="print-table-title">รายการค่าใช้จ่าย</h3>
          
          <div class="print-table-wrapper">
            <table class="print-table">
              <thead>
                <tr class="print-header-row">
                  <th class="print-th print-description-col">รายการ / Description</th>
                  <th class="print-th print-center">จำนวนหน่วย</th>
                  <th class="print-th print-center">ราคาต่อหน่วย</th>
                  <th class="print-th print-center">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                ${actualReceiptItems.map(item => `
                  <tr>
                    <td class="print-td print-description-col ${item.type === 'discount' ? 'print-discount' : ''}">${item.description || item.type}</td>
                    <td class="print-td print-center">${item.units || 1}</td>
                    <td class="print-td print-right ${item.type === 'discount' ? 'print-discount' : ''}">${Number(parseFloat(item.rate) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td class="print-td print-right ${item.type === 'discount' ? 'print-discount' : ''}">${Number(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                
                <tr class="print-total-row">
                  <td class="print-td print-total-label" colspan="3">รวมทั้งสิ้น / Grand Total</td>
                  <td class="print-td print-total-amount">
                    ${Number(parseFloat(totalAmount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="print-signature-wrapper">
          <div class="print-signature-grid">
            <div class="print-left-section">
              <div class="print-payment-box">
                <p class="print-payment-title">วิธีการชำระเงิน</p>
                <p class="print-payment-text">${getPaymentMethodText(currentReceiptData.paymentMethod)}</p>
              </div>
              
              <div class="print-notes-section">
                <p class="print-notes-title">หมายเหตุ:</p>
                <p class="print-notes-content">${receiptNote || currentReceiptData.note || ''}</p>
              </div>
            </div>
            
            <div class="print-right-section">
              <div class="print-receiver-box">
                <p class="print-receiver-title">ผู้รับเงิน</p>
                
                <div class="print-amount-section">
                  <div class="print-amount-line">
                    <span class="print-amount-label">จำนวน</span>
                    <div class="print-amount-value">
                      <span>${Number(parseFloat(totalAmount) || 0).toLocaleString('th-TH')}</span>
                    </div>
                    <span class="print-amount-label">บาท</span>
                  </div>
                  <div class="print-amount-words">
                    <span>( _______________________________________ )</span>
                  </div>
                </div>
                
                <div class="print-signature-fields">
                  <div class="print-signature-field">
                    <div class="print-signature-line"></div>
                    <p class="print-signature-label">ผู้ชำระเงิน</p>
                    <p class="print-signature-underline">( ______________________ )</p>
                  </div>
                  <div class="print-signature-field">
                    <div class="print-signature-line"></div>
                    <p class="print-signature-label">ผู้รับเงิน</p>
                    <p class="print-signature-underline">( ______________________ )</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ฟังก์ชันสร้าง HTML สำหรับใบเสร็จรับเงิน
  generateReceiptHTML: (receipt, receiptData = {}, receiptNote = '') => {
    const currentReceiptData = PrintReceipt.createReceiptData(receipt, receiptData);
    const receiptItems = currentReceiptData.items;
    const totalAmount = currentReceiptData.total;

    // แปลงวิธีการชำระเงิน
    const getPaymentMethodText = (method) => {
      switch (method) {
        case 'cash': return 'เงินสด';
        case 'bank_transfer': return 'โอนเงิน';
        case 'promptpay': return 'พร้อมเพย์';
        case 'credit_card': return 'บัตรเครดิต';
        default: return 'เงินสด';
      }
    };

    return `
      <div class="print-container">
        <div class="print-header">
          <div class="print-header-content">
            <h1 class="print-receipt-title">ใบเสร็จรับเงิน</h1>
            <h2 class="print-company-name">${currentReceiptData.dormInfo.name}</h2>
            <div class="print-company-details">
              ${currentReceiptData.dormInfo.address ? currentReceiptData.dormInfo.address : '86/12 ถนนราชพฤกษ์'}<br/>
              ${[
                currentReceiptData.dormInfo.subdistrict && `ตำบล${currentReceiptData.dormInfo.subdistrict}`,
                currentReceiptData.dormInfo.district && `อำเภอ${currentReceiptData.dormInfo.district}`,
                currentReceiptData.dormInfo.province && `จังหวัด${currentReceiptData.dormInfo.province}`
              ].filter(Boolean).join(' ') || 'ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี'}<br/>
              โทรศัพท์: ${currentReceiptData.dormInfo.phone || '061-234-5678'}
            </div>
          </div>
        </div>

        <div class="print-info-section">
          <div class="print-info-left">
            <h3 class="print-customer-title">ข้อมูลผู้ชำระ</h3>
            <div class="print-info-details">
              <p><span class="print-label">ชื่อ:</span> ${currentReceiptData.tenantInfo.name}</p>
              <p><span class="print-label">เบอร์โทร:</span> ${currentReceiptData.tenantInfo.phone || '-'}</p>
              <p><span class="print-label">ที่อยู่:</span> ${currentReceiptData.tenantInfo.address}</p>
              ${currentReceiptData.tenantInfo.address && currentReceiptData.tenantInfo.address !== 'ไม่ระบุที่อยู่' ? `<p>${[
                currentReceiptData.tenantInfo.subdistrict && `ตำบล${currentReceiptData.tenantInfo.subdistrict}`,
                currentReceiptData.tenantInfo.district && `อำเภอ${currentReceiptData.tenantInfo.district}`,
                currentReceiptData.tenantInfo.province && `จังหวัด${currentReceiptData.tenantInfo.province}`
              ].filter(Boolean).join(' ')}</p>` : ''}
            </div>
          </div>
          <div class="print-info-right">
            <h3 class="print-receipt-details-title">รายละเอียดใบเสร็จ</h3>
            <div class="print-receipt-details">
              <p><span class="print-label">เลขที่ / No:</span> ${currentReceiptData.receiptNumber}</p>
              <p><span class="print-label">วันที่ / Date:</span> ${currentReceiptData.date}</p>
              <p><span class="print-label">ห้อง / Room:</span> ${currentReceiptData.roomNumber}</p>
              <p><span class="print-label">ประเภทห้อง / Roomtype:</span> ${currentReceiptData.roomType}</p>
            </div>
          </div>
        </div>
        <div class="print-table-section">
          <h3 class="print-table-title">รายการค่าใช้จ่าย</h3>
          
          <div class="print-table-wrapper">
            <table class="print-table">
              <thead>
                <tr class="print-header-row">
                  <th class="print-th print-description-col">รายการ / Description</th>
                  <th class="print-th print-center">จำนวนหน่วย</th>
                  <th class="print-th print-center">ราคาต่อหน่วย</th>
                  <th class="print-th print-center">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                ${receiptItems.map(item => `
                  <tr>
                    <td class="print-td print-description-col ${item.type === 'discount' ? 'print-discount' : ''}">${item.description}</td>
                    <td class="print-td print-center">${item.units || 1}</td>
                    <td class="print-td print-right ${item.type === 'discount' ? 'print-discount' : ''}">${Number(parseFloat(item.rate) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td class="print-td print-right ${item.type === 'discount' ? 'print-discount' : ''}">${Number(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                
                <tr class="print-total-row">
                  <td class="print-td print-total-label" colspan="3">รวมทั้งสิ้น / Grand Total</td>
                  <td class="print-td print-total-amount">
                    ${Number(parseFloat(totalAmount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="print-signature-wrapper">
          <div class="print-signature-grid">
            <div class="print-left-section">
              <div class="print-payment-box">
                <p class="print-payment-title">วิธีการชำระเงิน</p>
                <p class="print-payment-text">${getPaymentMethodText(currentReceiptData.paymentMethod)}</p>
              </div>
              
              <div class="print-notes-section">
                <p class="print-notes-title">หมายเหตุ:</p>
                <p class="print-notes-content">${receiptNote || currentReceiptData.note || ''}</p>
              </div>
            </div>
            
            <div class="print-right-section">
              <div class="print-receiver-box">
                <p class="print-receiver-title">ผู้รับเงิน</p>
                
                <div class="print-amount-section">
                  <div class="print-amount-line">
                    <span class="print-amount-label">จำนวน</span>
                    <div class="print-amount-value">
                      <span>${Number(parseFloat(totalAmount) || 0).toLocaleString('th-TH')}</span>
                    </div>
                    <span class="print-amount-label">บาท</span>
                  </div>
                  <div class="print-amount-words">
                    <span>( _______________________________________ )</span>
                  </div>
                </div>
                
                <div class="print-signature-fields">
                  <div class="print-signature-field">
                    <div class="print-signature-line"></div>
                    <p class="print-signature-label">ผู้ชำระเงิน</p>
                    <p class="print-signature-underline">( _______________________ )</p>
                  </div>
                  <div class="print-signature-field">
                    <div class="print-signature-line"></div>
                    <p class="print-signature-label">ผู้รับเงิน</p>
                    <p class="print-signature-underline">( ______________________ )</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // CSS สำหรับการพิมพ์
  getPrintStyles: () => `
    <style id="shared-receipt-print-styles">
      @media print {
        @page { size: A4; margin: 0; }

        html, body { height: auto !important; overflow: visible !important; }

        /* ซ่อนทุกอย่างนอก .print-area ออกจากเลย์เอาต์เลย (ไม่กินพื้นที่) */
        body > :not(.print-area) { display: none !important; }

        /* พื้นที่พิมพ์หลัก */
        .print-area {
          position: static;               
          width: 100%;
          font-family: 'Prompt','TH SarabunPSK','Sarabun',Arial,sans-serif;
          font-size: 14px; line-height: 1.3; color: #000;
        }

        /* รองรับหลายใบเสร็จ (ขึ้นหน้าใหม่ตาม marker) */
        .print-area > div[style*="page-break-after: always"] {
          page-break-after: always !important;
          break-after: always !important;
        }

        /* ใบเสร็จแต่ละใบ */
        .print-receipt {
          width: 100%;
          padding: 0; margin: 0;
          page-break-inside: auto; 
          break-inside: auto;
        }

        /* ตาราง: อนุญาตให้แตกหน้าได้ แต่ไม่แตก "กลางแถว" */
        .print-table { page-break-inside: auto; break-inside: auto; }
        .print-table tr { page-break-inside: avoid; break-inside: avoid; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }

        /* ผ่อนคลายจาก avoid ทั้งก้อน (ของเดิมทำให้โดดไปหน้าใหม่ง่าย) */
        .print-header,
        .print-info-section,
        .print-table,
        .print-signature-wrapper {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }

        /* ซ่อน header/footer ของเบราว์เซอร์ */
        body::before, body::after { display: none !important; }
      }

      /* —— สไตล์จอ/ร่วม —— */
      .print-container{
        max-width: 100%;
        margin: 0;
        padding: 24px;         
        height: auto;
        box-sizing: border-box;
        width: 100%;
        background: white;
      }

      /* Header Styles */
      .print-header { 
        text-align: center; 
        border-bottom: 1px solid #d1d5db; 
        padding-bottom: 16px; 
        margin-bottom: 16px; 
      }
      .print-header-content { margin: 0 auto; }
      .print-receipt-title { 
        font-size: 24px; 
        font-weight: bold; 
        margin-bottom: 4px; 
        color: #374151; 
      }
      .print-company-name { 
        font-size: 18px; 
        color: #4b5563; 
        margin-bottom: 4px; 
      }
      .print-company-details { 
        font-size: 12px; 
        line-height: 1.4; 
        color: #6b7280; 
        margin-top: 4px; 
      }

      /* Info Section Styles */
      .print-info-section { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 24px; 
        margin-bottom: 24px; 
      }
      .print-info-left { }
      .print-info-right { text-align: left; }
      .print-customer-title, .print-receipt-details-title { 
        font-size: 18px; 
        font-weight: 600; 
        color: #374151; 
        margin-bottom: 8px; 
      }
      .print-info-details, .print-receipt-details { 
        font-size: 14px; 
        line-height: 1.5; 
      }
      .print-info-details p, .print-receipt-details p { 
        margin: 4px 0; 
      }
      .print-label { 
        font-weight: 500; 
      }

      /* Table Section Styles */
      .print-table-section { margin-bottom: 24px; }
      .print-table-title { 
        font-size: 18px; 
        font-weight: 600; 
        color: #374151; 
        margin-bottom: 12px; 
      }
      .print-table-wrapper { 
        border-radius: 4px; 
        overflow: hidden; 
        border: 1px solid #9ca3af; 
      }
      .print-table { 
        width: 100%; 
        border-collapse: collapse; 
        border-spacing: 0; 
        font-size: 14px; 
      }
      .print-th { 
        border-right: 1px solid #9ca3af; 
        border-bottom: 1px solid #9ca3af; 
        padding: 8px 12px; 
        font-weight: 500; 
        color: #374151; 
        background-color: #f9fafb; 
      }
      .print-th:last-child { border-right: none; }
      .print-td { 
        border-right: 1px solid #9ca3af; 
        border-bottom: 1px solid #9ca3af; 
        padding: 8px 12px; 
      }
      .print-td:last-child { border-right: none; }
      .print-description-col { text-align: left !important; }
      .print-center { text-align: center; }
      .print-right { text-align: right; }
      .print-discount { color: #dc2626; }
      .print-total-row { background-color: #f9fafb; }
      .print-total-label { 
        font-weight: bold; 
        font-size: 16px; 
        color: #374151; 
        border-bottom: 0px; 
      }
      .print-total-amount { 
        text-align: right; 
        font-weight: bold; 
        font-size: 16px; 
        color: #374151; 
        border-bottom: 0px; 
      }

      /* Signature Section Styles */
      .print-signature-wrapper { 
        border-top: 1px solid #d1d5db; 
        padding-top: 16px; 
        margin-bottom: 24px; 
      }
      .print-signature-grid { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 24px; 
      }

      /* Left Section - Payment & Notes */
      .print-left-section { }
      .print-payment-box { 
        border: 1px solid #9ca3af; 
        border-radius: 4px; 
        padding: 12px; 
        background-color: #f9fafb; 
        width: 250px; 
        margin-bottom: 16px; 
      }
      .print-payment-title { 
        font-weight: 500; 
        color: #374151; 
        margin-bottom: 4px; 
      }
      .print-payment-text { 
        font-size: 14px; 
        color: #111827; 
      }
      .print-notes-section { }
      .print-notes-title { 
        font-size: 14px; 
        color: #4b5563; 
        margin-bottom: 12px; 
        text-decoration: underline; 
      }
      .print-notes-content { 
        font-size: 12px; 
        color: #6b7280; 
      }

      /* Right Section - Receiver Box */
      .print-right-section { text-align: center; }
      .print-receiver-box { 
        border: 1px solid #9ca3af; 
        padding: 16px; 
        border-radius: 4px; 
        background-color: #f9fafb; 
      }
      .print-receiver-title { 
        font-weight: 500; 
        color: #374151; 
        margin-bottom: 24px; 
      }

      /* Amount Section */
      .print-amount-section { margin-bottom: 16px; }
      .print-amount-line { 
        text-align: center; 
        margin-bottom: 4px; 
      }
      .print-amount-label { 
        font-size: 14px; 
        color: #4b5563; 
      }
      .print-amount-value { 
        display: inline-block; 
        border-bottom: 1px solid #6b7280; 
        width: 80px; 
        margin: 0 8px; 
        text-align: center; 
      }
      .print-amount-value span { 
        font-size: 14px; 
      }
      .print-amount-words { 
        margin-top: 4px; 
        text-align: center; 
      }
      .print-amount-words span { 
        font-size: 12px; 
        color: #6b7280; 
      }

      /* Signature Fields */
      .print-signature-fields { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 16px; 
        font-size: 14px; 
      }
      .print-signature-field { }
      .print-signature-line { 
        border-bottom: 1px solid #6b7280; 
        height: 24px; 
        margin-bottom: 4px; 
      }
      .print-signature-label { 
        font-size: 12px; 
        color: #4b5563; 
        margin-bottom: 4px; 
      }
      .print-signature-underline { 
        font-size: 12px; 
        color: #6b7280; 
        margin-top: 4px; 
      }
    </style>
  `,

  // ฟังก์ชันสร้าง receipt items จากข้อมูลใบเสร็จ
  generateReceiptItemsFromReceipt: (receipt) => {
    console.log('📝 สร้าง receipt items จากใบเสร็จ:', receipt);
    
    return PrintReceipt.createReceiptItems(receipt);
  },

  // ฟังก์ชันสร้าง receipt data จากข้อมูลใบเสร็จ
  generateReceiptDataFromReceipt: (receipt, globalReceiptData = {}) => {
    return PrintReceipt.createReceiptData(receipt, globalReceiptData);
  },



  // ฟังก์ชันพิมพ์ใบเสร็จเดียว
  printSingleReceipt: (receipt, receiptData = {}, receiptNote = '', title = 'ใบเสร็จรับเงิน', receiptItems = []) => {
    console.log('🖨️ กำลังพิมพ์ใบเสร็จเดียว...', { receipt, receiptItems });
    
    try {
      // ใช้ฟังก์ชันใหม่ที่รับ receiptItems
      const printContent = PrintReceipt.generateReceiptHTMLWithItems(receipt, receiptData, receiptItems, receiptNote);
      
      // ดึงเลขห้องจากข้อมูลใบเสร็จ
      const roomNumber = receipt.room_number || receiptData?.roomNumber || '';
      
      // สำหรับใบเสร็จเดียว ให้ใช้ executePrint แบบปกติ แต่ห่อด้วย CSS ที่ป้องกันหน้าเกิน
      const singleReceiptCSS = `
        <style id="single-receipt-override">
          @media print {
            @page { size: A4; margin: 0; }
            .print-area { height: auto !important; max-height: none !important; }
            .print-container {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              page-break-after: auto !important;
              break-after: auto !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
            }
          }
        </style>
      `;

      
      // เพิ่ม CSS พิเศษสำหรับใบเสร็จเดียว
      const existingSingleCSS = document.getElementById('single-receipt-override');
      if (existingSingleCSS) existingSingleCSS.remove();
      document.head.insertAdjacentHTML('beforeend', singleReceiptCSS);
      
      // ใช้ executePrint แบบปกติ
      PrintReceipt.executePrint(printContent, title, roomNumber);
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการพิมพ์:', error);
      alert('เกิดข้อผิดพลาดในการพิมพ์ กรุณาลองใหม่อีกครั้ง');
    }
  },

  // ฟังก์ชันดำเนินการพิมพ์
  executePrint: (printContent, title = 'ใบเสร็จรับเงิน', roomNumber = '') => {
    // เพิ่ม Google Fonts สำหรับ Prompt
    const existingFontLink = document.querySelector('link[href*="fonts.googleapis.com"]');
    if (!existingFontLink) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'preconnect';
      fontLink.href = 'https://fonts.googleapis.com';
      document.head.appendChild(fontLink);

      const fontLink2 = document.createElement('link');
      fontLink2.rel = 'preconnect';
      fontLink2.href = 'https://fonts.gstatic.com';
      fontLink2.crossOrigin = '';
      document.head.appendChild(fontLink2);

      const fontLink3 = document.createElement('link');
      fontLink3.href = 'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap';
      fontLink3.rel = 'stylesheet';
      document.head.appendChild(fontLink3);
    }

    // สร้างเนื้อหาสำหรับพิมพ์
    const fullPrintContent = `
      <div class="print-area">
        ${printContent}
      </div>
    `;

    // ลบเนื้อหาเก่าถ้ามี
    const existingStyles = document.getElementById('shared-receipt-print-styles');
    if (existingStyles) existingStyles.remove();
    
    const existingPrintArea = document.querySelector('.print-area');
    if (existingPrintArea) existingPrintArea.remove();

    // เพิ่ม CSS และเนื้อหา
    document.head.insertAdjacentHTML('beforeend', PrintReceipt.getPrintStyles());
    document.body.insertAdjacentHTML('beforeend', fullPrintContent);

    // ตั้งชื่อไฟล์
    const originalTitle = document.title;
    // สร้างชื่อไฟล์ที่มีเลขห้อง
    const fileName = roomNumber ? `ใบเสร็จรับเงินสัญญาห้อง-${roomNumber}` : title;
    document.title = fileName;

    // เพิ่มการตั้งค่าการพิมพ์เพิ่มเติม
    const printArea = document.querySelector('.print-area');
    if (printArea) {
      printArea.style.height = 'auto';
      printArea.style.overflow = 'visible';
      printArea.style.pageBreakAfter = 'avoid';
      printArea.style.pageBreakInside = 'avoid';
      printArea.style.breakAfter = 'avoid';
      printArea.style.breakInside = 'avoid';
    }

    // ตั้งค่า CSS เพิ่มเติมสำหรับ body
    document.body.style.pageBreakAfter = 'avoid';
    document.body.style.pageBreakInside = 'avoid';
    document.body.style.breakAfter = 'avoid';
    document.body.style.breakInside = 'avoid';

    // ฟังก์ชันทำความสะอาด
    const cleanup = () => {
      document.title = originalTitle;
      const printStylesElement = document.getElementById('shared-receipt-print-styles');
      const printAreaElement = document.querySelector('.print-area');
      if (printStylesElement) printStylesElement.remove();
      if (printAreaElement) printAreaElement.remove();
      
      // รีเซ็ต body styles หลังจากพิมพ์
      document.body.style.pageBreakAfter = '';
      document.body.style.pageBreakInside = '';
      document.body.style.breakAfter = '';
      document.body.style.breakInside = '';
    };

    // Event listener สำหรับ after print (เมื่อพิมพ์เสร็จหรือยกเลิก)
    const handleAfterPrint = () => {
      console.log('🖨️ Print dialog ปิดแล้ว');
      cleanup();
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    // เพิ่ม event listener
    window.addEventListener('afterprint', handleAfterPrint);

    // พิมพ์
    // รอให้ฟอนต์และรูปพร้อมก่อนเปิด dialog
    const waitForImages = () =>
      Promise.all(Array.from(document.images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => { img.onload = img.onerror = res; });
      }));

    const waitForFonts = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();

    Promise.all([waitForFonts, waitForImages()])
      .then(() => {
        console.log('🖨️ เปิด print dialog');
        window.print();
      });
  }
};

export default PrintReceipt;
