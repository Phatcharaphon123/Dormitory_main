import React from 'react';

const MoveOutReceiptPrint = {
  // ฟังก์ชันสร้าง receipt items จากข้อมูล move out receipt
  createMoveOutReceiptItems: (moveOutData) => {

    const formattedItems = [];

    // ดึงรายการจาก items
    const allItems = moveOutData.items || [];
    

    // ถ้าไม่มี items ให้ลองสร้างจากข้อมูลหลัก
    if (allItems.length === 0) {
  
      // ถ้าเป็นการคืนเงิน ให้สร้างรายการคืนเงิน
      if (moveOutData.finalAmount < 0) {
        formattedItems.push({
          id: 'refund_deposit',
          description: 'คืนเงินมัดจำ',
          type: 'refund',
          units: 1,
          rate: Math.abs(moveOutData.finalAmount),
          amount: moveOutData.finalAmount // เก็บเป็นลบ
        });
      }
      return formattedItems;
    }
    
    // แยกประเภทรายการ
    const chargeItems = allItems.filter(item => ['charge', 'penalty', 'damage', 'cleaning', 'other'].includes(item.type));
    const utilityItems = allItems.filter(item => ['water', 'electric', 'utility', 'meter'].includes(item.type));
    const refundItems = allItems.filter(item => ['refund', 'deposit_refund', 'discount'].includes(item.type));

    // เพิ่มรายการค่าใช้จ่าย
    chargeItems.forEach((item, index) => {
      formattedItems.push({
        id: `charge_${index}`,
        description: item.description,
        type: 'charge',
        units: parseInt(item.unit || item.quantity) || 1,
        rate: parseFloat(item.pricePerUnit || item.price_per_unit || item.unitPrice) || 0,
        amount: parseFloat(item.amount || item.totalPrice) || 0
      });
    });

    // เพิ่มรายการค่าสาธารณูปโภค
    utilityItems.forEach((item, index) => {
      formattedItems.push({
        id: `utility_${index}`,
        description: item.description,
        type: 'utility',
        units: parseInt(item.unit || item.quantity) || 1,
        rate: parseFloat(item.pricePerUnit || item.price_per_unit || item.unitPrice) || 0,
        amount: parseFloat(item.amount || item.totalPrice) || 0
      });
    });

    // เพิ่มรายการเงินคืน (แสดงเป็นลบ)
    refundItems.forEach((item, index) => {
      const amount = parseFloat(item.amount || item.totalPrice) || 0;
      
      formattedItems.push({
        id: `refund_${index}`,
        description: item.description,
        type: 'refund',
        units: parseInt(item.unit || item.quantity) || 1,
        rate: parseFloat(item.pricePerUnit || item.price_per_unit || item.unitPrice) || 0,
        amount: amount < 0 ? amount : -Math.abs(amount) // ทำให้เป็นลบเสมอ
      });
    });
    return formattedItems;
  },

  // ฟังก์ชันสร้าง receipt data สำหรับ move out receipt
  createMoveOutReceiptData: (moveOutData, dormData = {}) => {
    const receiptItems = MoveOutReceiptPrint.createMoveOutReceiptItems(moveOutData);
    
    // คำนวณยอดรวม
    const totalCharges = receiptItems
      .filter(item => ['charge', 'utility'].includes(item.type))
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalRefunds = receiptItems
      .filter(item => item.type === 'refund')
      .reduce((sum, item) => sum + item.amount, 0); // refunds เป็นลบแล้ว
    
    const finalTotal = moveOutData.finalAmount !== undefined 
      ? parseFloat(moveOutData.finalAmount) 
      : (totalCharges + totalRefunds);

    return {
      dormInfo: {
        name: moveOutData.dormName || dormData.name || 'Sweet Roomie Dorm',
        address: moveOutData.dormAddress?.split(' ')[0] || dormData.address || '86/12 ถนนราชพฤกษ์',
        phone: moveOutData.dormPhone || dormData.phone || '061-234-5678',
        subdistrict: dormData.subdistrict || '',
        district: dormData.district || '',
        province: dormData.province || '',
      },
      tenantInfo: {
        name: moveOutData.tenantName || 'ไม่ระบุชื่อผู้เช่า',
        phone: moveOutData.tenantPhone || '',
        address: moveOutData.tenantAddressMain || moveOutData.tenantAddress?.split(' ')[0] || 'ไม่ระบุที่อยู่',
        subdistrict: moveOutData.tenantSubdistrict || '',
        district: moveOutData.tenantDistrict || '',
        province: moveOutData.tenantProvince || '',
      },
      receiptNumber: moveOutData.receipt_number || moveOutData.receiptNumber || 'MO' + Date.now(),
      roomNumber: moveOutData.roomNumber || 'N/A',
      roomType: moveOutData.roomType || 'N/A',
      date: moveOutData.checkoutDate ? new Date(moveOutData.checkoutDate).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH'),
      paymentMethod: moveOutData.paymentMethod || 'เงินสด',
      total: finalTotal,
      items: receiptItems,
      note: moveOutData.receiptNote || ''
    };
  },

  // ฟังก์ชันสร้าง HTML สำหรับใบเสร็จการย้ายออก
  generateMoveOutReceiptHTML: (moveOutData, dormData = {}, receiptNote = '') => {
    const receiptData = MoveOutReceiptPrint.createMoveOutReceiptData(moveOutData, dormData);
    const receiptItems = receiptData.items;
    const finalAmount = receiptData.total;

    // แปลงวิธีการชำระเงิน
    const getPaymentMethodText = (method) => {
      switch (method) {
        case 'เงินสด': return 'เงินสด';
        case 'โอนเงิน': return 'โอนเงิน';
        case 'พร้อมเพย์': return 'พร้อมเพย์';
        case 'บัตรเครดิต': return 'บัตรเครดิต';
        default: return 'เงินสด';
      }
    };

    // จัดกลุ่มรายการตามประเภท
    const utilityItems = receiptItems.filter(item => item.type === 'utility');
    const chargeItems = receiptItems.filter(item => item.type === 'charge');
    const refundItems = receiptItems.filter(item => item.type === 'refund');

    return `
      <div class="print-container">
        <div class="print-header">
          <div class="print-header-content">
            <h1 class="print-receipt-title">ใบเสร็จการย้ายออก</h1>
            <h2 class="print-company-name">${receiptData.dormInfo.name}</h2>
            <div class="print-company-details">
              ${receiptData.dormInfo.address}<br/>
              ${[
                receiptData.dormInfo.subdistrict && `ตำบล${receiptData.dormInfo.subdistrict}`,
                receiptData.dormInfo.district && `อำเภอ${receiptData.dormInfo.district}`,
                receiptData.dormInfo.province && `จังหวัด${receiptData.dormInfo.province}`
              ].filter(Boolean).join(' ') || 'ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี'}<br/>
              โทรศัพท์: ${receiptData.dormInfo.phone}
            </div>
          </div>
        </div>

        <div class="print-info-section">
          <div class="print-info-left">
            <h3 class="print-customer-title">ข้อมูลผู้ย้ายออก</h3>
            <div class="print-info-details">
              <p><span class="print-label">ชื่อ:</span> ${receiptData.tenantInfo.name}</p>
              <p><span class="print-label">เบอร์โทร:</span> ${receiptData.tenantInfo.phone || 'ไม่ระบุ'}</p>
              <p><span class="print-label">ที่อยู่:</span> ${receiptData.tenantInfo.address}</p>
              ${(receiptData.tenantInfo.subdistrict || receiptData.tenantInfo.district || receiptData.tenantInfo.province) ? `<p>${[
                receiptData.tenantInfo.subdistrict && `ตำบล${receiptData.tenantInfo.subdistrict}`,
                receiptData.tenantInfo.district && `อำเภอ${receiptData.tenantInfo.district}`,
                receiptData.tenantInfo.province && `จังหวัด${receiptData.tenantInfo.province}`
              ].filter(Boolean).join(' ')}</p>` : ''}
            </div>
          </div>
          <div class="print-info-right">
            <h3 class="print-receipt-details-title">รายละเอียดการย้ายออก</h3>
            <div class="print-receipt-details">
              <p><span class="print-label">เลขที่ / No:</span> ${receiptData.receiptNumber}</p>
              <p><span class="print-label">วันที่ย้ายออก / Date:</span> ${receiptData.date}</p>
              <p><span class="print-label">ห้อง / Room:</span> ${receiptData.roomNumber}</p>
              <p><span class="print-label">ประเภทห้อง / Roomtype:</span> ${receiptData.roomType}</p>
              ${moveOutData.deposit ? `<p><span class="print-label">เงินประกัน / Deposit:</span> ${Number(moveOutData.deposit).toLocaleString()} บาท</p>` : ''}
            </div>
          </div>
        </div>

        <div class="print-table-section">
          <h3 class="print-table-title">รายการการชำระ</h3>
          
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
                ${utilityItems.map(item => `
                  <tr>
                    <td class="print-td print-description-col">${item.description}</td>
                    <td class="print-td print-center">${item.units}</td>
                    <td class="print-td print-right">${Number(item.rate).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td class="print-td print-right">${Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                
                ${chargeItems.map(item => `
                  <tr>
                    <td class="print-td print-description-col">${item.description}</td>
                    <td class="print-td print-center">${item.units}</td>
                    <td class="print-td print-right">${Number(item.rate).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td class="print-td print-right">${Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                
                ${refundItems.map(item => `
                  <tr>
                    <td class="print-td print-description-col print-refund">${item.description}</td>
                    <td class="print-td print-center">${item.units}</td>
                    <td class="print-td print-right print-refund">-${Number(Math.abs(item.rate)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td class="print-td print-right print-refund">${Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                
                <tr class="print-total-row">
                  <td class="print-td print-total-label" colspan="3">
                    รวมทั้งสิ้น / Grand Total
                  </td>
                  <td class="print-td print-total-amount">
                    ${finalAmount >= 0 
                      ? Number(finalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                      : Number(finalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                    } บาท
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
                <p class="print-payment-text">${getPaymentMethodText(receiptData.paymentMethod)}</p>
              </div>
              
              <div class="print-notes-section">
                <p class="print-notes-title">หมายเหตุ:</p>
                <p class="print-notes-content">${receiptNote || receiptData.note || 'การย้ายออกจากหอพัก'}</p>
              </div>
            </div>
            
            <div class="print-right-section">
              <div class="print-receiver-box">
                <p class="print-receiver-title">
                  ${finalAmount >= 0 ? 'ผู้รับเงิน' : 'ผู้จ่ายเงินคืน'}
                </p>
                
                <div class="print-amount-section">
                  <div class="print-amount-line">
                    <span class="print-amount-label">จำนวน</span>
                    <div class="print-amount-value">
                      <span>${Number(Math.abs(finalAmount)).toLocaleString('th-TH')}</span>
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
                    <p class="print-signature-label">
                      ${finalAmount >= 0 ? 'ผู้ชำระเงิน' : 'ผู้รับเงินคืน'}
                    </p>
                    <p class="print-signature-underline">( ______________________ )</p>
                  </div>
                  <div class="print-signature-field">
                    <div class="print-signature-line"></div>
                    <p class="print-signature-label">
                      ${finalAmount >= 0 ? 'ผู้รับเงิน' : 'ผู้จ่ายเงินคืน'}
                    </p>
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

  // CSS สำหรับการพิมพ์ (ใช้เหมือน PrintReceipt แต่เพิ่มสไตล์สำหรับ refund)
  getPrintStyles: () => `
    <style id="move-out-receipt-print-styles">
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
      .print-refund { color: #059669; } /* สีเขียวสำหรับเงินคืน */
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

  // ฟังก์ชันพิมพ์ใบเสร็จการย้ายออก
  printMoveOutReceipt: (moveOutData, dormData = {}, receiptNote = '', title = 'ใบเสร็จการย้ายออก', roomNumber = null) => {
    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!moveOutData) {
        console.error('❌ ไม่มี moveOutData');
        alert('ไม่พบข้อมูลใบเสร็จ');
        return;
      }
      
      if (!moveOutData.items || moveOutData.items.length === 0) {

        // ถ้าไม่มี items แต่มี finalAmount ลบ ให้สร้าง items ให้
        if (moveOutData.finalAmount && moveOutData.finalAmount < 0) {
          moveOutData.items = [{
            type: 'refund',
            description: 'คืนเงินมัดจำ',
            amount: moveOutData.finalAmount,
            unit: 1,
            price_per_unit: Math.abs(moveOutData.finalAmount)
          }];
        } else {
          // สร้างรายการเปล่าเพื่อให้สามารถพิมพ์ได้
          moveOutData.items = [];
        }
      }
      
      const printContent = MoveOutReceiptPrint.generateMoveOutReceiptHTML(moveOutData, dormData, receiptNote);
      
      // สร้างชื่อไฟล์สำหรับการดาวน์โหลด - ใช้ roomNumber ที่ส่งเข้ามาก่อน
      const currentRoomNumber = roomNumber || moveOutData.roomNumber || moveOutData.room?.number || 'ไม่ระบุ';
      const fileName = `ใบเสร็จการย้ายออกห้อง-${currentRoomNumber}`;
      
      console.log('📝 สร้างชื่อไฟล์:', fileName, 'จาก roomNumber:', currentRoomNumber);
      
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
      const existingStyles = document.getElementById('move-out-receipt-print-styles');
      if (existingStyles) existingStyles.remove();
      
      const existingPrintArea = document.querySelector('.print-area');
      if (existingPrintArea) existingPrintArea.remove();

      // เพิ่ม CSS และเนื้อหา
      document.head.insertAdjacentHTML('beforeend', MoveOutReceiptPrint.getPrintStyles());
      document.body.insertAdjacentHTML('beforeend', fullPrintContent);

      // ตั้งชื่อไฟล์ (วิธีเดียวกับ PrintReceipt)
      const originalTitle = document.title;
      document.title = fileName;

      // ฟังก์ชันทำความสะอาด
      const cleanup = () => {
        document.title = originalTitle;
        const printStylesElement = document.getElementById('move-out-receipt-print-styles');
        const printAreaElement = document.querySelector('.print-area');
        if (printStylesElement) printStylesElement.remove();
        if (printAreaElement) printAreaElement.remove();
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

      console.log('✅ เปิด Print Dialog สำเร็จ - ชื่อไฟล์:', fileName);
      
      return true;
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการพิมพ์:', error);
      alert('เกิดข้อผิดพลาดในการเตรียมข้อมูลสำหรับพิมพ์: ' + error.message);
      return null;
    }
  },

  // ฟังก์ชันดาวน์โหลดเป็น PDF (อาจจะเพิ่มในอนาคต)
  downloadMoveOutReceiptPDF: (moveOutData, dormData = {}, receiptNote = '') => {
    console.log('📄 ฟีเจอร์ดาวน์โหลด PDF จะพัฒนาในอนาคต');
    // TODO: เพิ่มฟีเจอร์ download PDF ในอนาคต
    alert('ฟีเจอร์ดาวน์โหลด PDF จะพัฒนาในอนาคต กรุณาใช้ฟีเจอร์พิมพ์แทน');
  }
};

export default MoveOutReceiptPrint;