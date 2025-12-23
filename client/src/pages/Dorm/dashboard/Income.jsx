import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from 'recharts'
import { 
  IoCash, 
  IoHome, 
  IoWarning, 
  IoPeople,
  IoCalendar,
  IoRefresh,
  IoTrendingUp,
  IoPieChart,
  IoBarChart
} from 'react-icons/io5'

const COLORS = ['#dbeafe', '#3b82f6', '#1e40af', '#60a5fa']

function Income({ building }) {
  const { dormId } = useParams()
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedPieMonth, setSelectedPieMonth] = useState(new Date().getMonth() + 1)
  const [selectedHalfYear, setSelectedHalfYear] = useState(() => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    return currentMonth <= 6 ? 'first' : 'second'; // มี.ค.-มิ.ย. = ครึ่งปีแรก, ก.ค.-ธ.ค. = ครึ่งปีหลัง
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [incomeBreakdown, setIncomeBreakdown] = useState([])
  const [previousMonthComparison, setPreviousMonthComparison] = useState(null)
  const [collectionRate, setCollectionRate] = useState(0)
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalFines: 0,
    currentTenants: 0,
    totalRooms: 0,
    vacantRooms: 0,
    avgIncomePerRoom: 0,
    growthRate: 0
  })
  const [monthlyIncomeData, setMonthlyIncomeData] = useState([])
  const [yearlyIncomeData, setYearlyIncomeData] = useState([])
  const [monthlyOccupancyData, setMonthlyOccupancyData] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
    occupancyRate: 0
  })

  useEffect(() => {
    if (dormId) {
      fetchIncomeData()
    }
  }, [dormId, selectedMonth, selectedYear, selectedPieMonth, refreshKey])

  // Auto refresh data every 30 seconds to show updated status
  useEffect(() => {
    if (dormId) {
      const interval = setInterval(() => {
        fetchIncomeData()
      }, 50000) // Refresh every 50 seconds

      return () => clearInterval(interval)
    }
  }, [dormId, selectedMonth, selectedYear, selectedPieMonth])

  const fetchIncomeData = async () => {
    setLoading(true)
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const token = localStorage.getItem('token')
      
      // Fetch data in parallel including service fees
      const [summaryRes, monthlyRes, yearlyRes, breakdownRes, serviceFeesRes, occupancyRes] = await Promise.all([
        axios.get(`${baseUrl}/api/income/dormitories/${dormId}/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/income/dormitories/${dormId}/monthly?year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/income/dormitories/${dormId}/yearly`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/income/dormitories/${dormId}/breakdown?month=${selectedPieMonth}&year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // ดึงข้อมูลค่าบริการรวม
        axios.get(`${baseUrl}/api/income/dormitories/${dormId}/service-fees?month=${selectedPieMonth}&year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, data: { total: 0 } } })),
        // ดึงข้อมูลการเข้าพักตามเดือนที่เลือก
        axios.get(`${baseUrl}/api/income/dormitories/${dormId}/occupancy?month=${selectedPieMonth}&year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (summaryRes.status === 200) {
        const summaryData = summaryRes.data
        const data = summaryData.data
        
        // คำนวณค่าเพิ่มเติม
        const avgIncomePerRoom = data.totalRooms > 0 ? data.totalIncome / data.totalRooms : 0
        
        setSummary({
          ...data,
          avgIncomePerRoom
        })
      }

      if (monthlyRes.status === 200) {
        const monthlyData = monthlyRes.data
        setMonthlyIncomeData(monthlyData.data)
        
        // คำนวณการเปรียบเทียบกับเดือนก่อน
        const currentMonth = new Date().getMonth()
        const currentData = monthlyData.data[currentMonth]
        const previousData = monthlyData.data[currentMonth - 1]
        
        if (currentData && previousData) {
          const growthRate = ((currentData.income - previousData.income) / previousData.income) * 100
          setPreviousMonthComparison({
            current: currentData.income,
            previous: previousData.income,
            growthRate: isFinite(growthRate) ? growthRate : 0
          })
        }
      }

      if (yearlyRes.status === 200) {
        const yearlyData = yearlyRes.data
        setYearlyIncomeData(yearlyData.data)
      }

      if (breakdownRes.status === 200) {
        const breakdownData = breakdownRes.data
        let breakdown = breakdownData.data || []
      
        
        // เพิ่มค่าบริการรวมจากแหล่งต่างๆ
        if (serviceFeesRes.data && serviceFeesRes.data.success) {
          const serviceFees = serviceFeesRes.data.data
          const totalServiceFees = serviceFees.total || 0
          
          if (totalServiceFees > 0) {
            breakdown = [...breakdown, {
              type: 'service',
              name: 'ค่าบริการ',
              amount: totalServiceFees
            }]
          }
        }
        
        setIncomeBreakdown(breakdown)
      }

      // Process monthly occupancy data
      if (occupancyRes.status === 200) {
        const occupancyData = occupancyRes.data
        
        const processedData = occupancyData.data || {
          totalRooms: 0,
          occupiedRooms: 0,
          vacantRooms: 0,
          occupancyRate: 0
        }
        setMonthlyOccupancyData(processedData)
      }

    } catch (error) {
      console.error('Error fetching income data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH').format(amount)
  }

  // Format number function - show full numbers without 'k' abbreviation
  const formatNumber = (value) => {
    return new Intl.NumberFormat('th-TH').format(value)
  }

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  // ฟังก์ชันสำหรับกรองข้อมูลตามครึ่งปี
  const getHalfYearData = (data, halfYear) => {
    if (!data || data.length === 0) return []
    
    if (halfYear === 'first') {
      // ครึ่งปีแรก: มกราคม-มิถุนายน (ดัชนี 0-5)
      return data.slice(0, 6)
    } else {
      // ครึ่งปีหลัง: กรกฎาคม-ธันวาคม (ดัชนี 6-11)
      return data.slice(6, 12)
    }
  }

  // Create dynamic pie chart data based on selected month
  const pieData = [
    { name: 'ห้องมีผู้เช่า', value: monthlyOccupancyData.occupiedRooms },
    { name: 'ห้องว่าง', value: monthlyOccupancyData.vacantRooms }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-blue-600">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6 rounded-md shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">ภาพรวมรายได้</h1>
            <p className="text-blue-600">รายงานสถิติและการเงินของหอพัก</p>
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
                value={selectedPieMonth}
                onChange={(e) => setSelectedPieMonth(parseInt(e.target.value))}
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

      {/* การ์ดสรุป */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* รายได้เดือนนี้ */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-blue-100 rounded-lg">
              <IoCash className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-blue-600">รายได้เดือนนี้</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(summary.totalIncome)}</p>
              {previousMonthComparison && (
                <p className={`text-xs mt-1 ${previousMonthComparison.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(previousMonthComparison.growthRate)} จากเดือนที่แล้ว
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* รายได้เฉลี่ยต่อห้อง */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-green-100 rounded-lg">
              <IoHome className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-green-600">รายได้เฉลี่ย/ห้อง</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(summary.avgIncomePerRoom)}</p>
            </div>
          </div>
        </div>
        
        {/* ค่าปรับ */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-orange-100 rounded-lg">
              <IoWarning className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-orange-600">ค่าปรับ</p>
              <p className="text-xl font-bold text-orange-900">{formatCurrency(summary.totalFines)}</p>
            </div>
          </div>
        </div>
        
        {/* ผู้เช่าปัจจุบัน */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-purple-100 rounded-lg">
              <IoPeople className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-purple-600">ผู้เช่าปัจจุบัน</p>
              <p className="text-xl font-bold text-purple-900">{summary.currentTenants}</p>
              <p className="text-xs text-purple-500 mt-1">
                ว่าง {summary.vacantRooms} ห้อง
              </p>
            </div>
          </div>
        </div>
        
        {/* อัตราการเข้าพัก */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <IoCalendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-indigo-600">อัตราการเข้าพัก</p>
              <p className="text-xl font-bold text-indigo-900">
                {summary.totalRooms > 0 ? ((summary.currentTenants / summary.totalRooms) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-indigo-500 mt-1">
                {summary.currentTenants}/{summary.totalRooms} ห้อง
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* กราฟ */}
      <div className="space-y-6">
        {/* รายได้รายเดือน */}
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-blue-900">รายได้รายเดือน</h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-600">ปี {selectedYear + 543}</span>
              <div className="flex items-center space-x-2">
                <IoCash className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-600">บาท</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={monthlyIncomeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#3b82f6' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#3b82f6' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white", 
                  borderRadius: "8px", 
                  border: "1px solid #3b82f6",
                  boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.1)"
                }}
                formatter={(value) => [`${formatNumber(value)} บาท`, 'รายได้']}
              />
              <Area 
                type="monotone"
                dataKey="income" 
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#incomeGradient)" 
                dot={{ 
                  fill: '#ffffff', 
                  stroke: '#3b82f6', 
                  strokeWidth: 3, 
                  r: 6 
                }}
                activeDot={{ 
                  r: 8, 
                  fill: '#3b82f6',
                  stroke: '#ffffff', 
                  strokeWidth: 3 
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* เทรนด์รายได้ (กราฟเส้น) */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-blue-900">เทรนด์รายได้ {selectedHalfYear === 'first' ? 'ครึ่งปีแรก' : 'ครึ่งปีหลัง'}</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedHalfYear}
                  onChange={(e) => setSelectedHalfYear(e.target.value)}
                  className="border border-blue-300 rounded-lg px-3 py-2 text-sm text-blue-700 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                >
                  <option value="first">ครึ่งปีแรก</option>
                  <option value="second">ครึ่งปีหลัง</option>
                </select>
                <IoTrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-600">แนวโน้ม</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getHalfYearData(monthlyIncomeData, selectedHalfYear)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10, fill: '#3b82f6' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#3b82f6' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatNumber}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "white", 
                    borderColor: "#3b82f6",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.1)"
                  }}
                  formatter={(value) => [`${formatNumber(value)} บาท`, 'รายได้']}
                />
                <Line 
                  type="monotone"
                  dataKey="income" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ 
                    fill: '#ffffff', 
                    stroke: '#3b82f6', 
                    strokeWidth: 3, 
                    r: 6 
                  }}
                  activeDot={{ 
                    r: 8, 
                    fill: '#3b82f6',
                    stroke: '#ffffff', 
                    strokeWidth: 3 
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* สัดส่วนรายได้ตามประเภท */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-blue-900">สัดส่วนรายได้ตามประเภท</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-600">{new Date(2024, selectedPieMonth - 1).toLocaleDateString('th-TH', { month: 'long' })} {selectedYear + 543}</span>
                <IoPieChart className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              {incomeBreakdown.filter(item => 
                ['rent', 'electricity', 'water', 'fines', 'service'].includes(item.type) && 
                item.amount > 0
              ).length > 0 ? (
                <PieChart>
                  <Pie
                    data={incomeBreakdown
                      .filter(item => 
                        ['rent', 'electricity', 'water', 'fines', 'service'].includes(item.type) && 
                        item.amount > 0
                      )
                      .map(item => ({
                        name: item.name,
                        value: item.amount,
                        type: item.type
                      }))
                    }
                    dataKey="value"
                    nameKey="name"
                    outerRadius={70}
                    innerRadius={40}
                    paddingAngle={2}
                    label={({ name, percent, value }) => 
                      value > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                    isAnimationActive={true}
                  >
                    {incomeBreakdown
                      .filter(item => 
                        ['rent', 'electricity', 'water', 'fines', 'service'].includes(item.type) && 
                        item.amount > 0
                      )
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.type === 'rent' ? '#3b82f6' : 
                          entry.type === 'electricity' ? '#f59e0b' : 
                          entry.type === 'water' ? '#10b981' : 
                          entry.type === 'fines' ? '#ef4444' : 
                          entry.type === 'service' ? '#8b5cf6' : '#6b7280'
                        } />
                      ))
                    }
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      borderRadius: "8px", 
                      border: "1px solid #3b82f6"
                    }}
                    formatter={(value) => [`${formatNumber(value)} บาท`, 'จำนวน']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                  />
                </PieChart>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-blue-500">
                  <IoWarning className="w-8 h-8 mb-2 text-blue-500" />
                  <p className="text-sm">ไม่มีข้อมูลรายได้ในเดือนที่เลือก</p>
                </div>
              )}
            </ResponsiveContainer>
          </div>

          {/* สัดส่วนการเข้าพัก */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-blue-900">สัดส่วนการเข้าพัก</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-600">{new Date(2024, selectedPieMonth - 1).toLocaleDateString('th-TH', { month: 'long' })} {selectedYear + 543}</span>
                <IoHome className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600">{monthlyOccupancyData.totalRooms} ห้อง</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({ name, percent, value }) => 
                    value > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                  isAnimationActive={true}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#93c5fd'][index]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "white", 
                    borderRadius: "8px", 
                    border: "1px solid #3b82f6"
                  }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ตารางสรุปรายได้รายเดือน - แบบกะทัดรัด */}
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">สรุปรายได้รายเดือน</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-600">ปี {selectedYear + 543}</span>
              <IoBarChart className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-600">หน่วย: บาท</span>
              <span className="text-xs text-gray-500">• เฉลี่ย/วัน คำนวณจากจำนวนวันในเดือน</span>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-blue-200">
              <thead className="bg-blue-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">เดือน</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-blue-900 uppercase tracking-wider">รายได้รวม</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-blue-900 uppercase tracking-wider">เฉลี่ย/วัน</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-blue-900 uppercase tracking-wider">อัตราเติบโต</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-blue-900 uppercase tracking-wider">สถานะ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-100">
                {monthlyIncomeData.map((month, index) => {
                  const prevMonth = monthlyIncomeData[index - 1]
                  const growth = prevMonth && prevMonth.income > 0 
                    ? ((month.income - prevMonth.income) / prevMonth.income) * 100 
                    : 0
                  const daysInMonth = new Date(selectedYear, month.monthNum, 0).getDate()
                  const dailyAvg = month.income / daysInMonth
                  const currentMonth = new Date().getMonth() + 1
                  const currentYear = new Date().getFullYear()
                  const isCurrentMonth = month.monthNum === currentMonth && selectedYear === currentYear
                  const isFutureMonth = selectedYear === currentYear && month.monthNum > currentMonth
                  const hasValidGrowth = prevMonth && prevMonth.income > 0 && !isNaN(growth) && isFinite(growth)
                  
                  return (
                    <tr key={month.monthNum} className={`hover:bg-blue-50 ${isCurrentMonth ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-blue-900">
                        <div className="flex items-center">
                          {month.month}
                          {isCurrentMonth && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                              ปัจจุบัน
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-900 text-right font-medium">
                        {formatCurrency(month.income)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 text-right">
                        {isFutureMonth ? '-' : formatCurrency(dailyAvg)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          hasValidGrowth && growth > 5 
                            ? 'bg-green-100 text-green-800' 
                            : hasValidGrowth && growth > 0
                            ? 'bg-green-50 text-green-700'
                            : hasValidGrowth && growth < -5 
                            ? 'bg-red-100 text-red-800' 
                            : hasValidGrowth && growth < 0
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {hasValidGrowth && !isFutureMonth ? (
                            <>
                              {growth > 0 ? '↗' : growth < 0 ? '↘' : '→'} {formatPercentage(growth)}
                            </>
                          ) : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          isFutureMonth
                            ? 'bg-gray-100 text-gray-500'
                            : month.income > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isFutureMonth ? 'รอข้อมูล' : month.income > 0 ? 'มีรายได้' : 'ไม่มีรายได้'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Income
