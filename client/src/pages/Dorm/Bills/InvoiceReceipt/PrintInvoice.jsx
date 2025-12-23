import React from 'react';

/**
 * Component สำหรับสร้าง HTML และพิมพ์ใบแจ้งหนี้
 * ใช้ร่วมกันระหว่าง InvoiceReceipt และ MultiPrintModal
 */
const PrintInvoice = {
  // ฟังก์ชันสร้าง invoice items จากข้อมูลบิล
  createInvoiceItems: (bill) => {
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

    // เพิ่มค่าน้ำ
    if (bill.water_units && parseInt(bill.water_units) > 0) {
      const waterAmount = parseInt(bill.water_units) * parseFloat(bill.water_rate || 0);
      formattedItems.push({
        id: `water_${bill.id}`,
        description: 'ค่าน้ำ/Water',
        type: 'water',
        units: parseInt(bill.water_units),
        rate: parseFloat(bill.water_rate || 0),
        amount: waterAmount
      });
    }

    // เพิ่มค่าไฟ
    if (bill.electric_units && parseInt(bill.electric_units) > 0) {
      const electricAmount = parseInt(bill.electric_units) * parseFloat(bill.electric_rate || 0);
      formattedItems.push({
        id: `electric_${bill.id}`,
        description: 'ค่าไฟ/Electricity',
        type: 'electric',
        units: parseInt(bill.electric_units),
        rate: parseFloat(bill.electric_rate || 0),
        amount: electricAmount
      });
    }

    // เพิ่มค่าบริการอื่นๆ ถ้ามี
    if (bill.service_fee && parseFloat(bill.service_fee) > 0) {
      formattedItems.push({
        id: `service_${bill.id}`,
        description: 'ค่าบริการ/Service Fee',
        type: 'service',
        units: 1,
        rate: parseFloat(bill.service_fee),
        amount: parseFloat(bill.service_fee)
      });
    }

    return formattedItems;
  },

  // ฟังก์ชันสร้าง invoice data จากข้อมูลบิล
  createInvoiceData: (bill, invoiceData = {}) => {
    const formattedItems = PrintInvoice.createInvoiceItems(bill);
    
    // คำนวณยอดรวม - ใช้ total จาก API หรือคำนวณเป็น fallback
    const apiTotal = parseFloat(bill.total || bill.total_amount || bill.amount) || 0;
    const calculatedTotal = formattedItems.reduce((sum, item) => sum + item.amount, 0);
    const finalTotal = apiTotal > 0 ? apiTotal : calculatedTotal;

    return {
      dormInfo: {
        name: bill.dorm_name || invoiceData?.dormInfo?.name || 'Sweet Roomie Dorm',
        address: bill.dorm_address || invoiceData?.dormInfo?.address || '88/12 ถนนราชพฤกษ์',
        phone: bill.dorm_phone || invoiceData?.dormInfo?.phone || '081-234-5678',
        subdistrict: bill.dorm_subdistrict || invoiceData?.dormInfo?.subdistrict || '',
        district: bill.dorm_district || invoiceData?.dormInfo?.district || '',
        province: bill.dorm_province || invoiceData?.dormInfo?.province || '',
      },
      tenantInfo: {
        name: bill.tenant_name || 'ไม่ระบุชื่อผู้เช่า',
        address: bill.tenant_address || invoiceData?.tenantInfo?.address || 'ไม่ระบุที่อยู่',
        subdistrict: bill.tenant_subdistrict || invoiceData?.tenantInfo?.subdistrict || '',
        district: bill.tenant_district || invoiceData?.tenantInfo?.district || '',
        province: bill.tenant_province || invoiceData?.tenantInfo?.province || '',
      },
      invoiceNumber: bill.invoice_number || bill.monthly_invoice_id || 'INV' + (bill.id || Date.now()),
      roomNumber: bill.room_number || 'N/A',
      date: bill.created_at ? new Date(bill.created_at).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH'),
      dueDate: bill.due_date ? new Date(bill.due_date).toLocaleDateString('th-TH') : invoiceData?.dueDate || 'ไม่ระบุ',
      total: finalTotal,
      items: formattedItems
    };
  },

  // ฟังก์ชันสร้าง HTML สำหรับใบแจ้งหนี้ (แบบใหม่ที่รับ invoiceItems)
  generateInvoiceHTMLWithItems: (bill, invoiceData = {}, invoiceItems = [], invoiceNote = '') => {
    // ใช้ invoiceItems ที่ส่งมา หากไม่มีก็สร้างใหม่
    const actualInvoiceItems = invoiceItems && invoiceItems.length > 0 
      ? invoiceItems 
      : PrintInvoice.createInvoiceItems(bill);
      
    // คำนวณยอดรวมจาก invoiceItems ที่ใช้จริง
    const calculatedTotal = actualInvoiceItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const apiTotal = parseFloat(bill.total || bill.total_amount || bill.amount) || 0;
    const totalAmount = apiTotal > 0 ? apiTotal : calculatedTotal;

    // สร้าง currentInvoiceData โดยไม่ใช้ createInvoiceData เพื่อหลีกเลี่ยงการสร้าง items ซ้ำ
    const currentInvoiceData = {
      dormInfo: {
        name: bill.dorm_name || invoiceData?.dormInfo?.name || 'Sweet Roomie Dorm',
        address: bill.dorm_address || invoiceData?.dormInfo?.address || '88/12 ถนนราชพฤกษ์',
        phone: bill.dorm_phone || invoiceData?.dormInfo?.phone || '081-234-5678',
        subdistrict: bill.dorm_subdistrict || invoiceData?.dormInfo?.subdistrict || '',
        district: bill.dorm_district || invoiceData?.dormInfo?.district || '',
        province: bill.dorm_province || invoiceData?.dormInfo?.province || '',
      },
      tenantInfo: {
        name: bill.tenant_name || invoiceData?.tenantInfo?.name || 'ไม่ระบุชื่อผู้เช่า',
        address: bill.tenant_address || invoiceData?.tenantInfo?.address || 'ไม่ระบุที่อยู่',
        subdistrict: bill.tenant_subdistrict || invoiceData?.tenantInfo?.subdistrict || '',
        district: bill.tenant_district || invoiceData?.tenantInfo?.district || '',
        province: bill.tenant_province || invoiceData?.tenantInfo?.province || '',
        phone: bill.tenant_phone || invoiceData?.tenantInfo?.phone || '',
      },
      invoiceNumber: bill.invoice_number || bill.monthly_invoice_id || invoiceData?.invoiceNumber || 'INV' + (bill.id || Date.now()),
      roomNumber: bill.room_number || invoiceData?.roomNumber || 'N/A',
      date: bill.created_at ? new Date(bill.created_at).toLocaleDateString('th-TH') : invoiceData?.date || new Date().toLocaleDateString('th-TH'),
      dueDate: bill.due_date ? new Date(bill.due_date).toLocaleDateString('th-TH') : invoiceData?.dueDate || 'ไม่ระบุ',
    };

    return `
      <div class="print-container">
        <div class="print-header">
          <div class="print-header-content">
            <h1 class="print-title">ใบแจ้งหนี้</h1>
            <h2 class="print-company-name">${currentInvoiceData.dormInfo.name}</h2>
            <div class="print-company-details">
              ${currentInvoiceData.dormInfo.address}<br/>
              ${[
                currentInvoiceData.dormInfo.subdistrict && `ตำบล${currentInvoiceData.dormInfo.subdistrict}`,
                currentInvoiceData.dormInfo.district && `อำเภอ${currentInvoiceData.dormInfo.district}`,
                currentInvoiceData.dormInfo.province && `จังหวัด${currentInvoiceData.dormInfo.province}`
              ].filter(Boolean).join(' ') || 'ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี'}<br/>
              โทรศัพท์: ${currentInvoiceData.dormInfo.phone}
            </div>
          </div>
        </div>

        <div class="print-info-section">
          <div class="print-info-left">
            <h3 class="print-section-title">ข้อมูลลูกค้า</h3>
            <div class="print-info-details">
              <p><span class="print-label">ชื่อ:</span> ${currentInvoiceData.tenantInfo.name}</p>
              <p><span class="print-label">เบอร์โทร:</span> ${currentInvoiceData.tenantInfo.phone || 'ไม่ระบุเบอร์โทร'}</p>
              <p><span class="print-label">ที่อยู่:</span> ${currentInvoiceData.tenantInfo.address}</p>
              ${currentInvoiceData.tenantInfo.address && currentInvoiceData.tenantInfo.address !== 'ไม่ระบุที่อยู่' ? `<p>${[
                currentInvoiceData.tenantInfo.subdistrict && `ตำบล${currentInvoiceData.tenantInfo.subdistrict}`,
                currentInvoiceData.tenantInfo.district && `อำเภอ${currentInvoiceData.tenantInfo.district}`,
                currentInvoiceData.tenantInfo.province && `จังหวัด${currentInvoiceData.tenantInfo.province}`
              ].filter(Boolean).join(' ')}</p>` : ''}
              
            </div>
          </div>
          <div class="print-info-right">
            <h3 class="print-section-title">รายละเอียดใบแจ้งหนี้</h3>
            <div class="print-info-details">
              <p><span class="print-label">เลขที่ / No:</span> ${currentInvoiceData.invoiceNumber}</p>
              <p><span class="print-label">วันที่ / Date:</span> ${currentInvoiceData.date}</p>
              <p><span class="print-label">ห้อง / Room:</span> ${currentInvoiceData.roomNumber}</p>
              <p><span class="print-label">ครบกำหนด / Due Date:</span> ${currentInvoiceData.dueDate}</p>
            </div>
          </div>
        </div>

        <div class="print-table-section">
          <h3 class="print-section-title">รายการค่าใช้จ่าย</h3>
          
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
                ${actualInvoiceItems.map(item => {
                  // จัดการการแสดงผลสำหรับส่วนลด
                  const isDiscount = item.type === 'discount' || item.item_type === 'discount';
                  const displayRate = isDiscount
                    ? `-${Math.abs(parseFloat(item.price || item.rate) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                    : Number(parseFloat(item.price || item.rate) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
                  const displayAmount = isDiscount
                    ? `-${Math.abs(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                    : Number(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
                    
                  return `
                    <tr class="print-table-row">
                      <td class="print-td print-description-col">${item.description || item.type}</td>
                      <td class="print-td print-center">${(item.unit_count !== undefined && item.unit_count !== null) ? item.unit_count : (item.units !== undefined && item.units !== null) ? item.units : 1}</td>
                      <td class="print-td print-right">${displayRate}</td>
                      <td class="print-td print-right">${displayAmount}</td>
                    </tr>
                  `;
                }).join('')}
                
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

        <div class="print-notes-section">
          <h4 class="print-notes-title">หมายเหตุ:</h4>
          <div class="print-notes-content">${(invoiceNote || 'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พัชพล ยอดราช ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท').trim()}</div>
        </div>

        <div class="print-signature-section">
          <div class="print-amount-display">
            <div class="print-amount-line">
              <span>จำนวน</span>
              <span class="print-amount-underline">
                ${Number(parseFloat(totalAmount) || 0).toLocaleString('th-TH')}
              </span>
              <span>บาท</span>
            </div>
            <div class="print-amount-words">
              ( _______________________________________ )
            </div>
          </div>
          
          <div class="print-signature-fields">
            <div class="print-signature-field">
              <div class="print-signature-line"></div>
              <p class="print-signature-label">ผู้ชำระเงิน</p>
              <p class="print-signature-underline">( _______________________________ )</p>
            </div>
            <div class="print-signature-field">
              <div class="print-signature-line"></div>
              <p class="print-signature-label">ผู้รับเงิน</p>
              <p class="print-signature-underline">( _______________________________ )</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ฟังก์ชันสร้าง HTML สำหรับใบแจ้งหนี้
  generateInvoiceHTML: (bill, invoiceData = {}, invoiceNote = '') => {
    const currentInvoiceData = PrintInvoice.createInvoiceData(bill, invoiceData);
    const invoiceItems = currentInvoiceData.items;
    const totalAmount = currentInvoiceData.total;

    return `
      <div class="print-container">
        <div class="print-header">
          <div class="print-header-content">
            <div class="print-header-left">
              <div class="print-invoice-title">ใบแจ้งหนี้ / Invoice</div>
              <div class="print-company-name"><strong>${currentInvoiceData.dormInfo.name}</strong></div>
              <div class="print-company-details">
                ${currentInvoiceData.dormInfo.address}<br>
                ${currentInvoiceData.dormInfo.subdistrict ? `ตำบล${currentInvoiceData.dormInfo.subdistrict} ` : ''}${currentInvoiceData.dormInfo.district ? `อำเภอ${currentInvoiceData.dormInfo.district} ` : ''}${currentInvoiceData.dormInfo.province ? `จังหวัด${currentInvoiceData.dormInfo.province}` : ''}<br>
                โทรศัพท์: ${currentInvoiceData.dormInfo.phone}
              </div>
            </div>
            <div class="print-header-right">
              <div class="print-invoice-number">เลขที่ / No. <strong>${currentInvoiceData.invoiceNumber}</strong></div>
              <div class="print-invoice-details">
                ประจำวันที่ / Date: ${currentInvoiceData.date}<br>
                ห้อง / Room: ${currentInvoiceData.roomNumber}<br>
                ครบกำหนด / Due Date: ${currentInvoiceData.dueDate}
              </div>
            </div>
          </div>
        </div>

        <div class="print-customer-section">
          <div class="print-customer-title">ลูกค้า / Customer: ${currentInvoiceData.tenantInfo.name}</div>
          <div>ที่อยู่ / Address: ${currentInvoiceData.tenantInfo.address}</div>
          <div>${currentInvoiceData.tenantInfo.subdistrict ? `ตำบล${currentInvoiceData.tenantInfo.subdistrict} ` : ''}${currentInvoiceData.tenantInfo.district ? `อำเภอ${currentInvoiceData.tenantInfo.district} ` : ''}${currentInvoiceData.tenantInfo.province ? `จังหวัด${currentInvoiceData.tenantInfo.province}` : ''}</div>
        </div>

        <table class="print-table">
          <thead>
            <tr class="print-header-row">
              <th class="print-description-col" style="padding: 8px 16px; text-align: left; background-color: #e5e7eb;">รายการ / Description</th>
              <th style="padding: 8px 16px; text-align: center; background-color: #797b7d;">จำนวนหน่วย</th>
              <th style="padding: 8px 16px; text-align: center; background-color: #797b7d;">ราคาต่อหน่วย</th>
              <th style="padding: 8px 16px; text-align: center; background-color: #797b7d;">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceItems.map(item => {
              // จัดการการแสดงผลสำหรับส่วนลด
              const isDiscount = item.type === 'discount' || item.item_type === 'discount';
              const displayRate = isDiscount
                ? `-${Math.abs(parseFloat(item.price || item.rate) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                : Number(parseFloat(item.price || item.rate) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
                
              const displayAmount = isDiscount
                ? `-${Math.abs(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                : Number(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
                
              return `
                <tr>
                  <td class="print-description-col" style="padding: 8px 16px; text-align: left;">
                    ${item.description}
                  </td>
                  <td style="padding: 8px 16px; text-align: center;">${(item.unit_count !== undefined && item.unit_count !== null) ? item.unit_count : (item.units !== undefined && item.units !== null) ? item.units : 1}</td>
                  <td style="padding: 8px 16px; text-align: center;">${displayRate}</td>
                  <td style="padding: 8px 16px; text-align: center;">${displayAmount}</td>
                </tr>
              `;
            }).join('')}
            <tr class="print-total-row">
              <td colspan="3" style="padding: 12px 16px; font-weight: bold; font-size: 18px;">รวมทั้งสิ้น / Grand Total</td>
              <td style="padding: 12px 16px; font-weight: bold; font-size: 18px; color: #000000;"><strong>${(parseFloat(totalAmount) || 0).toFixed(2)} บาท</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="print-notes">
          <div class="print-notes-title">หมายเหตุ:</div>
          <div>${invoiceNote || 'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พีชพล ยอดราษ ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท'}</div>
        </div>

        <div class="print-signature-section" style="margin-top: 8mm; padding: 10px; border: 1px solid #ccc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5mm;">
            <div style="flex: 1; text-align: center;">
              <div style="margin-bottom: 5mm;">จำนวน ............................ บาท ( ............................................................................... )</div>
              <div style="display: flex; justify-content: space-around; margin-top: 8mm;">
                <div style="text-align: left;">
                  <div>ผู้ชำระเงิน ................................................</div>
                  <div style="margin-top: 5mm;">( ...................................................................... )</div>
                </div>
                <div style="text-align: right;">
                  <div>ผู้รับเงิน ................................................</div>
                  <div style="margin-top: 5mm;">( ...................................................................... )</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // CSS สำหรับการพิมพ์
// CSS สำหรับการพิมพ์ (เวอร์ชันแก้หน้าเกิน)
getPrintStyles: () => `
  <style id="shared-print-styles">
    @media print {
      @page { size: A4; margin: 0; }

      html, body { height: auto !important; overflow: visible !important; }

      /* ซ่อนทุกอย่างนอก .print-area ออกจากเลย์เอาต์เลย (ไม่กินพื้นที่) */
      body > :not(.print-area) { display: none !important; }

      /* พื้นที่พิมพ์หลัก */
      .print-area {
        position: static;               /* เดิมเป็น absolute ทำให้คำนวณความสูงเพี้ยน */
        width: 100%;
        font-family: 'Prompt','TH SarabunPSK','Sarabun',Arial,sans-serif;
        font-size: 16px; line-height: 1.3; color: #000;
      }

      /* รองรับหลายบิล (ขึ้นหน้าใหม่ตาม marker) */
      .print-area > div[style*="page-break-after: always"] {
        page-break-after: always !important;
        break-after: always !important;
      }

      /* ใบแจ้งหนี้แต่ละใบ */
      .print-invoice {
        width: 100%;
        padding: 0; margin: 0;
        page-break-inside: auto; 
        break-inside: auto;
      }

      /* ตาราง: อนุญาตให้แตกหน้าได้ แต่ไม่แตก “กลางแถว” */
      .print-table { page-break-inside: auto; break-inside: auto; }
      .print-table tr { page-break-inside: avoid; break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }

      /* ผ่อนคลายจาก avoid ทั้งก้อน (ของเดิมทำให้โดดไปหน้าใหม่ง่าย) */
      .print-header,
      .print-customer-section,
      .print-table,
      .print-notes {
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
      padding: 10mm;
      height: auto;
      box-sizing: border-box;
      width: 100%;
      font-family: 'Prompt', 'Arial', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    
    /* Header */
    .print-header {
      text-align: center;
      border-bottom: 1px solid #ccc;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    
    .print-header-content {
      margin-bottom: 0;
    }
    
    .print-title {
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 8px 0;
      color: #000;
    }
    
    .print-company-name {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 6px 0;
      color: #374151;
    }
    
    .print-company-details {
      font-size: 14px;
      line-height: 1.3;
      color: #6b7280;
      margin: 0;
    }
    
    /* Info Section */
    .print-info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 25px;
    }
    
    .print-info-left,
    .print-info-right {
      
    }
    
    .print-section-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 12px 0;
    }
    
    .print-info-details {
      font-size: 14px;
    }
    
    .print-info-details p {
      margin: 4px 0;
      color: #374151;
    }
    
    .print-label {
      font-weight: 500;
    }
    
    /* Table Section */
    .print-table-section {
      margin: 25px 0;
    }
    
    .print-table-wrapper {
      border: 1px solid #9ca3af;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .print-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .print-th {
      background-color: #f3f4f6;
      border-right: 1px solid #9ca3af;
      border-bottom: 1px solid #9ca3af;
      padding: 8px 12px;
      font-weight: 500;
      color: #374151;
      font-size: 14px;
    }
    
    .print-th:last-child {
      border-right: none;
    }
    
    .print-td {
      border-right: 1px solid #9ca3af;
      border-bottom: 1px solid #9ca3af;
      padding: 8px 12px;
      font-size: 14px;
      color: #374151;
    }
    
    .print-td:last-child {
      border-right: none;
    }
    
    .print-description-col {
      text-align: left !important;
    }
    
    .print-center {
      text-align: center;
    }
    
    .print-right {
      text-align: right;
    }
    
    .print-table-row:last-child .print-td {
      border-bottom: none;
    }
    
    .print-total-row {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    
    .print-total-row .print-td {
      font-weight: bold;
      color: #374151;
      font-size: 16px;
      border-bottom: none;
    }
    
    .print-total-label {
      text-align: center !important;
    }
    
    .print-total-amount {
      text-align: right !important;
    }
    
    /* Notes Section */
    .print-notes-section {
      margin: 25px 0;
    }
    
    .print-notes-title {
      font-weight: 600;
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #374151;
      text-decoration: underline;
    }
    
    .print-notes-content {
      margin-top: 0;
      font-size: 14px;
      color: #374151;
      background-color: #f9fafb;
      padding-top: 20px;
      padding: 16px;
      border-radius: 8px;
      line-height: 1.5;
      margin: 0;
      white-space: pre-line;
    }
    
    /* Signature Section */
    .print-signature-section {
      border: 1px solid #9ca3af;
      border-radius: 4px;
      padding: 24px;
      background-color: #f9fafb;
      margin-top: 25px;
    }
    
    .print-amount-display {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .print-amount-line {
      margin-bottom: 10px;
      font-size: 14px;
      color: #6b7280;
    }
    
    .print-amount-underline {
      margin: 0 15px;
      border-bottom: 1px solid #6b7280;
      display: inline-block;
      min-width: 80px;
      text-align: center;
      color: #374151;
    }
    
    .print-amount-words {
      font-size: 14px;
      color: #6b7280;
    }
    
    .print-signature-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    
    .print-signature-field {
      text-align: center;
    }
    
    .print-signature-line {
      border-bottom: 1px solid #000;
      height: 30px;
      margin-bottom: 8px;
      width: 180px;
      margin: 0 auto 8px auto;
    }
    
    .print-signature-label {
      font-size: 14px;
      color: #6b7280;
      margin: 4px 0;
    }
    
    .print-signature-underline {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
    }
    
    .print-header-row {
      background-color: #f3f4f6;
    }
  </style>
`,

  // ฟังก์ชันสร้าง invoice items จากข้อมูลบิล
  generateInvoiceItemsFromBill: (bill) => {
    console.log('📝 สร้าง invoice items จากบิล:', bill);
    
    const items = [];
    
    // ถ้ามี invoice_items จาก API ให้ใช้ข้อมูลนั้น
    if (bill.invoice_items && Array.isArray(bill.invoice_items) && bill.invoice_items.length > 0) {
      console.log('✅ ใช้ invoice_items จาก API:', bill.invoice_items);
      
      const formattedItems = bill.invoice_items.map(item => {
        const units = parseFloat(item.unit_count) || 1;
        const amount = parseFloat(item.amount) || 0;
        // ใช้ price จาก API หรือคำนวณ rate จาก amount / units
        const rate = parseFloat(item.price) || (units > 0 ? (amount / units) : amount);
        
        return {
          id: item.id || item.invoice_item_id,
          description: item.description || '',
          amount: amount, // ใช้ amount จาก API ที่คำนวณถูกต้องแล้ว
          units: units,
          unit_count: units, // เพิ่ม unit_count สำหรับความเข้ากันได้
          rate: rate,
          price: rate, // เพิ่ม price สำหรับความเข้ากันได้
          date: bill.bill_month || '',
          item_type: item.item_type || 'other'
        };
      });
      
      // เรียงลำดับรายการตาม description โดยใช้คำสำคัญ
      const getItemOrder = (description) => {
        const desc = description.toLowerCase();
        if (desc.includes('ค่าห้อง') || desc.includes('ค่าเช่า') || desc.includes('room')) return 1;
        if (desc.includes('ค่าน้ำ') || desc.includes('water')) return 2;
        if (desc.includes('ค่าไฟ') || desc.includes('electric') || desc.includes('electricity')) return 3;
        if (desc.includes('ปรับ') || desc.includes('late') || desc.includes('fine')) return 5;
        return 4; // ค่าอื่นๆ
      };
      
      const sortedItems = formattedItems.sort((a, b) => {
        const orderA = getItemOrder(a.description);
        const orderB = getItemOrder(b.description);
        return orderA - orderB;
      });
      
      console.log('📋 Invoice items ที่เรียงแล้ว:', sortedItems);
      return sortedItems;
    }
    
    console.log('⚠️ ไม่มี invoice_items จาก API ใช้ field เดิม');
    
    // Fallback: ใช้ field เดิมถ้ามี (สำหรับข้อมูลเก่า) - เรียงลำดับที่ถูกต้อง
    
    // 1. ค่าห้อง
    if (bill.room_fee && parseFloat(bill.room_fee) > 0) {
      items.push({
        id: 'room_fee',
        description: 'ค่าเช่าห้อง',
        amount: parseFloat(bill.room_fee),
        units: 1,
        rate: parseFloat(bill.room_fee).toFixed(2),
        date: bill.bill_month || '',
        order: 1
      });
    }
    
    // 2. ค่าน้ำ
    if (bill.water_fee && parseFloat(bill.water_fee) > 0) {
      const waterUnits = parseInt(bill.water_units) || 1;
      const waterRate = waterUnits > 0 ? (parseFloat(bill.water_fee) / waterUnits).toFixed(2) : '0.00';
      items.push({
        id: 'water_fee',
        description: 'ค่าน้ำ',
        amount: parseFloat(bill.water_fee),
        units: waterUnits,
        rate: waterRate,
        date: bill.bill_month || '',
        order: 2
      });
    }
    
    // 3. ค่าไฟ
    if (bill.electric_fee && parseFloat(bill.electric_fee) > 0) {
      const electricUnits = parseInt(bill.electric_units) || 1;
      const electricRate = electricUnits > 0 ? (parseFloat(bill.electric_fee) / electricUnits).toFixed(2) : '0.00';
      items.push({
        id: 'electric_fee',
        description: 'ค่าไฟ',
        amount: parseFloat(bill.electric_fee),
        units: electricUnits,
        rate: electricRate,
        date: bill.bill_month || '',
        order: 3
      });
    }
    
    // 4. ค่าอื่นๆ
    if (bill.other_fee && parseFloat(bill.other_fee) > 0) {
      items.push({
        id: 'other_fee',
        description: bill.other_description || 'ค่าอื่นๆ',
        amount: parseFloat(bill.other_fee),
        units: 1,
        rate: parseFloat(bill.other_fee).toFixed(2),
        date: bill.bill_month || '',
        order: 4
      });
    }
    
    // 5. ค่าปรับล่าช้า
    if (bill.late_fee && parseFloat(bill.late_fee) > 0) {
      const lateDays = parseInt(bill.late_days) || 1;
      const lateRate = lateDays > 0 ? (parseFloat(bill.late_fee) / lateDays).toFixed(2) : '0.00';
      items.push({
        id: 'late_fee',
        description: 'ค่าปรับล่าช้า',
        amount: parseFloat(bill.late_fee),
        units: lateDays,
        rate: lateRate,
        date: bill.bill_month || '',
        order: 5
      });
    }
    
    // ถ้าไม่มี items ใดๆ ให้ใช้ยอดรวมเป็น item เดียว
    if (items.length === 0 && (bill.total || bill.amount)) {
      items.push({
        id: 'total_amount',
        description: 'รวมยอดค่าใช้จ่าย',
        amount: parseFloat(bill.total || bill.amount),
        units: 1,
        rate: parseFloat(bill.total || bill.amount).toFixed(2),
        date: bill.bill_month || '',
        order: 1
      });
    }
    
    // เรียงลำดับตาม order field
    const sortedItems = items.sort((a, b) => (a.order || 99) - (b.order || 99));
    
    console.log('📋 Fallback items ที่เรียงแล้ว:', sortedItems);
    return sortedItems;
  },

  // ฟังก์ชันสร้าง invoice data จากข้อมูลบิล
  generateInvoiceDataFromBill: (bill, globalInvoiceData = {}) => {
    return {
      dormInfo: {
        name: bill.dorm_name || globalInvoiceData.dormInfo?.name || '',
        address: bill.dorm_address || globalInvoiceData.dormInfo?.address || '',
        phone: bill.dorm_phone || globalInvoiceData.dormInfo?.phone || '',
        subdistrict: bill.dorm_subdistrict || globalInvoiceData.dormInfo?.subdistrict || '',
        district: bill.dorm_district || globalInvoiceData.dormInfo?.district || '',
        province: bill.dorm_province || globalInvoiceData.dormInfo?.province || '',
      },
      tenantInfo: {
        name: bill.tenant_name || bill.tenant || globalInvoiceData.tenantInfo?.name || '',
        address: bill.tenant_address || globalInvoiceData.tenantInfo?.address || '',
        subdistrict: bill.tenant_subdistrict || globalInvoiceData.tenantInfo?.subdistrict || '',
        district: bill.tenant_district || globalInvoiceData.tenantInfo?.district || '',
        province: bill.tenant_province || globalInvoiceData.tenantInfo?.province || '',
        phone: bill.tenant_phone || globalInvoiceData.tenantInfo?.phone || '',
      },
      invoiceNumber: bill.invoice_number || bill.monthly_invoice_id || '',
      roomNumber: bill.room_number || bill.roomNumber || '',
      date: new Date().toLocaleDateString('th-TH'),
      dueDate: bill.due_date ? new Date(bill.due_date).toLocaleDateString('th-TH') : 'ไม่ระบุ',
      chargePerDay: parseFloat(bill.charge_per_day) || 0,
      lateFee: parseFloat(bill.late_fee) || 0,
      lateDays: parseInt(bill.late_days) || 0,
      status: bill.status || 'unpaid',
      total: parseFloat(bill.total || bill.amount) || 0,
    };
  },

  // ฟังก์ชันพิมพ์หลายบิล
  printMultipleBills: (bills, invoiceData = {}, invoiceNote = '', title = 'ใบแจ้งหนี้') => {
    console.log('🖨️ กำลังพิมพ์หลายบิล...', { 
      billsCount: bills.length,
      invoiceNote: invoiceNote,
      invoiceData: invoiceData
    });
    
    try {
      // ถ้ามีบิลเดียวให้ใช้ printSingleBill แทน
      if (bills.length === 1) {
        const bill = bills[0];
        const invoiceItems = PrintInvoice.generateInvoiceItemsFromBill(bill);
        return PrintInvoice.printSingleBill(bill, invoiceData, invoiceNote, title, invoiceItems);
      }

      // สร้างหน้าพิมพ์สำหรับหลายบิล (แต่ละบิล 1 หน้า โดยใช้ page-break-after)
      const printContent = bills.map((bill, index) => {
        console.log(`🖨️ กำลังสร้างหน้าที่ ${index + 1} สำหรับห้อง ${bill.room_number}`, {
          bill: bill,
          invoiceData: invoiceData,
          invoiceNote: invoiceNote
        });
        
        // สร้าง invoice items จากข้อมูลบิล (ใช้ฟังก์ชันเดียวกับ printSingleBill)
        const invoiceItems = PrintInvoice.generateInvoiceItemsFromBill(bill);
        
        console.log(`📄 Invoice items สำหรับห้อง ${bill.room_number}:`, invoiceItems);
        
        // ใช้ฟังก์ชันเดียวกับ printSingleBill และเพิ่ม page-break-after สำหรับทุกหน้ายกเว้นหน้าสุดท้าย
        const pageContent = PrintInvoice.generateInvoiceHTMLWithItems(bill, invoiceData, invoiceItems, invoiceNote);
        
        // เพิ่ม page-break-after เฉพาะเมื่อมีหลายบิลและไม่ใช่หน้าสุดท้าย
        if (index < bills.length - 1) {
          return `<div style="page-break-after: always;">${pageContent}</div>`;
        } else {
          return pageContent;
        }
      }).join('');

      PrintInvoice.executePrint(printContent, title);
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการพิมพ์:', error);
      alert('เกิดข้อผิดพลาดในการพิมพ์ กรุณาลองใหม่อีกครั้ง');
    }
  },

  // ฟังก์ชันพิมพ์บิลเดียว
  printSingleBill: (bill, invoiceData = {}, invoiceNote = '', title = 'ใบแจ้งหนี้', invoiceItems = []) => {
    console.log('🖨️ กำลังพิมพ์บิลเดียว...', { bill, invoiceItems });
    
    try {
      // ใช้ฟังก์ชันใหม่ที่รับ invoiceItems
      const printContent = PrintInvoice.generateInvoiceHTMLWithItems(bill, invoiceData, invoiceItems, invoiceNote);
      
      // สำหรับบิลเดียว ให้ใช้ executePrint แบบปกติ แต่ห่อด้วย CSS ที่ป้องกันหน้าเกิน
      const singleBillCSS = `
        <style id="single-bill-override">
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

      
      // เพิ่ม CSS พิเศษสำหรับบิลเดียว
      const existingSingleCSS = document.getElementById('single-bill-override');
      if (existingSingleCSS) existingSingleCSS.remove();
      document.head.insertAdjacentHTML('beforeend', singleBillCSS);
      
      // ใช้ executePrint แบบปกติ
      PrintInvoice.executePrint(printContent, title);
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการพิมพ์:', error);
      alert('เกิดข้อผิดพลาดในการพิมพ์ กรุณาลองใหม่อีกครั้ง');
    }
  },

  // ฟังก์ชันดำเนินการพิมพ์
  executePrint: (printContent, title = 'ใบแจ้งหนี้') => {
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
    const existingStyles = document.getElementById('shared-print-styles');
    if (existingStyles) existingStyles.remove();
    
    const existingPrintArea = document.querySelector('.print-area');
    if (existingPrintArea) existingPrintArea.remove();

    // เพิ่ม CSS และเนื้อหา
    document.head.insertAdjacentHTML('beforeend', PrintInvoice.getPrintStyles());
    document.body.insertAdjacentHTML('beforeend', fullPrintContent);

    // ตั้งชื่อไฟล์
    const originalTitle = document.title;
    document.title = title;

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
      const printStylesElement = document.getElementById('shared-print-styles');
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

export default PrintInvoice;
