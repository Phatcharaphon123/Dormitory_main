const nodemailer = require('nodemailer');
const pool = require('../db'); // เพิ่มการเชื่อมต่อฐานข้อมูล
const pdfService = require('./pdfService'); // เพิ่ม PDF Service
require('dotenv').config();

class EmailService {
  constructor() {
    // ตั้งค่า transporter สำหรับส่งอีเมล
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // หรือ smtp server อื่น
      auth: {
        user: process.env.EMAIL_USER, // อีเมลของหอพัก
        pass: process.env.EMAIL_PASS  // App Password สำหรับ Gmail
      }
    });
  }

  // ดึงข้อมูลหอพัก
  async getDormitoryInfo(dormId) {
    const result = await pool.query(
      'SELECT name, email, phone, address FROM dormitories WHERE dorm_id = $1',
      [dormId]
    );
    return result.rows[0];
  }

  // สร้าง HTML template สำหรับใบแจ้งหนี้
  generateInvoiceHTML(billData) {
    const { 
      tenant_name, 
      room_number, 
      invoice_number, 
      amount, 
      due_date,
      dorm_name,
      dorm_address,
      dorm_phone,
      invoice_items = []
    } = billData;

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('th-TH');
    };

    const formatCurrency = (amount) => {
      return parseFloat(amount).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // สร้างตารางรายการค่าใช้จ่าย
    const itemsHTML = invoice_items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.unit_count || 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price || 0)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency((item.price || 0) * (item.unit_count || 1))}</td>
      </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ใบแจ้งหนี้ - ${dorm_name}</title>
      <style>
        body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #4a90e2; padding-bottom: 20px; margin-bottom: 30px; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-section { flex: 1; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th { background-color: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: left; }
        .table td { padding: 8px; border: 1px solid #ddd; }
        .total-section { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .total-amount { font-size: 18px; font-weight: bold; color: #4a90e2; text-align: right; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>ใบแจ้งหนี้</h1>
          <h2>${dorm_name}</h2>
          <p>${dorm_address}</p>
          <p>โทรศัพท์: ${dorm_phone}</p>
        </div>

        <!-- Invoice Info -->
        <div class="invoice-info">
          <div class="info-section">
            <h3>ข้อมูลลูกค้า</h3>
            <p><strong>ชื่อ:</strong> ${tenant_name || 'ไม่ระบุชื่อ'}</p>
            <p><strong>ห้อง:</strong> ${billData.room_number}</p>
          </div>
          <div class="info-section">
            <h3>รายละเอียดใบแจ้งหนี้</h3>
            <p><strong>เลขที่:</strong> ${invoice_number}</p>
            <p><strong>วันที่:</strong> ${formatDate(new Date())}</p>
            <p><strong>ครบกำหนด:</strong> ${formatDate(due_date)}</p>
          </div>
        </div>

        <!-- Items Table -->
        <table class="table">
          <thead>
            <tr>
              <th>รายการ</th>
              <th style="text-align: center;">จำนวน</th>
              <th style="text-align: right;">ราคา/หน่วย</th>
              <th style="text-align: right;">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <!-- Total -->
        <div class="total-section">
          <div class="total-amount">
            รวมทั้งสิ้น: ${formatCurrency(amount)} บาท
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>หมายเหตุ:</strong></p>
          <p>กรุณาชำระเงินภายในวันที่กำหนด หากมีข้อสงสัยกรุณาติดต่อ ${dorm_phone}</p>
          <p style="text-align: center; margin-top: 20px; color: #999;">
            อีเมลนี้ถูกส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // ส่งบิลไปยังผู้เช่า
  async sendInvoiceToTenant(billData) {
    let pdfResult = null; // ประกาศที่นี่เพื่อใช้ใน catch block ได้
    
    try {
      const { tenant_email, tenant_name, dorm_name, invoice_number, dorm_id } = billData;

      if (!tenant_email) {
        throw new Error('ไม่พบอีเมลผู้เช่า');
      }

      // ดึงข้อมูลหอพักจาก database
      const dormInfo = await this.getDormitoryInfo(dorm_id);
      
      // ดึงหมายเหตุเริ่มต้นจากฐานข้อมูล (เหมือนกับ MonthDetailBills)
      let invoiceNote = '';
      try {
        const pool = require('../db');
        
        // ลองดึงหมายเหตุแบบมี receipt_type ก่อน (สำหรับ monthly bills)
        let noteQuery = `
          SELECT note_content 
          FROM default_receipt_notes 
          WHERE dorm_id = $1 AND receipt_type = $2
        `;
        
        console.log(`🔍 ดึงหมายเหตุสำหรับ dorm_id: ${dorm_id}, receipt_type: monthly`);
        let noteResult = await pool.query(noteQuery, [dorm_id, 'monthly']);
        console.log(`📝 พบหมายเหตุแบบ monthly: ${noteResult.rows.length} รายการ`);
        
        // ถ้าไม่มี receipt_type = 'monthly' ลองแบบไม่ระบุ receipt_type (สำหรับข้อมูลเก่า)
        if (noteResult.rows.length === 0) {
          noteQuery = `
            SELECT note_content 
            FROM default_receipt_notes 
            WHERE dorm_id = $1 AND (receipt_type IS NULL OR receipt_type = 'monthly')
            ORDER BY created_at DESC 
            LIMIT 1
          `;
          console.log(`🔍 ดึงหมายเหตุแบบ fallback สำหรับ dorm_id: ${dorm_id}`);
          noteResult = await pool.query(noteQuery, [dorm_id]);
          console.log(`📝 พบหมายเหตุแบบ fallback: ${noteResult.rows.length} รายการ`);
        }
        
        if (noteResult.rows.length > 0 && noteResult.rows[0].note_content) {
          invoiceNote = noteResult.rows[0].note_content;
          console.log(`✅ ใช้หมายเหตุจากฐานข้อมูล: ${invoiceNote.substring(0, 100)}...`);
        } else {
          // ใช้ค่า fallback เหมือนกับ MonthDetailBills
          invoiceNote = 'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พีชพล ยอดราษ ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท';
          console.log(`⚠️ ไม่พบหมายเหตุในฐานข้อมูล ใช้ค่า fallback`);
        }
      } catch (noteError) {
        console.warn('⚠️ ไม่สามารถดึงหมายเหตุจากฐานข้อมูลได้:', noteError.message);
        // ถ้า error อาจจะเป็นเพราะไม่มี column receipt_type ลองแบบง่ายๆ
        try {
          const pool = require('../db');
          const simpleQuery = `
            SELECT note_content 
            FROM default_receipt_notes 
            WHERE dorm_id = $1 
            ORDER BY default_receipt_note_id DESC 
            LIMIT 1
          `;
          const simpleResult = await pool.query(simpleQuery, [dorm_id]);
          
          if (simpleResult.rows.length > 0 && simpleResult.rows[0].note_content) {
            invoiceNote = simpleResult.rows[0].note_content;
            console.log(`✅ ใช้หมายเหตุแบบ simple จากฐานข้อมูล: ${invoiceNote.substring(0, 100)}...`);
          } else {
            invoiceNote = 'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พีชพล ยอดราษ ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท';
            console.log(`❌ ไม่พบข้อมูลเลย - ใช้ค่า fallback`);
          }
        } catch (simpleError) {
          invoiceNote = 'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พีชพล ยอดราษ ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท';
          console.log(`❌ Error ซ้ำ - ใช้ค่า fallback`);
        }
      }
      
      // === การแยกระหว่าง SMTP กับ Display Email ===
      // 1. SMTP Email: ใช้สำหรับ authenticate กับ Gmail SMTP (จาก .env)
      const smtpEmail = process.env.EMAIL_USER; // dormitorysystem248@gmail.com - ตัวส่งจริง
      
      // 2. Display Email: ใช้แสดงให้ผู้เช่าเห็น (จาก database)
      const displayEmail = dormInfo?.email || smtpEmail; // baanouu.office@gmail.com - ที่ผู้เช่าเห็น
      const displayName = dormInfo?.name || dorm_name;   // "หอพักบ้านอู๋"

      // สร้าง PDF ใบแจ้งหนี้ (ส่งหมายเหตุไปด้วย)
      pdfResult = await pdfService.generateInvoicePDF(billData, invoiceNote);
      
      if (!pdfResult.success) {
        throw new Error(`ไม่สามารถสร้าง PDF ได้: ${pdfResult.error}`);
      }

      const mailOptions = {
        // From: ที่ผู้เช่าเห็นว่าเมลมาจากไหน (ใช้อีเมลหอพัก)
        from: `${displayName} <${displayEmail}>`,
        
        // ReplyTo: ถ้าผู้เช่ากด Reply จะตอบกลับไปที่นี่ (อีเมลหอพัก)
        replyTo: displayEmail,
        
        // To: ผู้รับ (อีเมลผู้เช่า)
        to: tenant_email,
        
        // Subject: หัวข้อเมล
        subject: `ใบแจ้งหนี้ ${invoice_number} ห้อง-${billData.room_number} - ${displayName}`,

        // HTML Content: เนื้อหาอีเมลแบบง่าย
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">ใบแจ้งหนี้ ${invoice_number} ห้อง-${billData.room_number}</h2>
          <p>เรียน คุณ ${tenant_name}</p>
          <p>ใบแจ้งหนี้สำหรับค่าห้องพักประจำเดือน ${new Date(billData.created_at).toLocaleDateString('th-TH')}</p>
          <p>กรุณาตรวจสอบรายละเอียดในไฟล์แนบ (PDF)</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>ห้อง:</strong> ${billData.room_number}</p>
            <p><strong>จำนวนเงิน:</strong> ${parseFloat(billData.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
            <p><strong>วันครบกำหนด:</strong> ${new Date(billData.due_date).toLocaleDateString('th-TH')}</p>
          </div>
          
          <p>หากมีข้อสงสัยกรุณาติดต่อ ${dormInfo?.phone || billData.dorm_phone}</p>
          <p>ขอบคุณครับ</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; text-align: center;">
            ${displayName}<br>
            อีเมลนี้ส่งจากระบบอัตโนมัติ
          </p>
        </div>
        `,
        
        // แนบไฟล์ PDF
        attachments: [
          {
            filename: pdfResult.fileName,
            content: pdfResult.buffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // ส่งอีเมลผ่าน SMTP (ใช้ smtpEmail สำหรับ authenticate)
      const result = await this.transporter.sendMail(mailOptions);
      
      // ลบไฟล์ PDF ชั่วคราวหลังส่งเสร็จ
      await pdfService.cleanupTempFile(pdfResult.filePath);
      
      console.log(`✅ ส่งเมลสำเร็จ:
        - SMTP Account: ${smtpEmail} (ตัวส่งจริง - จะเห็นใน Sent folder)
        - Display From: ${displayName} <${displayEmail}> (ที่ผู้เช่าเห็น)
        - Reply To: ${displayEmail} (ถ้าผู้เช่าตอบกลับ)
        - Sent To: ${tenant_email}
        - PDF Attached: ${pdfResult.fileName}`);

      // บันทึกประวัติการส่งบิลสำเร็จ
      try {
        const pool = require('../db');
        await pool.query(
          `INSERT INTO bill_send_history (bill_id, send_method, send_to, send_status, send_date) 
           VALUES ($1, 'email', $2, 'sent', NOW())`,
          [billData.invoice_receipt_id || billData.id, tenant_email]
        );
      } catch (historyError) {
        console.log('⚠️ ไม่สามารถบันทึกประวัติการส่งได้:', historyError.message);
      }
      
      return {
        success: true,
        messageId: result.messageId,
        message: `ส่งใบแจ้งหนี้ไปยัง ${tenant_email} เรียบร้อยแล้ว`
      };

    } catch (error) {
      console.error('❌ ส่งอีเมลล้มเหลว:', error);
      
      // บันทึกประวัติการส่งบิลล้มเหลว
      try {
        const pool = require('../db');
        await pool.query(
          `INSERT INTO bill_send_history (bill_id, send_method, send_to, send_status, send_date, error_message) 
           VALUES ($1, 'email', $2, 'failed', NOW(), $3)`,
          [billData.invoice_receipt_id || billData.id, billData.tenant_email, error.message]
        );
      } catch (historyError) {
        console.log('⚠️ ไม่สามารถบันทึกประวัติการส่งที่ล้มเหลวได้:', historyError.message);
      }
      
      // ถ้าเกิดข้อผิดพลาด ให้ลบไฟล์ชั่วคราวด้วย
      if (pdfResult && pdfResult.filePath) {
        await pdfService.cleanupTempFile(pdfResult.filePath);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ส่งบิลหลายใบพร้อมกัน
  async sendMultipleInvoices(billsData) {
    const results = [];
    
    for (const billData of billsData) {
      const result = await this.sendInvoiceToTenant(billData);
      results.push({
        invoice_number: billData.invoice_number,
        tenant_email: billData.tenant_email,
        ...result
      });
      
      // หน่วงเวลาเล็กน้อยเพื่อไม่ให้ส่งเร็วเกินไป
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  // ทดสอบการเชื่อมต่ออีเมล
  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'เชื่อมต่ออีเมลสำเร็จ' };
    } catch (error) {
      console.error('❌ ทดสอบการเชื่อมต่อล้มเหลว:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
