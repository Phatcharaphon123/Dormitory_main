import { useState } from "react";
import NavbarDashboard from "./NavbarDashboard";

function Dashboard() {
  const [selectedBuilding, setSelectedBuilding] = useState("all");

  return (
    <div>
      <NavbarDashboard
        selectedBuilding={selectedBuilding}
        onChangeBuilding={setSelectedBuilding}
      />

      <div className="p-5">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <InfoCard title="ค่าเช่า" value="170,555 บาท" color="bg-blue-500" />
          <InfoCard title="ค่าปรับ" value="0 บาท" color="bg-cyan-500" />
          <InfoCard title="ผู้เช่าปัจจุบัน" value="17 ห้อง" color="bg-green-500" />
          <InfoCard title="จำนวนห้องพัก" value="24 รายการ" color="bg-red-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartPlaceholder title="รายได้จากค่าเช่าแยกตามเดือน" />
          <ChartPlaceholder title="จำนวนลูกค้าปัจจุบัน/ย้ายออก" />
          <ChartPlaceholder title="รายได้จากค่าเช่าแยกตามวัน (ล่าสุด 30 วัน)" full />
          <ChartPlaceholder title="รายได้แยกตามปี" />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value, color }) {
  return (
    <div className={`text-white p-4 rounded shadow ${color}`}>
      <h3 className="text-lg">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      <div className="mt-2 text-sm underline">More info</div>
    </div>
  );
}

function ChartPlaceholder({ title, full }) {
  return (
    <div className={`bg-white p-4 rounded shadow ${full ? "col-span-2" : ""}`}>
      <h2 className="text-md font-semibold mb-2">{title}</h2>
      <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
        [Chart Placeholder]
      </div>
    </div>
  );
}

export default Dashboard;
