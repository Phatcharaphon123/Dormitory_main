import React from 'react';
import { FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * ExcelExportButton Component
 * ปุ่มส่งออกข้อมูลเป็นไฟล์ Excel ที่สามารถใช้ซ้ำได้
 * 
 * @param {Object} props
 * @param {Array} props.data - ข้อมูลที่จะส่งออก (array of objects)
 * @param {Object} props.columns - การแมปคอลัมน์ { key: 'ชื่อหัวข้อ' }
 * @param {string} props.fileName - ชื่อไฟล์ (ไม่รวม .xlsx)
 * @param {string} props.sheetName - ชื่อชีท (default: 'Sheet1')
 * @param {string} props.buttonText - ข้อความในปุ่ม (default: 'ส่งออก Excel')
 * @param {string} props.className - CSS class เพิ่มเติม
 * @param {boolean} props.disabled - สถานะปิดการใช้งาน
 * @param {Function} props.onExportStart - callback เมื่อเริ่มส่งออก
 * @param {Function} props.onExportComplete - callback เมื่อส่งออกเสร็จ
 * @param {Function} props.formatData - function สำหรับจัดรูปแบบข้อมูลก่อนส่งออก
 */
const ExcelExportButton = ({
  data = [],
  columns = {},
  fileName = 'export_data',
  sheetName = 'Sheet1',
  buttonText = 'ส่งออก Excel',
  className = '',
  disabled = false,
  onExportStart,
  onExportComplete,
  formatData
}) => {
  
  // ฟังก์ชันจัดรูปแบบวันที่เป็นไทย
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // ฟังก์ชันส่งออก Excel
  const handleExport = () => {
    try {
      // เรียก callback เมื่อเริ่มส่งออก
      if (onExportStart) {
        onExportStart();
      }

      // ตรวจสอบข้อมูล
      if (!data || data.length === 0) {
        alert('ไม่มีข้อมูลสำหรับส่งออก');
        return;
      }

      // จัดรูปแบบข้อมูล
      let processedData = data;
      
      // ใช้ formatData ถ้ามีการกำหนด
      if (formatData && typeof formatData === 'function') {
        processedData = formatData(data);
      } else {
        // จัดรูปแบบข้อมูลตาม columns mapping
        processedData = data.map((item, index) => {
          const formattedItem = {};
          
          // แปลงข้อมูลตาม columns mapping
          Object.keys(columns).forEach(key => {
            const columnName = columns[key];
            let value = item[key];
            
            // ไม่ต้องจัดรูปแบบวันที่เพิ่มเติม เพราะข้อมูลได้จัดรูปแบบแล้วจาก parent component
            // แค่ตรวจสอบว่าเป็น number หรือไม่ สำหรับจำนวนเงิน
            if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
              value = value.toLocaleString();
            }
            
            formattedItem[columnName] = value !== null && value !== undefined ? value : '-';
          });
          
          return formattedItem;
        });
      }

      // สร้าง workbook และ worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(processedData);
      
      // ปรับความกว้างคอลัมน์อัตโนมัติ
      const range = XLSX.utils.decode_range(ws['!ref']);
      const wscols = [];
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxLength = 0;
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = ws[cellAddress];
          if (cell && cell.v) {
            const cellLength = cell.v.toString().length;
            maxLength = Math.max(maxLength, cellLength);
          }
        }
        wscols.push({ wch: Math.min(Math.max(maxLength + 2, 10), 50) });
      }
      ws['!cols'] = wscols;
      
      // เพิ่ม worksheet ลงใน workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // สร้างชื่อไฟล์พร้อมวันที่
      const currentDate = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
      const finalFileName = `${fileName}_${currentDate}.xlsx`;
      
      // ส่งออกไฟล์
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, finalFileName);
      
      // เรียก callback เมื่อส่งออกเสร็จ
      if (onExportComplete) {
        onExportComplete(finalFileName);
      }
      
      console.log(`✅ ส่งออก Excel สำเร็จ: ${finalFileName}`);
      
    } catch (error) {
      console.error('❌ Error exporting Excel:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์');
    }
  };

  // ส่วน UI
  return (
    <button
      onClick={handleExport}
      disabled={disabled || !data || data.length === 0}
      className={`
        bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md 
        flex items-center gap-2 transition-colors shadow-sm
        disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400
        ${className}
      `}
      title={data && data.length > 0 ? `ส่งออกข้อมูล ${data.length} รายการ` : 'ไม่มีข้อมูลสำหรับส่งออก'}
    >
      <FaFileExcel className="w-4 h-4" />
      {buttonText}
    </button>
  );
};

export default ExcelExportButton;
