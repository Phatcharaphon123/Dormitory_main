import React, { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FaBuilding, FaUserFriends, FaMoneyBillWave, FaChartLine, FaFilePdf, FaCalendarAlt, FaFilter } from "react-icons/fa";
import { MdMeetingRoom } from "react-icons/md";

const Dashboard = () => {
  const currentYear = new Date().getFullYear();
  
  // --- 1. State ---
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedDorm, setSelectedDorm] = useState("all"); // State สำหรับเก็บหอพักที่เลือก

  const yearsList = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // ข้อมูลตั้งต้นของหอพัก (Static Config)
  const dormsConfig = [
    { id: "d1", name: "หอพักสุขใจ", total: 50, province: "กรุงเทพฯ" },
    { id: "d2", name: "หอพักรุ่งเรือง", total: 60, province: "นนทบุรี" },
    { id: "d3", name: "แกรนด์ เรสซิเดนซ์", total: 40, province: "ปทุมธานี" },
  ];

  // --- 2. Logic คำนวณข้อมูล (Re-calculate เมื่อเปลี่ยนปี หรือ เปลี่ยนหอ) ---
  const dashboardData = useMemo(() => {
    const isCurrentYear = selectedYear === currentYear;
    
    // Helper: สุ่มตัวเลขให้นิ่งตาม Seed (เพื่อให้กราฟไม่ดีดมั่วเวลากดสลับหอไปมา)
    const pseudoRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // A. จำลองข้อมูลรายหอพัก (Generate Data per Dorm first)
    const processedDorms = dormsConfig.map((dorm, index) => {
      // ใช้ ID และ ปี เป็น Seed ในการสุ่ม
      const seed = index * 100 + selectedYear; 
      const occupancyRate = 0.6 + (pseudoRandom(seed) * 0.35); // สุ่มอัตราการเข้าพัก 60-95%
      
      const occupied = Math.floor(dorm.total * occupancyRate);
      const vacant = dorm.total - occupied;
      const revenue = occupied * 4500; // สมมติค่าเช่า 4500

      return {
        ...dorm,
        occupied,
        vacant,
        revenue
      };
    });

    // B. กรองหอพักตามที่เลือก (Filtering)
    const activeDorms = selectedDorm === "all" 
      ? processedDorms 
      : processedDorms.filter(d => d.id === selectedDorm);

    // C. คำนวณ Summary Stats จากหอที่เลือก (Aggregation)
    const stats = {
      totalRevenue: activeDorms.reduce((sum, d) => sum + d.revenue, 0),
      totalTenants: activeDorms.reduce((sum, d) => sum + d.occupied, 0),
      totalRooms: activeDorms.reduce((sum, d) => sum + d.total, 0),
      occupiedRooms: activeDorms.reduce((sum, d) => sum + d.occupied, 0),
      vacantRooms: activeDorms.reduce((sum, d) => sum + d.vacant, 0),
      totalDorms: activeDorms.length // จำนวนหอที่แสดงอยู่
    };

    // D. สร้างข้อมูลกราฟรายเดือน (Generate Monthly Graph based on Active Dorms)
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const monthsToShow = isCurrentYear ? months.slice(0, new Date().getMonth() + 1) : months;

    const monthlyRevenue = monthsToShow.map((month, mIndex) => {
      // รวมรายได้ของทุกหอที่ active ในเดือนนั้นๆ
      const monthTotal = activeDorms.reduce((sum, dorm) => {
        // Variation รายเดือนเล็กน้อย
        const monthFactor = 0.9 + pseudoRandom(mIndex + dorm.total) * 0.2; 
        return sum + (dorm.revenue * monthFactor);
      }, 0);

      return {
        name: month,
        total: Math.floor(monthTotal)
      };
    });

    return { stats, monthlyRevenue, dorms: activeDorms, allDorms: processedDorms };

  }, [selectedYear, selectedDorm]); // คำนวณใหม่เมื่อ selectedYear หรือ selectedDorm เปลี่ยน

  const { stats, monthlyRevenue, dorms } = dashboardData;

  return (
    <div className="bg-gray-50 min-h-screen font-sans transition-all duration-300">
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        
        {/* --- Header & Controls --- */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">ภาพรวมธุรกิจ</h1>
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedYear === currentYear ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              ข้อมูลประจำปี: {selectedYear + 543}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto">
            
            {/* --- 1. Dorm Selector (New) --- */}
            <div className="relative group w-full sm:w-auto z-10">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-hover:text-blue-600 transition-colors">
                <FaFilter />
              </div>
              <select 
                value={selectedDorm}
                onChange={(e) => setSelectedDorm(e.target.value)}
                className="w-full sm:w-60 pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg shadow-sm 
                           text-gray-700 bg-white font-medium appearance-none cursor-pointer 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           hover:border-blue-400 transition-all"
              >
                <option value="all">ดูหอพักทั้งหมด ({dormsConfig.length})</option>
                {dormsConfig.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {/* --- Year Selector --- */}
            <div className="relative group w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-hover:text-yellow-600 transition-colors">
                <FaCalendarAlt />
              </div>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full sm:w-40 pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg shadow-sm 
                           text-gray-700 bg-white font-medium appearance-none cursor-pointer 
                           focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent
                           hover:border-yellow-400 transition-all"
              >
                {yearsList.map((year) => (
                  <option key={year} value={year}>ปี {year + 543}</option>
                ))}
              </select>
            </div>

            {/* --- Export Button --- */}
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg shadow-sm 
                               hover:bg-red-700 hover:shadow-md active:transform active:scale-95 transition-all w-full sm:w-auto font-medium">
              <FaFilePdf className="text-lg" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* --- KPI Cards --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard title={`รายได้รวม (${selectedYear})`} value={`฿${stats.totalRevenue.toLocaleString()}`} icon={<FaMoneyBillWave />} color="green" />
          <KpiCard title="ผู้เช่าปัจจุบัน" value={`${stats.totalTenants} คน`} icon={<FaUserFriends />} color="blue" />
          <KpiCard title="ห้องว่าง" value={`${stats.vacantRooms} ห้อง`} icon={<MdMeetingRoom />} color="yellow" highlight />
          <KpiCard title="จำนวนหอพักที่แสดง" value={`${stats.totalDorms} แห่ง`} icon={<FaBuilding />} color="purple" />
        </div>

        {/* --- Charts --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <div className="p-1.5 bg-yellow-100 rounded-md text-yellow-600"><FaChartLine /></div>
                รายได้รายเดือน ({selectedDorm === 'all' ? 'รวมทุกหอ' : 'เฉพาะหอที่เลือก'})
              </h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val)=> `${val/1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#FEF3C7', opacity: 0.4}}
                    formatter={(value) => [`฿${value.toLocaleString()}`, 'รายได้']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="total" fill="#FFC107" radius={[6, 6, 0, 0]} barSize={30} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h3 className="font-bold text-gray-800 text-lg mb-4 w-full text-left">สัดส่วนห้องพัก ({selectedDorm === 'all' ? 'รวม' : 'เฉพาะหอ'})</h3>
            <div className="h-64 w-full relative flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart key={selectedDorm + selectedYear}> 
                  <Pie
                    data={[
                      { name: 'ว่าง', value: stats.vacantRooms },
                      { name: 'มีคนอยู่', value: stats.occupiedRooms },
                    ]}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#E5E7EB" />
                    <Cell fill="#FFC107" />
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-[-15px]">
                <span className="text-4xl font-bold text-gray-800 block transition-all">
                  {stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}%
                </span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Occupancy</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Table --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">รายละเอียดหอพัก</h3>
            {/* แสดงปุ่ม Reset เมื่อมีการเลือกหอเฉพาะ */}
            {selectedDorm !== 'all' && (
              <button 
                onClick={() => setSelectedDorm('all')}
                className="text-sm text-blue-600 font-medium hover:text-blue-800 hover:underline"
              >
                ดูทั้งหมด &rarr;
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 text-xs uppercase tracking-wider bg-gray-50/50">
                  <th className="py-4 px-6 font-medium">ชื่อหอพัก</th>
                  <th className="py-4 px-6 font-medium">ที่ตั้ง</th>
                  <th className="py-4 px-6 font-medium text-center">ห้องทั้งหมด</th>
                  <th className="py-4 px-6 font-medium text-center">สถานะ</th>
                  <th className="py-4 px-6 font-medium text-right">รายได้ (บาท)</th>
                  <th className="py-4 px-6 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {dorms.map((dorm, index) => (
                  <tr key={index} className="border-b border-gray-50 hover:bg-yellow-50/20 transition duration-150">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                          <FaBuilding />
                        </div>
                        <span className="font-semibold text-gray-800">{dorm.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">{dorm.province}</td>
                    <td className="py-4 px-6 text-center">{dorm.total}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold 
                        ${dorm.vacant > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        ว่าง {dorm.vacant}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-gray-800">
                      {dorm.revenue.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button className="text-gray-400 hover:text-yellow-600 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

// Component ย่อยสำหรับการ์ด KPI
const KpiCard = ({ title, value, icon, color, highlight }) => {
  const colorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-200">
      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${highlight ? 'text-green-600' : 'text-gray-800'}`}>{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
    </div>
  );
};

export default Dashboard;