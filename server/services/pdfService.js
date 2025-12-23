const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class PDFService {
  constructor() {
    this.browser = null;
  }

  // เริ่ม browser
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  // ปิด browser
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // สร้าง HTML สำหรับใบแจ้งหนี้ (เหมือน PrintInvoice)
  generateInvoiceHTML(billData, invoiceNote = '') {
    const {
      tenant_name,
      room_number,
      invoice_number,
      amount,
      due_date,
      created_at,
      dorm_name,
      dorm_address,
      dorm_phone,
      dorm_subdistrict,
      dorm_district,
      dorm_province,
      tenant_phone,
      tenant_address,
      tenant_subdistrict,
      tenant_district,
      tenant_province,
      invoice_items = []
    } = billData;

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('th-TH');
    };

    const formatCurrency = (amount) => {
      return parseFloat(amount || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // สร้างตารางรายการค่าใช้จ่าย
    const itemsHTML = invoice_items.map(item => `
      <tr class="print-table-row">
        <td class="print-td print-description-col">${item.description || item.type}</td>
        <td class="print-td print-center">${(item.unit_count !== undefined && item.unit_count !== null) ? item.unit_count : (item.units !== undefined && item.units !== null) ? item.units : 1}</td>
        <td class="print-td print-right">${formatCurrency(item.price || 0)}</td>
        <td class="print-td print-right">${formatCurrency(item.amount || (item.price * (item.unit_count || 1)))}</td>
      </tr>
    `).join('');

    // สร้างหมายเหตุ - ใช้หมายเหตุที่ส่งมา หรือใช้ค่า default
    const noteContent = invoiceNote && invoiceNote.trim() 
      ? invoiceNote 
      : 'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พัชรพล ยอดราช ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ใบแจ้งหนี้ ${invoice_number}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background:#fff; }
  body {
    font-family: 'Prompt', Arial, sans-serif;
    font-size: 14px; line-height: 1.4;
    color: #000;
  }

  /* Container */
  .print-container{
    max-width: 210mm;
    margin: 0 auto;
    padding: 10mm;
    width: 100%;
    box-sizing: border-box;
    background: #fff;
    color: #000;
  }

  /* Header */
  .print-header { 
    text-align: center;
    border-bottom: 1px solid #ccc;
    padding-bottom: 15px;
    margin-bottom: 20px;
  }
  .print-title {
    font-size: 24px; font-weight: 700; margin: 0 0 8px 0; color:#000;
  }
  .print-company-name {
    font-size: 20px; font-weight: 600; margin: 0 0 6px 0; color:#374151;
  }
  .print-company-details {
    font-size: 14px; line-height:1.3; color:#6b7280; margin: 0;
  }

  /* Info Section */
  .print-info-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-bottom: 25px;
  }
  .print-section-title {
    font-size: 18px; font-weight: 600; color:#374151; margin: 0 0 12px 0;
  }
  .print-info-details { font-size:14px; }
  .print-info-details p { margin: 4px 0; color:#374151; }
  .print-label { font-weight:500; }

  /* Table Section */
  .print-table-section { margin: 25px 0; }
    .print-table-wrapper {
    border: 1px solid #9ca3af;      /* เส้นนอก */
    border-radius: 4px;             /* มุมโค้ง */
    overflow: hidden;               /* บังคับให้โค้งจริง */
    }
    .print-table {
    width: 100%;
    border-collapse: collapse;      /* รวมเส้น border */
    border-spacing: 0;
    }

  .print-header-row { background-color: #f3f4f6; }
  .print-th {
    background-color: #f3f4f6;
    border-right: 1px solid #9ca3af;
    border-bottom: 1px solid #9ca3af;
    padding: 8px 12px;
    font-weight: 500;
    color: #374151;
    font-size: 14px;
    text-align: center;
  }
  .print-th:last-child { border-right: none; }
  .print-td {
    border-right: 1px solid #9ca3af;
    border-bottom: 1px solid #9ca3af;
    padding: 8px 12px;
    font-size: 14px;
    color: #374151;
    background: #fff;
    }
  .print-td:last-child { border-right: none; }

    .print-description-col { text-align: left; }
    .print-center { text-align: center; }
    .print-right { text-align: right; }

  .print-total-row { background-color: #f3f4f6; font-weight:700; }
    .print-total-row .print-td {
    background-color: #f3f4f6;
    font-weight: 700;
    font-size: 16px;
    border-top: 1px solid #9ca3af;  /* เส้นบนรวมทั้งสิ้นหนาขึ้น */
    }
  .print-total-label { text-align: center !important; }
  .print-total-amount { text-align: right !important; }

  /* Notes */
  .print-notes-section { margin: 25px 0; }
  .print-notes-title {
    font-weight: 600; margin: 0 0 12px 0;
    font-size: 16px; color:#374151;
    text-decoration: underline;
  }
  .print-notes-content {
    font-size:14px; color:#374151; line-height:1.5;
    background-color:#f9fafb; padding:16px; border-radius:4px; margin:0;
    white-space: pre-line;
  }

  /* Signature Section */
  .print-signature-section {
    border: 1px solid #9ca3af; border-radius: 4px;
    padding: 24px; background-color: #f9fafb; margin-top: 25px;
  }
  .print-amount-display { text-align:center; margin-bottom:25px; }
  .print-amount-line { margin-bottom:10px; font-size:14px; color:#6b7280; }
  .print-amount-underline {
    margin: 0 15px; border-bottom:1px solid #6b7280;
    display:inline-block; min-width:80px; text-align:center; color:#374151;
  }
  .print-amount-words { font-size:14px; color:#6b7280; }
  .print-signature-fields {
    display:grid; grid-template-columns:1fr 1fr; gap:40px;
  }
  .print-signature-field { text-align:center; }
  .print-signature-line {
    border-bottom: 1px solid #000; height:30px; margin: 0 auto 8px auto; width: 180px;
  }
  .print-signature-label { font-size:14px; color:#6b7280; margin:4px 0; }
  .print-signature-underline { font-size:14px; color:#6b7280; margin:0; }

@media print {
  @page { size: A4; margin: 0; }   /* ให้ตรงกับต้นฉบับ */
  body { -webkit-print-color-adjust: exact; color-adjust: exact; }
}
</style>
    </head>
    <body>
      <div class="print-container">
        <!-- Header -->
        <div class="print-header">
          <div class="print-header-content">
            <h1 class="print-title">ใบแจ้งหนี้</h1>
            <h2 class="print-company-name">${dorm_name}</h2>
            <div class="print-company-details">
              ${dorm_address}<br/>
              ${[
                dorm_subdistrict && `ตำบล${dorm_subdistrict}`,
                dorm_district && `อำเภอ${dorm_district}`,
                dorm_province && `จังหวัด${dorm_province}`
              ].filter(Boolean).join(' ') || 'ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี'}<br/>
              โทรศัพท์: ${dorm_phone}
            </div>
          </div>
        </div>

        <!-- Customer & Invoice Info -->
        <div class="print-info-section">
          <div class="print-info-left">
            <h3 class="print-section-title">ข้อมูลลูกค้า</h3>
            <div class="print-info-details">
              <p><span class="print-label">ชื่อ:</span> ${tenant_name || 'ไม่ระบุชื่อ'}</p>
              <p><span class="print-label">เบอร์โทร:</span> ${tenant_phone || 'ไม่ระบุเบอร์โทร'}</p>
              <p><span class="print-label">ที่อยู่:</span> ${tenant_address || 'ไม่ระบุที่อยู่'}</p>
              <p>${[
                tenant_subdistrict && `ตำบล${tenant_subdistrict}`,
                tenant_district && `อำเภอ${tenant_district}`,  
                tenant_province && `จังหวัด${tenant_province}`
              ].filter(Boolean).join(' ')}</p>
            </div>
          </div>
          <div class="print-info-right">
            <h3 class="print-section-title">รายละเอียดใบแจ้งหนี้</h3>
            <div class="print-info-details">
              <p><span class="print-label">เลขที่ / No:</span> ${invoice_number}</p>
              <p><span class="print-label">วันที่ / Date:</span> ${formatDate(created_at || new Date())}</p>
              <p><span class="print-label">ห้อง / Room:</span> ${room_number}</p>
              <p><span class="print-label">ครบกำหนด / Due Date:</span> ${formatDate(due_date)}</p>
            </div>
          </div>
        </div>

        <!-- Items Table -->
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
                 ${itemsHTML || '<tr><td colspan="4" style="text-align: center; padding: 20px;">ไม่มีรายการค่าใช้จ่าย</td></tr>'}
                <tr class="print-total-row">
                <td class="print-td print-total-label" colspan="3" style="border-bottom: 0px solid #9ca3af;">รวมทั้งสิ้น / Grand Total</td>
                <td class="print-td print-total-amount" style="border-bottom: 0px solid #9ca3af;">${formatCurrency(amount)} บาท</td>
                </tr>
            </tbody>
            </table>
        </div>
        </div>


        <!-- Notes -->
        <div class="print-notes-section">
          <h4 class="print-notes-title">หมายเหตุ:</h4>
          <div class="print-notes-content">${noteContent}</div>
        </div>

        <!-- Signature Section -->
        <div class="print-signature-section">
          <div class="print-amount-display">
            <div class="print-amount-line">
              <span>จำนวน</span>
              <span class="print-amount-underline">
                ${parseFloat(amount || 0).toLocaleString('th-TH')}
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
    </body>
    </html>
    `;
  }

  // สร้าง PDF จาก HTML
  async generatePDFBuffer(htmlContent) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // ตั้งค่าความละเอียดและขนาดหน้า
      await page.setViewport({ width: 794, height: 1123 }); // A4 ขนาด
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // สร้าง PDF
    const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' } // ใช้ padding ของ .print-container แทน
    });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  // สร้างไฟล์ PDF ชั่วคราว
  async generateInvoicePDF(billData, invoiceNote = '') {
    try {
      const htmlContent = this.generateInvoiceHTML(billData, invoiceNote);
      const pdfBuffer = await this.generatePDFBuffer(htmlContent);
      
      // สร้างชื่อไฟล์
      const fileName = `invoice_${billData.invoice_number || Date.now()}.pdf`;
      const filePath = path.join(__dirname, '..', 'temp', fileName);

      // สร้างโฟลเดอร์ temp ถ้ายังไม่มี
      const tempDir = path.dirname(filePath);
      await fs.mkdir(tempDir, { recursive: true });

      // เขียนไฟล์
      await fs.writeFile(filePath, pdfBuffer);

      return {
        success: true,
        buffer: pdfBuffer,
        filePath: filePath,
        fileName: fileName
      };
    } catch (error) {
      console.error('❌ สร้าง PDF ล้มเหลว:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ลบไฟล์ชั่วคราว
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('⚠️ ไม่สามารถลบไฟล์ชั่วคราว:', error.message);
    }
  }
}

module.exports = new PDFService();
