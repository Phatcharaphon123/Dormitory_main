import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import { 
  IoPeople, 
  IoHome, 
  IoPersonAdd, 
  IoPersonRemove,
  IoCalendar,
  IoRefresh,
  IoStatsChart,
  IoCash,
  IoWarning
} from 'react-icons/io5'
import API_URL from '../../../config/api'

function Tenants({ building }) {
  const { dormId } = useParams()
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  
  // Data states
  const [summary, setSummary] = useState({
    totalTenants: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
    occupancyRate: 0,
    newTenantsThisMonth: 0,
    tenantsLeftThisMonth: 0,
    avgStayDuration: 0,
    overduePayments: 0
  })
  const [monthlyOccupancyData, setMonthlyOccupancyData] = useState([])
  const [roomTypeData, setRoomTypeData] = useState([])
  const [tenantStatusData, setTenantStatusData] = useState([])

  useEffect(() => {
    if (dormId) {
      fetchTenantData()
    }
  }, [dormId, selectedYear, selectedMonth, refreshKey])

  // Auto refresh data every 30 seconds to show updated status
  useEffect(() => {
    if (dormId) {
      const interval = setInterval(() => {
        fetchTenantData()
      }, 50000) // Refresh every 50 seconds

      return () => clearInterval(interval)
    }
  }, [dormId, selectedYear, selectedMonth])

  // Function to convert English month to Thai abbreviation
  const getThaiMonthAbbr = (englishMonth) => {
    const monthMap = {
      'Jan': 'ม.ค.',
      'Feb': 'ก.พ.',
      'Mar': 'มี.ค.',
      'Apr': 'เม.ย.',
      'May': 'พ.ค.',
      'Jun': 'มิ.ย.',
      'Jul': 'ก.ค.',
      'Aug': 'ส.ค.',
      'Sep': 'ก.ย.',
      'Oct': 'ต.ค.',
      'Nov': 'พ.ย.',
      'Dec': 'ธ.ค.',
      'January': 'ม.ค.',
      'February': 'ก.พ.',
      'March': 'มี.ค.',
      'April': 'เม.ย.',
      'June': 'มิ.ย.',
      'July': 'ก.ค.',
      'August': 'ส.ค.',
      'September': 'ก.ย.',
      'October': 'ต.ค.',
      'November': 'พ.ย.',
      'December': 'ธ.ค.'
    }
    return monthMap[englishMonth] || englishMonth
  }

  const fetchTenantData = async () => {
    setLoading(true)
    try {
      const baseUrl = API_URL
      const token = localStorage.getItem('token')
      
      // Fetch data in parallel
      const [summaryRes, occupancyRes, roomTypesRes, contractsRes] = await Promise.all([
        axios.get(`${baseUrl}/api/tenants/dormitories/${dormId}/summary?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/tenants/dormitories/${dormId}/occupancy?year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/tenants/dormitories/${dormId}/room-types?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/tenants/dormitories/${dormId}/contracts/status?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      // Process summary data
      if (summaryRes.status === 200) {
        const summaryData = summaryRes.data
        setSummary(summaryData.data || {
          totalTenants: 0,
          totalRooms: 0,
          occupiedRooms: 0,
          vacantRooms: 0,
          occupancyRate: 0,
          newTenantsThisMonth: 0,
          tenantsLeftThisMonth: 0,
          avgStayDuration: 0,
          overduePayments: 0
        })
      }

      // Process monthly occupancy data
      if (occupancyRes.status === 200) {
        const occupancyData = occupancyRes.data
        const formattedOccupancyData = occupancyData.data?.map(item => ({
          month: getThaiMonthAbbr(item.month),
          month_num: item.month_num,
          occupied: parseInt(item.occupied) || 0,
          vacant: parseInt(item.vacant) || 0,
          total: parseInt(item.total) || 0
        })) || []
        setMonthlyOccupancyData(formattedOccupancyData)
      }

      // Process room types data
      if (roomTypesRes.status === 200) {
        const roomTypesData = roomTypesRes.data
        const formattedRoomTypes = roomTypesData.data?.map((roomType, index) => ({
          name: roomType.name || `ประเภท ${index + 1}`,
          value: parseInt(roomType.count) || 0,
          color: index === 0 ? '#3b82f6' : index === 1 ? '#10b981' : '#f59e0b'
        })) || []
        setRoomTypeData(formattedRoomTypes)
      }

      // Process contracts/tenant status data
      if (contractsRes.status === 200) {
        const contractsData = contractsRes.data
        const statusData = contractsData.data || {}
        const formattedTenantStatus = [
          { name: 'ผู้เช่าปกติ', value: statusData.active || 0, color: '#10b981' },
          { name: 'ยังไม่ได้จ่าย', value: statusData.overdue || 0, color: '#ef4444' },
          { name: 'แจ้งย้ายออก', value: statusData.moving_out || 0, color: '#f59e0b' }
        ]
        setTenantStatusData(formattedTenantStatus)
      }

    } catch (error) {
      console.error('Error fetching tenant data:', error)
      // Set default empty data on error
      setSummary({
        totalTenants: 0,
        totalRooms: 0,
        occupiedRooms: 0,
        vacantRooms: 0,
        occupancyRate: 0,
        newTenantsThisMonth: 0,
        tenantsLeftThisMonth: 0,
        avgStayDuration: 0,
        overduePayments: 0
      })
      setMonthlyOccupancyData([])
      setRoomTypeData([])
      setTenantStatusData([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Format number function
  const formatNumber = (value) => {
    if (value >= 10000) {
      return `${(value / 1000).toFixed(0)}k`
    }
    return value.toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 rounded shadow-sm">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-blue-600">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6 rounded shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">วิเคราะห์ข้อมูลผู้เช่า</h1>
            <p className="text-blue-600">รายงานสถิติการเข้าพัก การย้ายเข้า-ย้ายออก และการชำระเงิน</p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Year Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-blue-600">ปี:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-blue-300 rounded-lg px-3 py-2 text-sm text-blue-700 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              >
                {Array.from({ length: 6 }, (_, i) => {
                  const year = 2025 - i;  // 2025, 2026, 2027, 2028, 2029, 2030
                  return (
                    <option key={year} value={year}>{year + 543}</option>
                  );
                })}
              </select>
            </div>

            {/* Month Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-blue-600">เดือน:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border border-blue-300 rounded-lg px-3 py-2 text-sm text-blue-700 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              >
                {Array.from({ length: 12 }, (_, i) => ({
                  value: i + 1,
                  label: new Date(2024, i).toLocaleDateString('th-TH', { month: 'long' })
                })).map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              disabled={loading}
            >
              <IoRefresh className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-blue-100 rounded-lg">
              <IoPeople className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-blue-600">ผู้เช่าทั้งหมด</p>
              <p className="text-xl font-bold text-blue-900">{summary.totalTenants}</p>
              <p className="text-xs text-blue-500 mt-1">คน</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-green-100 rounded-lg">
              <IoHome className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-green-600">อัตราการเข้าพัก</p>
              <p className="text-xl font-bold text-green-900">{summary.occupancyRate}%</p>
              <p className="text-xs text-green-500 mt-1">{summary.occupiedRooms}/{summary.totalRooms} ห้อง</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-purple-100 rounded-lg">
              <IoPersonAdd className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-purple-600">เข้าใหม่เดือนนี้</p>
              <p className="text-xl font-bold text-purple-900">{summary.newTenantsThisMonth}</p>
              <p className="text-xs text-purple-500 mt-1">คน</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-red-100 rounded-lg">
              <IoWarning className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-red-600">ยังไม่ได้จ่าย</p>
              <p className="text-xl font-bold text-red-900">{summary.overduePayments}</p>
              <p className="text-xs text-red-500 mt-1">คน</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart - Monthly Occupancy Overview */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-blue-900">ภาพรวมการเข้าพักรายเดือน</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-600 px-2">ปี {selectedYear + 543}</span>
              <IoPeople className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-600">ห้อง</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyOccupancyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 20]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white", 
                  borderRadius: "8px", 
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                }}
                formatter={(value, name, props) => [
                  `${value} ห้อง`, 
                  name
                ]}
                labelFormatter={(label) => `เดือน ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="rect"
                wrapperStyle={{ fontSize: '14px' }}
              />
              <Bar 
                dataKey="occupied" 
                name="ห้องที่มีผู้เช่า"
                fill="#10b981"
                radius={[0, 0, 4, 4]}
                stackId="rooms"
              />
              <Bar 
                dataKey="vacant" 
                name="ห้องว่าง"
                fill="#e5e7eb"
                radius={[4, 4, 0, 0]}
                stackId="rooms"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* First Row - Occupancy Comparison and Movement */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Monthly Occupancy Comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">เปรียบเทียบการเข้าพักรายเดือน</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-600">ปี {selectedYear + 543}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-xs text-blue-600">ห้องที่มีผู้เช่า</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                  <span className="text-xs text-blue-600">ห้องว่าง</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyOccupancyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="occupiedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="vacantGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 20]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff", 
                    borderRadius: "12px", 
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)"
                  }}
                  formatter={(value, name) => [
                    `${value} ห้อง`, 
                    name === 'occupied' ? 'ห้องที่มีผู้เช่า' : 'ห้องว่าง'
                  ]}
                  labelFormatter={(label) => `เดือน ${label}`}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="rect"
                  wrapperStyle={{ fontSize: '14px', paddingBottom: '15px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="occupied" 
                  name="ห้องที่มีผู้เช่า"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="url(#occupiedGradient)"
                />
                <Area 
                  type="monotone" 
                  dataKey="vacant" 
                  name="ห้องว่าง"
                  stroke="#ef4444" 
                  strokeWidth={3}
                  strokeDasharray="5 3"
                  fill="url(#vacantGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Room Type Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">สัดส่วนประเภทห้อง</h3>
              <div className="flex items-center space-x-1">
                <IoHome className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600">ตามประเภท</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roomTypeData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={5}
                  label={({ name, percent }) => `${name} ${(percent).toFixed(1)}%`}
                  labelLine={false}
                  isAnimationActive={true}
                >
                  {roomTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#f8fafc", 
                    borderRadius: "8px", 
                    border: "1px solid #e2e8f0"
                  }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "20px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Second Row - Tenant Status */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Tenant Status Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">สถานะผู้เช่า</h3>
              <div className="flex items-center space-x-1">
                <IoPeople className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600">ปัจจุบัน</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tenantStatusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  innerRadius={40}
                  paddingAngle={5}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                  isAnimationActive={true}
                >
                  {tenantStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#f8fafc", 
                    borderRadius: "8px", 
                    border: "1px solid #e2e8f0"
                  }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "20px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Additional Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-6">สถิติเพิ่มเติม</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <IoPersonAdd className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-900">ผู้เช่าเข้าใหม่เดือนนี้</span>
                </div>
                <span className="text-xl font-bold text-blue-900">{summary.newTenantsThisMonth} คน</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <IoPersonRemove className="w-5 h-5 text-orange-600 mr-3" />
                  <span className="text-orange-900">ผู้เช่าย้ายออกเดือนนี้</span>
                </div>
                <span className="text-xl font-bold text-orange-900">{summary.tenantsLeftThisMonth} คน</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <IoCalendar className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-green-900">ระยะเวลาเช่าเฉลี่ย</span>
                </div>
                <span className="text-xl font-bold text-green-900">{summary.avgStayDuration} เดือน</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <IoWarning className="w-5 h-5 text-red-600 mr-3" />
                  <span className="text-red-900">ผู้เช่าที่ยังไม่ได้จ่าย</span>
                </div>
                <span className="text-xl font-bold text-red-900">{summary.overduePayments} คน</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tenants
