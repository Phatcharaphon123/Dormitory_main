import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { 
  IoWater, 
  IoFlash, 
  IoCash, 
  IoStatsChart,
  IoRefresh,
  IoTrendingUp,
  IoPieChart,
  IoWarning
} from 'react-icons/io5'

function Utilities({ building }) {
  const { dormId } = useParams()
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  
  // Data states
  const [summary, setSummary] = useState({
    currentWaterCost: 0,
    currentElectricityCost: 0,
    currentTotalCost: 0,
    avgPerRoom: 0,
    totalWaterUnits: 0,
    totalElectricityUnits: 0
  })
  const [monthlyUtilitiesData, setMonthlyUtilitiesData] = useState([])
  const [monthlyIncomeData, setMonthlyIncomeData] = useState([])
  const [yearlyComparisonData, setYearlyComparisonData] = useState([])
  const [dailyConsumptionData, setDailyConsumptionData] = useState([])

  useEffect(() => {
    if (dormId) {
      fetchUtilityData()
    }
  }, [dormId, selectedYear, selectedMonth, refreshKey])

  // Auto refresh data every 30 seconds to show updated status
  useEffect(() => {
    if (dormId) {
      const interval = setInterval(() => {
        fetchUtilityData()
      }, 50000) // Refresh every 50 seconds

      return () => clearInterval(interval)
    }
  }, [dormId])

  const fetchUtilityData = async () => {
    setLoading(true)
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const token = localStorage.getItem('token')
      
      // Fetch data in parallel
      const [summaryRes, monthlyRes, yearlyRes, dailyRes] = await Promise.all([
        axios.get(`${baseUrl}/api/utilities/dormitories/${dormId}/analytics/summary?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/utilities/dormitories/${dormId}/analytics/monthly?year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/utilities/dormitories/${dormId}/analytics/yearly`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/api/utilities/dormitories/${dormId}/analytics/daily?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (summaryRes.status === 200) {
        const summaryData = summaryRes.data
        setSummary(summaryData.data)
      }

      if (monthlyRes.status === 200) {
        const monthlyData = monthlyRes.data
        // Add total calculation to monthly data
        const dataWithTotal = monthlyData.data.map(item => ({
          ...item,
          total: (item.water || 0) + (item.electricity || 0)
        }))
        setMonthlyUtilitiesData(dataWithTotal)
      }

      if (yearlyRes.status === 200) {
        const yearlyData = yearlyRes.data
        setYearlyComparisonData(yearlyData.data)
      }

      if (dailyRes.status === 200) {
        const dailyData = dailyRes.data
        setDailyConsumptionData(dailyData.data)
      }

    } catch (error) {
      console.error('Error fetching utility data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Calculate utility distribution from monthly data for selected month
  const utilityDistribution = useMemo(() => {
    // Find data for the selected month
    const selectedMonthData = monthlyUtilitiesData.find(
      item => item.monthNumber === selectedMonth
    );
    
    // Check if we have actual data (not just zeros)
    const hasActualData = selectedMonthData && 
                          selectedMonthData.total > 0 && 
                          (selectedMonthData.water > 0 || selectedMonthData.electricity > 0);
    
    if (hasActualData) {
      const waterPercent = (selectedMonthData.water / selectedMonthData.total) * 100;
      const electricityPercent = (selectedMonthData.electricity / selectedMonthData.total) * 100;
      
      // Round to ensure total is 100%
      const roundedWaterPercent = Math.round(waterPercent);
      let roundedElectricityPercent = Math.round(electricityPercent);
      
      // Adjust if rounding causes total != 100%
      const total = roundedWaterPercent + roundedElectricityPercent;
      if (total !== 100 && total > 0) {
        // Adjust the larger percentage to make total = 100%
        if (roundedWaterPercent > roundedElectricityPercent) {
          roundedElectricityPercent = 100 - roundedWaterPercent;
        } else {
          roundedElectricityPercent = 100 - roundedWaterPercent;
        }
      }
      
      return {
        hasData: true,
        data: [
          { 
            name: 'ค่าไฟ', 
            value: roundedElectricityPercent, 
            color: '#f59e0b',
            amount: selectedMonthData.electricity
          },
          { 
            name: 'ค่าน้ำ', 
            value: roundedWaterPercent, 
            color: '#06b6d4',
            amount: selectedMonthData.water
          }
        ]
      };
    } else {
      // No data available for selected month
      return {
        hasData: false,
        data: []
      };
    }
  }, [monthlyUtilitiesData, selectedMonth]);

  // Calculate current month summary from monthly data
  const currentMonthSummary = useMemo(() => {
    const selectedMonthData = monthlyUtilitiesData.find(
      item => item.monthNumber === selectedMonth
    );
    
    if (selectedMonthData) {
      return {
        currentWaterCost: selectedMonthData.water || 0,
        currentElectricityCost: selectedMonthData.electricity || 0,
        currentTotalCost: selectedMonthData.total || 0,
        totalWaterUnits: selectedMonthData.waterUnits || 0,
        totalElectricityUnits: selectedMonthData.electricityUnits || 0
      };
    }
    
    return {
      currentWaterCost: 0,
      currentElectricityCost: 0,
      currentTotalCost: 0,
      totalWaterUnits: 0,
      totalElectricityUnits: 0
    };
  }, [monthlyUtilitiesData, selectedMonth]);

  // Generate monthly income data based on utility data
  useEffect(() => {
    if (monthlyUtilitiesData.length > 0) {
      const incomeData = monthlyUtilitiesData.map(month => ({
        month: month.month,
        monthNumber: month.monthNumber,
        income: month.total || 0
      }))
      setMonthlyIncomeData(incomeData)
    }
  }, [monthlyUtilitiesData])

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 rounded-md shadow-sm">
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
            <h1 className="text-2xl font-bold text-blue-900 mb-2">วิเคราะห์การใช้ค่าสาธารณูปโภค</h1>
            <p className="text-blue-600">รายงานการใช้ค่าน้ำ ค่าไฟ และการเปรียบเทียบประจำเดือน</p>
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
                  const currentYear = new Date().getFullYear();
                  const year = currentYear - i;  // Current year first, then previous years
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
            <div className="p-3 bg-cyan-100 rounded-lg">
              <IoWater className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-cyan-600">ค่าน้ำ {new Date(2024, selectedMonth - 1).toLocaleDateString('th-TH', { month: 'long' })}</p>
              <p className="text-xl font-bold text-cyan-900">{currentMonthSummary.currentWaterCost.toLocaleString()}</p>
              <p className="text-xs text-cyan-500 mt-1">บาท ({currentMonthSummary.totalWaterUnits} หน่วย)</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-orange-100 rounded-lg">
              <IoFlash className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-orange-600">ค่าไฟ {new Date(2024, selectedMonth - 1).toLocaleDateString('th-TH', { month: 'long' })}</p>
              <p className="text-xl font-bold text-orange-900">{currentMonthSummary.currentElectricityCost.toLocaleString()}</p>
              <p className="text-xs text-orange-500 mt-1">บาท ({currentMonthSummary.totalElectricityUnits} หน่วย)</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-green-100 rounded-lg">
              <IoCash className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-green-600">รวม {new Date(2024, selectedMonth - 1).toLocaleDateString('th-TH', { month: 'long' })}</p>
              <p className="text-xl font-bold text-green-900">{currentMonthSummary.currentTotalCost.toLocaleString()}</p>
              <p className="text-xs text-green-500 mt-1">บาท ({(currentMonthSummary.totalWaterUnits + currentMonthSummary.totalElectricityUnits).toLocaleString()} หน่วย)</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center h-full">
            <div className="p-3 bg-purple-100 rounded-lg">
              <IoStatsChart className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4 flex-1 min-h-[60px] flex flex-col justify-center">
              <p className="text-sm text-purple-600">เฉลี่ยต่อห้อง</p>
              <p className="text-xl font-bold text-purple-900">{currentMonthSummary.currentTotalCost > 0 ? Math.round(currentMonthSummary.currentTotalCost / 10).toLocaleString() : 0}</p>
              <p className="text-xs text-purple-500 mt-1">บาท</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Utilities Overview Chart */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-blue-900">ภาพรวมค่าสาธารณูปโภครายเดือน</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-600 px-2">ปี {selectedYear + 543}</span>
              <IoCash className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-600">บาท</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={monthlyIncomeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="utilityGradient" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white", 
                  borderRadius: "8px", 
                  border: "1px solid #3b82f6",
                  boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.1)"
                }}
                formatter={(value) => [`${value.toLocaleString()} บาท`, 'ค่าใช้จ่าย']}
                labelFormatter={(label) => `เดือน${label}`}
              />
              <Area 
                type="monotone"
                dataKey="income" 
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#utilityGradient)" 
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
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* First Row - Monthly Comparison and Usage Units */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Monthly Utilities Comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">เปรียบเทียบค่าสาธารณูปโภครายเดือน</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-600">ปี {selectedYear + 543}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#06b6d4' }}></div>
                  <span className="text-xs text-blue-600">ค่าน้ำ</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="text-xs text-blue-600">ค่าไฟ</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyUtilitiesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#f8fafc", 
                    borderRadius: "8px", 
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
                  }}
                  formatter={(value, name) => [
                    `${value?.toLocaleString() || 0} บาท`, 
                    name === 'water' ? 'ค่าน้ำ' : 'ค่าไฟ'
                  ]}
                  labelFormatter={(label) => `เดือน${label}`}
                />
                <Bar dataKey="water" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="electricity" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Usage Units */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">หน่วยการใช้งานรายเดือน</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-600">ปี {selectedYear + 543}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#06b6d4' }}></div>
                  <span className="text-xs text-blue-600">น้ำ (หน่วย)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="text-xs text-blue-600">ไฟ (หน่วย)</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyUtilitiesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#f8fafc", 
                    borderRadius: "8px", 
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
                  }}
                  formatter={(value, name) => [
                    `${value?.toLocaleString() || 0} หน่วย`, 
                    name === 'waterUnits' ? 'น้ำ' : 'ไฟ'
                  ]}
                  labelFormatter={(label) => `เดือน${label}`}
                />
                <Bar dataKey="waterUnits" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="electricityUnits" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Second Row - Trend and Distribution */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Monthly Trend Line Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">แนวโน้มค่าสาธารณูปโภครายเดือน</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-600">ปี {selectedYear + 543}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#06b6d4' }}></div>
                  <span className="text-xs text-blue-600">ค่าน้ำ</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="text-xs text-blue-600">ค่าไฟ</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-xs text-blue-600">รวม</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyUtilitiesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "white", 
                    borderRadius: "8px", 
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
                  }}
                  formatter={(value, name) => [
                    `${value?.toLocaleString() || 0} บาท`, 
                    name === 'water' ? 'ค่าน้ำ' : name === 'electricity' ? 'ค่าไฟ' : 'รวม'
                  ]}
                  labelFormatter={(label) => `เดือน${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="water" 
                  stroke="#06b6d4" 
                  strokeWidth={3}
                  dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#06b6d4' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="electricity" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#f59e0b' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Utility Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">สัดส่วนการใช้สาธารณูปโภค</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-600">{new Date(2024, selectedMonth - 1).toLocaleDateString('th-TH', { month: 'long' })} {selectedYear + 543}</span>
                <IoPieChart className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            {utilityDistribution.hasData ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={utilityDistribution.data}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={5}
                    label={({ name, value }) => `${name} ${value}%`}
                    labelLine={false}
                    isAnimationActive={true}
                  >
                    {utilityDistribution.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#f8fafc", 
                      borderRadius: "8px", 
                      border: "1px solid #e2e8f0"
                    }}
                    formatter={(value, name, props) => [
                      `${value}% (${props.payload.amount?.toLocaleString() || 0} บาท)`,
                      name
                    ]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <IoWarning className="w-8 h-8 mb-2 text-blue-500" />
                <p className="text-sm text-blue-500 text-center">
                  ไม่มีข้อมูลรายได้ในเดือนที่เลือก
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Utilities
