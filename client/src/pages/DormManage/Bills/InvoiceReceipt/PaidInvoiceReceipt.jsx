import React from 'react';
import axios from 'axios';
import API_URL from '../../../../config/api';

const PaidInvoiceReceipt = {
  // ฟังก์ชันดึงข้อมูลจาก API
  fetchReceiptData: async (dormId, invoiceId, paymentId = null) => {
    try {  
      // ดึงข้อมูลใบแจ้งหนี้
      const invoiceResponse = await axios.get(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const invoiceData = invoiceResponse.data;

      // ดึงข้อมูลประวัติการชำระเงิน
      const paymentsResponse = await axios.get(
        `${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}/payments`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      let paymentsData = [];
      if (paymentsResponse.status === 200) {
        paymentsData = paymentsResponse.data;
        console.log('💰 ข้อมูลการชำระเงิน:', paymentsData);
      }

      // ดึงหมายเหตุการชำระเงินจากตาราง default_receipt_notes (ใช้แทนหมายเหตุปกติ)
      let defaultNote = 'ใบเสร็จรับเงินฉบับนี้สำคัญ กรุณาเก็บไว้เป็นหลักฐาน';
      
      try {
        const paymentNoteResponse = await axios.get(
          `${API_URL}/api/receipts/default-note/${dormId}?receipt_type=payment`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        if (paymentNoteResponse.status === 200) {
          const paymentNoteData = paymentNoteResponse.data;
          if (paymentNoteData.note_content) {
            defaultNote = paymentNoteData.note_content;
          }
        }
      } catch (paymentNoteErr) {
        console.error('โหลดหมายเหตุการชำระเงินล้มเหลว:', paymentNoteErr);
      }

      return {
        invoice: invoiceData.invoice,
        invoiceItems: invoiceData.invoice_items || [],
        payments: paymentsData,
        selectedPayment: paymentId ? paymentsData.find(p => {
          // แปลงทั้งคู่เป็น string เพื่อเปรียบเทียบอย่างแม่นยำ
          const pId = String(p.id);
          const searchId = String(paymentId);
          return pId === searchId;
        }) : null,
        defaultNote: defaultNote
      };
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
      throw error;
    }
  },

  // ฟังก์ชันสร้าง receipt items จากข้อมูลบิล
  createReceiptItems: (bill) => {
    const formattedItems = [];

    // เพิ่มค่าเช่า
    if (bill.room_rate && parseFloat(bill.room_rate) > 0) {
      formattedItems.push({
        id: `rent_${bill.id}`,
        description: 'ค่าเช่า/Rent',
        type: 'rent',
        units: 1,
        rate: parseFloat(bill.room_rate),
        amount: parseFloat(bill.room_rate)
      });
    }

    // เพิ่มค่าน้ำ - ✅ รองรับจำนวนหน่วย 0
    if (bill.water_units !== undefined && bill.water_units !== null) {
      const waterUnits = parseInt(bill.water_units);
      const waterRate = parseFloat(bill.water_rate || 0);
      const waterAmount = waterUnits * waterRate;
      
      formattedItems.push({
        id: `water_${bill.id}`,
        description: 'ค่าน้ำ/Water',
        type: 'water',
        units: waterUnits,
        rate: waterRate,
        amount: waterAmount
      });
    }

    // เพิ่มค่าไฟ - ✅ รองรับจำนวนหน่วย 0
    if (bill.electric_units !== undefined && bill.electric_units !== null) {
      const electricUnits = parseInt(bill.electric_units);
      const electricRate = parseFloat(bill.electric_rate || 0);
      const electricAmount = electricUnits * electricRate;
      
      formattedItems.push({
        id: `electric_${bill.id}`,
        description: 'ค่าไฟ/Electricity',
        type: 'electric',
        units: electricUnits,
        rate: electricRate,
        amount: electricAmount
      });
    }

    // เพิ่มค่าบริการอื่นๆ ถ้ามี
    if (bill.utilities && bill.utilities.length > 0) {
      bill.utilities.forEach((utility, index) => {
        if (utility.amount && parseFloat(utility.amount) > 0) {
          formattedItems.push({
            id: `utility_${bill.id}_${index}`,
            description: utility.utility_name || 'ค่าบริการ/Service',
            type: 'utility',
            units: 1,
            rate: parseFloat(utility.amount),
            amount: parseFloat(utility.amount)
          });
        }
      });
    }

    // เพิ่มค่าปรับ
    if (bill.fine && parseFloat(bill.fine) > 0) {
      formattedItems.push({
        id: `fine_${bill.id}`,
        description: 'ค่าปรับ/Fine',
        type: 'fine',
        units: 1,
        rate: parseFloat(bill.fine),
        amount: parseFloat(bill.fine)
      });
    }

    return formattedItems;
  },

  // ฟังก์ชันสร้างข้อมูล receipt หลัก (รองรับข้อมูลจาก API)
  createReceiptData: (invoice, invoiceItems = [], payments = [], tenantInfo = {}, dormitoryInfo = {}, contractInfo = {}) => {
    if (!invoice) return null;
    // ใช้ invoice_items จาก API หรือสร้างจากข้อมูลบิล
    const items = invoiceItems.length > 0 
      ? (() => {
          console.log('🔄 ใช้ createReceiptItemsFromAPI');
          return PaidInvoiceReceipt.createReceiptItemsFromAPI(invoiceItems);
        })()
      : (() => {
          console.log('🔄 ใช้ createReceiptItems');
          return PaidInvoiceReceipt.createReceiptItems(invoice);
        })();

    console.log('🧾 รายการที่ประมวลผลแล้ว:', items);

    // คำนวณ totalAmount จากรายการจริง
    const calculatedTotalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalPaid = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    console.log('🧾 ยอดรวมที่คำนวณได้:', calculatedTotalAmount);
    console.log('🧾 ยอดที่ชำระแล้ว:', totalPaid);

    // สร้างเลขที่ใบเสร็จ
    const receiptNumber = invoice.payment_id 
      ? `RCP${invoice.payment_id}-${Date.now()}`
      : `RCP-${invoice.monthly_invoice_id || invoice.id}-${Date.now()}`;

    return {
      receiptNumber: receiptNumber,
      issueDate: invoice.payment_date 
        ? new Date(invoice.payment_date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : new Date().toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
      dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '',
      tenantInfo: {
        tenant_name: tenantInfo.tenant_name || invoice.tenant_name,
        tenant_address: tenantInfo.tenant_address || invoice.tenant_address || 'ไม่ระบุ',
        tenant_subdistrict: tenantInfo.tenant_subdistrict || invoice.tenant_subdistrict || '',
        tenant_district: tenantInfo.tenant_district || invoice.tenant_district || '',
        tenant_province: tenantInfo.tenant_province || invoice.tenant_province || '',
        room_number: tenantInfo.room_number || invoice.room_number,
        tenant_phone: tenantInfo.tenant_phone || invoice.tenant_phone || ''
      },
      dormitoryInfo: {
        name: dormitoryInfo.name || invoice.dorm_name || 'Sweet Roomie Dorm',
        address: dormitoryInfo.address || invoice.dorm_address || '88/12 ถนนราชพฤกษ์',
        subdistrict: dormitoryInfo.subdistrict || invoice.dorm_subdistrict || '',
        district: dormitoryInfo.district || invoice.dorm_district || '',
        province: dormitoryInfo.province || invoice.dorm_province || '',
        phone: dormitoryInfo.phone || invoice.dorm_phone || '081-234-5678',
        email: dormitoryInfo.email || invoice.dorm_email || ''
      },
      contractInfo: contractInfo || {},
      items: items,
      totalAmount: calculatedTotalAmount, // ใช้ยอดรวมที่คำนวณจากรายการจริง เสมอ
      paymentInfo: invoice.payment_method ? {
        payment_id: invoice.payment_id,
        payment_date: invoice.payment_date,
        payment_amount: invoice.payment_amount,
        payment_method: invoice.payment_method,
        payment_note: invoice.payment_note
      } : null,
      invoice: invoice,
      payments: payments
    };
    
    console.log('🧾 ข้อมูลใบเสร็จที่สร้างขึ้น:', {
      hasPaymentInfo: !!invoice.payment_method,
      paymentMethod: invoice.payment_method,
      paymentInfo: invoice.payment_method ? {
        payment_id: invoice.payment_id,
        payment_date: invoice.payment_date,
        payment_amount: invoice.payment_amount,
        payment_method: invoice.payment_method,
        payment_note: invoice.payment_note
      } : null
    });
  },

  // ฟังก์ชันสร้าง receipt items จากข้อมูล API
  createReceiptItemsFromAPI: (invoiceItems) => {
    console.log('🧾 กำลังแปลงรายการจาก API:', invoiceItems);
    
    const items = invoiceItems.map((item, index) => {
      // แปลงค่าตัวเลขอย่างระมัดระวัง
      const rate = parseFloat(item.rate) || 0;
      let amount = parseFloat(item.amount) || 0;
      
      // จัดการ discount: ถ้าเป็น discount และ amount เป็น positive ให้แปลงเป็น negative
      if (item.type === 'discount' && amount > 0) {
        amount = -amount;
      }
      
      const receiptItem = {
        id: item.invoice_receipt_item_id || `item_${index}`,
        description: item.description || 'ไม่ระบุ',
        type: item.type || 'service',
        units: item.unit_count !== undefined && item.unit_count !== null ? parseInt(item.unit_count) : 1,
        rate: item.type === 'discount' && rate > 0 ? -rate : rate,
        amount: amount
      };
      
      console.log(`🧾 รายการที่ ${index + 1} แปลงแล้ว:`, receiptItem);
      return receiptItem;
    });
    
    return items;
  },

  // ฟังก์ชันสร้าง CSS styles สำหรับการพิมพ์ (ใช้สไตล์เดียวกับ PrintReceipt)
  getPrintStyles: () => {
    return `
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
            font-size: 16px; line-height: 1.3; color: #000;
          }

          /* รองรับหลายบิล (ขึ้นหน้าใหม่ตาม marker) */
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
          font-size: 14px; 
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
        
        /* Receipt footer */
        .receipt-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
      </style>
    `;
  },

  // ฟังก์ชันสร้าง HTML content สำหรับใบเสร็จ (ใช้รูปแบบเดียวกับ PrintReceipt)
  generateReceiptHTMLWithItems: (receiptData, defaultNote = '') => {
    if (!receiptData) return '';

    console.log('🧾 ข้อมูลสำหรับสร้างใบเสร็จ:', receiptData);
    console.log('🧾 รายการสินค้า/บริการ:', receiptData.items);

    const itemsHTML = receiptData.items.map((item, index) => {
      console.log(`🧾 รายการที่ ${index + 1}:`, item);
      
      // จัดการการแสดงผลสำหรับค่าลบ หรือ discount
      const rate = parseFloat(item.rate) || 0;
      const amount = parseFloat(item.amount) || 0;
      
      const displayRate = rate < 0 || item.type === 'discount'
        ? `-${Number(Math.abs(rate)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
        : Number(rate).toLocaleString('th-TH', { minimumFractionDigits: 2 });
        
      const displayAmount = amount < 0 || item.type === 'discount'
        ? `-${Number(Math.abs(amount)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
        : Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 });
      
      return `
        <tr>
          <td class="print-td print-description-col">${item.description}</td>
          <td class="print-td print-center">${item.units !== undefined && item.units !== null ? item.units : 1}</td>
          <td class="print-td print-right">${displayRate}</td>
          <td class="print-td print-right">${displayAmount}</td>
        </tr>
      `;
    }).join('');

    // Debug การแสดงผล totalAmount
    console.log('🧾 totalAmount ที่จะแสดงผล:', receiptData.totalAmount);
    console.log('🧾 ประเภทข้อมูล totalAmount:', typeof receiptData.totalAmount);

    return `
      <div class="print-container">
        <div class="print-header">
          <div class="print-header-content">
            <h1 class="print-receipt-title">ใบเสร็จรับเงิน</h1>
            <h2 class="print-company-name">${receiptData.dormitoryInfo.name || 'Sweet Roomie Dorm'}</h2>
            <div class="print-company-details">
              ${receiptData.dormitoryInfo.address || '88/12 ถนนราชพฤกษ์'}<br/>
              ${[
                receiptData.dormitoryInfo.subdistrict && `ตำบล${receiptData.dormitoryInfo.subdistrict}`,
                receiptData.dormitoryInfo.district && `อำเภอ${receiptData.dormitoryInfo.district}`,
                receiptData.dormitoryInfo.province && `จังหวัด${receiptData.dormitoryInfo.province}`
              ].filter(Boolean).join(' ') || 'ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี'}<br/>
              โทรศัพท์: ${receiptData.dormitoryInfo.phone || '081-234-5678'}
            </div>
          </div>
        </div>

        <div class="print-info-section">
          <div class="print-info-left">
            <h3 class="print-customer-title">ข้อมูลผู้ชำระ</h3>
            <div class="print-info-details">
              <p><span class="print-label">ชื่อ:</span> ${receiptData.tenantInfo.tenant_name || 'ไม่ระบุชื่อผู้เช่า'}</p>
              <p><span class="print-label">เบอร์โทร:</span> ${receiptData.tenantInfo.tenant_phone || 'ไม่ระบุ'}</p>
              <p><span class="print-label">ที่อยู่:</span> ${receiptData.tenantInfo.tenant_address || 'ไม่ระบุที่อยู่'}</p>
              ${receiptData.tenantInfo.tenant_address && receiptData.tenantInfo.tenant_address !== 'ไม่ระบุที่อยู่' ? `<p>${[
                receiptData.tenantInfo.tenant_subdistrict && `ตำบล${receiptData.tenantInfo.tenant_subdistrict}`,
                receiptData.tenantInfo.tenant_district && `อำเภอ${receiptData.tenantInfo.tenant_district}`,
                receiptData.tenantInfo.tenant_province && `จังหวัด${receiptData.tenantInfo.tenant_province}`
              ].filter(Boolean).join(' ')}</p>` : ''}
            </div>
          </div>
          <div class="print-info-right">
            <h3 class="print-receipt-details-title">รายละเอียดใบเสร็จ</h3>
            <div class="print-receipt-details">
              <p><span class="print-label">เลขที่ / No:</span> ${receiptData.receiptNumber}</p>
              <p><span class="print-label">วันที่ / Date:</span> ${receiptData.issueDate}</p>
              <p><span class="print-label">ห้อง / Room:</span> ${receiptData.tenantInfo.room_number || 'N/A'}</p>
              <p><span class="print-label">วิธีชำระ:</span> ${
                receiptData.paymentInfo && receiptData.paymentInfo.payment_method ? 
                  receiptData.paymentInfo.payment_method : 
                  receiptData.invoice && receiptData.invoice.payment_method ?
                    receiptData.invoice.payment_method :
                    'เงินสด'
              }</p>
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
                ${itemsHTML}
                
                <tr class="print-total-row">
                  <td class="print-td print-total-label" colspan="3">รวมทั้งสิ้น / Grand Total</td>
                  <td class="print-td print-total-amount">
                    ${Number(parseFloat(receiptData.totalAmount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
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
                <p class="print-payment-text">${
                  receiptData.paymentInfo && receiptData.paymentInfo.payment_method ? 
                    receiptData.paymentInfo.payment_method : 
                    receiptData.invoice && receiptData.invoice.payment_method ?
                      receiptData.invoice.payment_method :
                      'เงินสด'
                }</p>
              </div>
              
              <div class="print-notes-section">
                <p class="print-notes-title">หมายเหตุ:</p>
                <p class="print-notes-content">${defaultNote || 'ใบเสร็จรับเงินฉบับนี้สำคัญ กรุณาเก็บไว้เป็นหลักฐาน'}</p>
              </div>
            </div>
            
            <div class="print-right-section">
              <div class="print-receiver-box">
                <p class="print-receiver-title">ผู้รับเงิน</p>
                
                <div class="print-amount-section">
                  <div class="print-amount-line">
                    <span class="print-amount-label">จำนวน</span>
                    <div class="print-amount-value">
                      <span>${Number(parseFloat(receiptData.totalAmount) || 0).toLocaleString('th-TH')}</span>
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

  // ฟังก์ชันพิมพ์ใบเสร็จเดี่ยว (รองรับข้อมูลจาก API)
  printSingleReceipt: (invoice, tenantInfo = {}, dormitoryInfo = {}, contractInfo = {}, invoiceItems = [], defaultNote = '') => {
    const receiptData = PaidInvoiceReceipt.createReceiptData(
      invoice, 
      invoiceItems,
      [], // payments - จะเพิ่มทีหลังถ้าต้องการ
      tenantInfo, 
      dormitoryInfo, 
      contractInfo
    );

    console.log('📋 ข้อมูลใบเสร็จที่สร้างขึ้น:', receiptData);

    if (!receiptData) {
      console.error('❌ ไม่สามารถสร้างข้อมูลใบเสร็จได้');
      return;
    }

    const htmlContent = PaidInvoiceReceipt.generateReceiptHTMLWithItems(receiptData, defaultNote);
    PaidInvoiceReceipt.executePrint(htmlContent, `ใบเสร็จรับเงินห้อง-${receiptData.tenantInfo.room_number || 'N/A'}`);
  },

  // ฟังก์ชันพิมพ์ใบเสร็จหลายใบ
  printMultipleReceipts: (billsData, tenantInfo, dormitoryInfo, contractInfo, defaultNote = '') => {
    if (!billsData || billsData.length === 0) {
      console.error('❌ ไม่มีข้อมูลบิลสำหรับพิมพ์');
      return;
    }

    const receiptData = PaidInvoiceReceipt.createReceiptData(
      billsData, 
      tenantInfo, 
      dormitoryInfo, 
      contractInfo
    );

    if (!receiptData) {
      console.error('❌ ไม่สามารถสร้างข้อมูลใบเสร็จได้');
      return;
    }

    const htmlContent = PaidInvoiceReceipt.generateReceiptHTMLWithItems(receiptData, defaultNote);
    PaidInvoiceReceipt.executePrint(htmlContent, `ใบเสร็จรับเงินสัญญาห้อง-${tenantInfo?.room_number || 'N/A'}`);
  },

  // ฟังก์ชันรันการพิมพ์ (ใช้วิธีเดียวกับ PrintInvoice)
  executePrint: (htmlContent, filename = 'ใบเสร็จรับเงิน') => {

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
        ${htmlContent}
      </div>
    `;

    // ลบเนื้อหาเก่าถ้ามี
    const existingStyles = document.getElementById('shared-receipt-print-styles');
    if (existingStyles) existingStyles.remove();
    
    const existingPrintArea = document.querySelector('.print-area');
    if (existingPrintArea) existingPrintArea.remove();

    // เพิ่ม CSS และเนื้อหา
    document.head.insertAdjacentHTML('beforeend', PaidInvoiceReceipt.getPrintStyles());
    document.body.insertAdjacentHTML('beforeend', fullPrintContent);

    // ตั้งชื่อไฟล์
    const originalTitle = document.title;
    document.title = filename;

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

    // Event listener สำหรับ after print
    const handleAfterPrint = () => {
      console.log('🖨️ Print dialog ปิดแล้ว');
      cleanup();
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    // เพิ่ม event listener
    window.addEventListener('afterprint', handleAfterPrint);

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
        console.log('🖨️ เปิด print dialog สำหรับใบเสร็จ');
        window.print();
      });
  },

  // ฟังก์ชันหลักสำหรับพิมพ์ใบเสร็จที่ชำระเงินแล้ว (ดึงข้อมูลจาก API เอง)
  printReceiptFromAPI: async (dormId, invoiceId, paymentId = null) => {
    try {
      console.log('🖨️ เริ่มพิมพ์ใบเสร็จ (ดึงข้อมูลจาก API)');
      console.log('🏠 Dorm ID:', dormId);
      console.log('📄 Invoice ID:', invoiceId);
      console.log('💰 Payment ID:', paymentId);
      
      // ดึงข้อมูลจาก API
      const data = await PaidInvoiceReceipt.fetchReceiptData(dormId, invoiceId, paymentId);
      
      if (!data.invoice) {
        alert('ไม่พบข้อมูลใบแจ้งหนี้');
        return;
      }

      // ตรวจสอบข้อมูลการชำระเงิน
      console.log('💳 ข้อมูลการชำระเงินทั้งหมด:', data.payments);
      console.log('🎯 การชำระเงินที่เลือก:', data.selectedPayment);

      // สร้างข้อมูลสำหรับใบเสร็จ
      const tenantInfo = {
        tenant_name: data.invoice.tenant_name,
        tenant_address: data.invoice.tenant_address || 'ไม่ระบุ',
        tenant_subdistrict: data.invoice.tenant_subdistrict || '',
        tenant_district: data.invoice.tenant_district || '',
        tenant_province: data.invoice.tenant_province || '',
        room_number: data.invoice.room_number,
        tenant_phone: data.invoice.tenant_phone || ''
      };

      const dormitoryInfo = {
        name: data.invoice.dorm_name || 'Sweet Roomie Dorm',
        address: data.invoice.dorm_address || '88/12 ถนนราชพฤกษ์',
        subdistrict: data.invoice.dorm_subdistrict || '',
        district: data.invoice.dorm_district || '',
        province: data.invoice.dorm_province || '',
        phone: data.invoice.dorm_phone || '081-234-5678',
        email: data.invoice.dorm_email || ''
      };

      const contractInfo = {
        contract_id: data.invoice.contract_id || '',
        start_date: data.invoice.contract_start_date || '',
        end_date: data.invoice.contract_end_date || ''
      };

      // ถ้าระบุ paymentId ให้พิมพ์ใบเสร็จสำหรับการชำระเงินนั้น
      if (paymentId && data.selectedPayment) {
        console.log('🖨️ พิมพ์ใบเสร็จสำหรับการชำระเงิน ID:', paymentId);
        console.log('💰 ข้อมูลการชำระเงิน:', data.selectedPayment);
        console.log('🔧 วิธีการชำระเงิน:', data.selectedPayment.payment_method);
        
        // สร้างข้อมูลบิลพร้อมข้อมูลการชำระเงิน
        const billWithPayment = {
          ...data.invoice,
          payment_id: data.selectedPayment.id,
          payment_date: data.selectedPayment.payment_date,
          payment_amount: data.selectedPayment.amount,
          payment_method: data.selectedPayment.payment_method,
          payment_note: data.selectedPayment.note
        };
        
        console.log('🧾 ข้อมูลบิลที่จะพิมพ์:', billWithPayment);
        
        PaidInvoiceReceipt.printSingleReceipt(billWithPayment, tenantInfo, dormitoryInfo, contractInfo, data.invoiceItems, data.defaultNote);
      } else {
        // พิมพ์ใบเสร็จรวม
        console.log('🖨️ พิมพ์ใบเสร็จรวม (ไม่มีข้อมูลการชำระเงิน)');
        console.log('❌ ไม่พบข้อมูลการชำระเงินสำหรับ Payment ID:', paymentId);
        console.log('📋 รายการการชำระเงินที่มี:', data.payments.map(p => ({ id: p.id, method: p.payment_method })));
        PaidInvoiceReceipt.printSingleReceipt(data.invoice, tenantInfo, dormitoryInfo, contractInfo, data.invoiceItems, data.defaultNote);
      }
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ:', error);
      alert('ไม่สามารถพิมพ์ใบเสร็จได้: ' + error.message);
    }
  },

  // ฟังก์ชันหลักสำหรับพิมพ์ใบเสร็จที่ชำระเงินแล้ว
  printPaidReceipt: (billData, tenantInfo, dormitoryInfo, contractInfo, defaultNote = '') => {
    console.log('🖨️ เริ่มพิมพ์ใบเสร็จที่ชำระเงินแล้ว');
    
    if (Array.isArray(billData) && billData.length > 1) {
      PaidInvoiceReceipt.printMultipleReceipts(billData, tenantInfo, dormitoryInfo, contractInfo, defaultNote);
    } else {
      const singleBill = Array.isArray(billData) ? billData[0] : billData;
      PaidInvoiceReceipt.printSingleReceipt(singleBill, tenantInfo, dormitoryInfo, contractInfo, [], defaultNote);
    }
  }
};

export default PaidInvoiceReceipt;

