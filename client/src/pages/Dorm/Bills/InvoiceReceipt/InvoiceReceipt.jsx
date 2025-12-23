import React, { useState, useEffect } from "react";
import { FaPrint, FaTimes } from "react-icons/fa";
import { useParams } from "react-router-dom";
import axios from "axios";
import PrintInvoice from "./PrintInvoice";

const InvoiceReceipt = ({
  showModal,
  onClose,
  invoiceId, // เปลี่ยนจากรับ billData เป็นรับแค่ invoiceId
}) => {
  const { dormId } = useParams();
  const [billData, setBillData] = useState(null);
  const [invoiceData, setInvoiceData] = useState({});
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [invoiceNote, setInvoiceNote] = useState("");
  const [loading, setLoading] = useState(false);

  // เรียก API เมื่อ modal เปิดและมี invoiceId
  useEffect(() => {
    if (showModal && invoiceId && dormId) {
      fetchInvoiceData();
    }
  }, [showModal, invoiceId, dormId]);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      console.log(
        "🔄 InvoiceReceipt fetching API data for invoice:",
        invoiceId
      );
      console.log(
        "🔄 API URL:",
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
        }/api/bills/dormitories/${dormId}/invoices/${invoiceId}`
      );

      const response = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
        }/api/bills/dormitories/${dormId}/invoices/${invoiceId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      console.log("📥 InvoiceReceipt API Response:", response.data);

      const { invoice, invoice_items } = response.data;

      setBillData(invoice);
      setInvoiceItems(invoice_items || []);

      // ดึงหมายเหตุจากตาราง default_receipt_notes
      try {
        const noteResponse = await axios.get(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
          }/api/receipts/dormitories/${dormId}/default-note?receipt_type=monthly`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        if (noteResponse.data && noteResponse.data.note_content) {
          setInvoiceNote(noteResponse.data.note_content);
        } else {
          setInvoiceNote(
            'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พีชพล ยอดราษ ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท'
          );
        }
      } catch (noteErr) {
        console.error("โหลดหมายเหตุเริ่มต้นล้มเหลว:", noteErr);
        setInvoiceNote(
          'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พีชพล ยอดราษ ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท'
        );
      }

      setInvoiceData({
        dorm_name: invoice.dorm_name,
        dorm_address: invoice.dorm_address,
        dorm_phone: invoice.dorm_phone,
        dorm_subdistrict: invoice.dorm_subdistrict,
        dorm_district: invoice.dorm_district,
        dorm_province: invoice.dorm_province,
      });
    } catch (error) {
      console.error("❌ InvoiceReceipt API Error:", error);
    } finally {
      setLoading(false);
    }
  };
  // Debug: ตรวจสอบข้อมูลที่ได้รับ

  // Debug: ตรวจสอบ structure ของ invoiceItems
  if (invoiceItems && invoiceItems.length > 0) {
    console.log(
      "📊 Invoice Items Detail:",
      invoiceItems.map((item) => ({
        description: item.description,
        unit_count: item.unit_count,
        units: item.units,
        price: item.price,
        rate: item.rate,
        amount: item.amount,
      }))
    );
  }

  // คำนวณ total จาก invoiceItems หาก billData.total_amount ไม่มีค่า
  const calculateTotal = () => {
    if (billData?.total_amount && parseFloat(billData.total_amount) > 0) {
      return parseFloat(billData.total_amount);
    }

    if (invoiceItems && invoiceItems.length > 0) {
      return invoiceItems.reduce((sum, item) => {
        const amount = parseFloat(item.amount) || 0;
        // ตรวจสอบว่าเป็นส่วนลดหรือไม่
        if (item.type === "discount" || item.item_type === "discount") {
          return sum - Math.abs(amount); // ลบส่วนลดออกจากยอดรวม
        }
        return sum + amount;
      }, 0);
    }

    return 0;
  };

  const totalAmount = calculateTotal();

  const printInvoice = () => {
    // Debug: ตรวจสอบข้อมูลก่อนพิมพ์
    console.log("🖨️ กำลังเรียก PrintInvoice.printSingleBill", {
      billData,
      invoiceData,
      invoiceItems,
      invoiceItemsLength: invoiceItems?.length,
      invoiceNote,
    });

    // ใช้ PrintInvoice ในการพิมพ์บิลเดียว พร้อมส่ง invoiceItems
    PrintInvoice.printSingleBill(
      billData,
      invoiceData,
      invoiceNote,
      `ใบแจ้งหนี้-${billData?.room_number || "N/A"}`,
      invoiceItems
    );
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white rounded-md shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 mx-4 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">ใบแจ้งหนี้</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <FaTimes className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Invoice Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8">
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : !billData ? (
            <div className="text-center py-8 text-red-500">
              <p>ไม่พบข้อมูลใบแจ้งหนี้</p>
            </div>
          ) : (
            <div className="border rounded-md p-6">
              {/* Invoice Header - Fixed at top */}
              {!loading && billData && (
                <div className="bg-white border-b border-gray-300 p-6 mb-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2 text-gray-800">
                      ใบแจ้งหนี้
                    </h1>
                    <h2 className="text-xl font-semibold mb-1 text-gray-700">
                      {billData?.dorm_name || "Sweet Roomie Dorm"}
                    </h2>
                    <div className="text-sm text-gray-600">
                      {billData?.dorm_address || "88/12 ถนนราชพฤกษ์"}
                      <br />
                      {[
                        billData?.dorm_subdistrict &&
                          `ตำบล${billData.dorm_subdistrict}`,
                        billData?.dorm_district &&
                          `อำเภอ${billData.dorm_district}`,
                        billData?.dorm_province &&
                          `จังหวัด${billData.dorm_province}`,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                        "ตำบลบางรักพัฒนา อำเภอบางบัวทอง จังหวัดนนทบุรี"}
                      <br />
                      โทรศัพท์: {billData?.dorm_phone || "081-234-5678"}
                    </div>
                  </div>
                </div>
              )}
              {/* Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    ข้อมูลลูกค้า
                  </h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">ชื่อ:</span>{" "}
                      {billData?.tenant_name || "ไม่ระบุชื่อผู้เช่า"}
                    </p>
                    <p>
                      <span className="font-medium">เบอร์โทร:</span>{" "}
                      {billData?.tenant_phone || "ไม่ระบุเบอร์โทร"}
                    </p>
                    <p>
                      <span className="font-medium">ที่อยู่:</span>{" "}
                      {billData?.tenant_address || "ไม่ระบุที่อยู่"}
                    </p>
                    {billData?.tenant_address &&
                      billData?.tenant_address !== "ไม่ระบุที่อยู่" && (
                        <p>
                          {[
                            billData?.tenant_subdistrict &&
                              `ตำบล${billData.tenant_subdistrict}`,
                            billData?.tenant_district &&
                              `อำเภอ${billData.tenant_district}`,
                            billData?.tenant_province &&
                              `จังหวัด${billData.tenant_province}`,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    รายละเอียดใบแจ้งหนี้
                  </h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">เลขที่ / No:</span>{" "}
                      {billData?.invoice_number || "INV" + Date.now()}
                    </p>
                    <p>
                      <span className="font-medium">วันที่ / Date:</span>{" "}
                      {billData?.created_at
                        ? new Date(billData.created_at).toLocaleDateString(
                            "th-TH"
                          )
                        : new Date().toLocaleDateString("th-TH")}
                    </p>
                    <p>
                      <span className="font-medium">ห้อง / Room:</span>{" "}
                      {billData?.room_number || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">ครบกำหนด / Due Date:</span>{" "}
                      {billData?.due_date
                        ? new Date(billData.due_date).toLocaleDateString(
                            "th-TH"
                          )
                        : "ไม่ระบุ"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  รายการค่าใช้จ่าย
                </h3>

                <div className="border border-gray-400 rounded-md overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-r border-b border-gray-400 px-4 py-3 text-left font-medium text-gray-700">
                          รายการ / Description
                        </th>
                        <th className="border-r border-b border-gray-400 px-4 py-3 text-center font-medium text-gray-700">
                          จำนวนหน่วย
                        </th>
                        <th className="border-r border-b border-gray-400 px-4 py-3 text-center font-medium text-gray-700">
                          ราคาต่อหน่วย
                        </th>
                        <th className="border-b border-gray-400 px-4 py-3 text-center font-medium text-gray-700">
                          จำนวนเงิน
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems && invoiceItems.length > 0 ? (
                        invoiceItems.map((item, index) => {
                          // จัดการการแสดงผลสำหรับส่วนลด
                          const isDiscount =
                            item.type === "discount" ||
                            item.item_type === "discount";
                          const displayRate = isDiscount
                            ? `-${Math.abs(
                                parseFloat(item.price || item.rate) || 0
                              ).toFixed(2)}`
                            : (
                                parseFloat(item.price || item.rate) || 0
                              ).toFixed(2);
                          const displayAmount = isDiscount
                            ? `-${Math.abs(
                                parseFloat(item.amount) || 0
                              ).toFixed(2)}`
                            : (parseFloat(item.amount) || 0).toFixed(2);

                          return (
                            <tr
                              key={index}
                              className="border-b border-gray-400"
                            >
                              <td className="border-r border-gray-400 px-4 py-3">
                                {item.description || item.type}
                              </td>
                              <td className="border-r border-gray-400 px-4 py-3 text-center">
                                {(item.unit_count !== undefined && item.unit_count !== null) ? item.unit_count : (item.units !== undefined && item.units !== null) ? item.units : 1}
                              </td>
                              <td className="border-r border-gray-400 px-4 py-3 text-right">
                                {Number(parseFloat(displayRate)).toLocaleString(
                                  "th-TH",
                                  { minimumFractionDigits: 2 }
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {Number(
                                  parseFloat(displayAmount)
                                ).toLocaleString("th-TH", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            ไม่มีรายการ
                          </td>
                        </tr>
                      )}

                      <tr className="bg-gray-100 font-bold">
                        <td
                          colSpan="3"
                          className="px-4 py-4 text-center text-lg text-gray-800"
                        >
                          รวมทั้งสิ้น / Grand Total
                        </td>
                        <td className="px-4 py-4 text-right text-lg text-gray-800">
                          {Number(parseFloat(totalAmount) || 0).toLocaleString(
                            "th-TH",
                            { minimumFractionDigits: 2 }
                          )}{" "}
                          บาท
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-gray-800 underline">
                  หมายเหตุ:
                </h4>
                <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-line">
                  {invoiceNote ||
                    'กรุณาชำระเงินภายในวันที่ 5 ด้วยการโอนเข้าบัญชี นาย พีชพล ยอดราษ ธนาคารไทยพาณิชย์ เลขที่ 302-4-04454-7 หรือ พร้อมเพย์ 086-3427425 แล้วส่ง"สลิป"ให้อินบ็อกซ์โลน หากไม่ชำระเงินภายใน 5 วัน กรุณาเสียค่าปรับวันละ 100 บาท'}
                </div>
              </div>

              {/* Signature Section */}
              <div className="border border-gray-400 rounded-lg p-6 bg-gray-50">
                <div className="text-center mb-6">
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">จำนวน</span>
                    <span className="mx-4 border-b border-gray-400 inline-block w-20 text-center">
                      {Number(parseFloat(totalAmount) || 0).toLocaleString(
                        "th-TH"
                      )}
                    </span>
                    <span className="text-sm text-gray-600">บาท</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    ( _______________________________________ )
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="border-b border-gray-400 h-6 w-[150px] mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 mb-1">ผู้ชำระเงิน</p>
                    <p className="text-sm text-gray-600">
                      ( ___________________________ )
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-gray-400 h-6 w-[150px] mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 mb-1">ผู้รับเงิน</p>
                    <p className="text-sm text-gray-600">
                      ( ___________________________ )
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            ปิด
          </button>
          <button
            onClick={printInvoice}
            className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 hover:shadow-md transition-all duration-200 flex items-center gap-2"
          >
            <FaPrint className="w-4 h-4" />
            พิมพ์หรือดาวน์โหลด
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceReceipt;
