const prisma = require('../config/prisma');

// Get monthly income for current year
exports.getMonthlyIncome = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Get payments data
    const paymentsData = await prisma.payments.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        payment_date: {
          gte: new Date(targetYear, 0, 1),
          lte: new Date(targetYear, 11, 31)
        },
        payment_amount: {
          gt: 0
        }
      },
      include: {
        invoice_receipts: {
          include: {
            rooms: true
          }
        }
      }
    });

    // Get move-in receipts data
    const moveInData = await prisma.move_in_receipts.findMany({
      where: {
        contracts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        receipt_date: {
          gte: new Date(targetYear, 0, 1),
          lte: new Date(targetYear, 11, 31)
        },
        total_amount: {
          gt: 0
        }
      },
      include: {
        contracts: {
          include: {
            rooms: true
          }
        }
      }
    });

    // Get move-out receipts data
    const moveOutData = await prisma.move_out_receipts.findMany({
      where: {
        contracts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        receipt_date: {
          gte: new Date(targetYear, 0, 1),
          lte: new Date(targetYear, 11, 31)
        }
      },
      include: {
        contracts: {
          include: {
            rooms: true
          }
        }
      }
    });

    // Process data by month
    const monthlyResults = {};
    
    // Process payments data
    paymentsData.forEach(payment => {
      const month = payment.payment_date.getMonth() + 1;
      if (!monthlyResults[month]) {
        monthlyResults[month] = { month, monthly_income: 0, monthly_payment_income: 0, move_in_income: 0, move_out_income: 0, transaction_count: 0 };
      }
      monthlyResults[month].monthly_income += parseFloat(payment.payment_amount);
      monthlyResults[month].monthly_payment_income += parseFloat(payment.payment_amount);
      monthlyResults[month].transaction_count += 1;
    });

    // Process move-in data
    moveInData.forEach(moveIn => {
      const month = moveIn.receipt_date.getMonth() + 1;
      if (!monthlyResults[month]) {
        monthlyResults[month] = { month, monthly_income: 0, monthly_payment_income: 0, move_in_income: 0, move_out_income: 0, transaction_count: 0 };
      }
      monthlyResults[month].monthly_income += parseFloat(moveIn.total_amount);
      monthlyResults[month].move_in_income += parseFloat(moveIn.total_amount);
      monthlyResults[month].transaction_count += 1;
    });

    // Process move-out data
    moveOutData.forEach(moveOut => {
      const month = moveOut.receipt_date.getMonth() + 1;
      if (!monthlyResults[month]) {
        monthlyResults[month] = { month, monthly_income: 0, monthly_payment_income: 0, move_in_income: 0, move_out_income: 0, transaction_count: 0 };
      }
      const netAmount = parseFloat(moveOut.net_amount) || 0;
      monthlyResults[month].monthly_income += netAmount;
      monthlyResults[month].move_out_income += netAmount;
      monthlyResults[month].transaction_count += 1;
    });
    
    // Thai month names
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    // Create data for all 12 months
    const monthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyResults[i];
      monthlyData.push({
        month: thaiMonths[i - 1],
        monthNum: i,
        income: monthData ? monthData.monthly_income : 0
      });
    }
    
    res.json({
      success: true,
      data: monthlyData
    });
    
  } catch (error) {
    console.error('Error fetching monthly income:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายได้รายเดือน',
      error: error.message
    });
  }
};

// Get yearly income
exports.getYearlyIncome = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    // Get payments data
    const paymentsData = await prisma.payments.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        payment_amount: {
          gt: 0
        }
      },
      include: {
        invoice_receipts: {
          include: {
            rooms: true
          }
        }
      }
    });

    // Get move-in receipts data
    const moveInData = await prisma.move_in_receipts.findMany({
      where: {
        contracts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        total_amount: {
          gt: 0
        }
      },
      include: {
        contracts: {
          include: {
            rooms: true
          }
        }
      }
    });

    // Process data by year
    const yearlyResults = {};
    
    // Process payments data
    paymentsData.forEach(payment => {
      const year = payment.payment_date.getFullYear();
      if (!yearlyResults[year]) {
        yearlyResults[year] = { year, yearly_income: 0 };
      }
      yearlyResults[year].yearly_income += parseFloat(payment.payment_amount);
    });

    // Process move-in data
    moveInData.forEach(moveIn => {
      const year = moveIn.receipt_date.getFullYear();
      if (!yearlyResults[year]) {
        yearlyResults[year] = { year, yearly_income: 0 };
      }
      yearlyResults[year].yearly_income += parseFloat(moveIn.total_amount);
    });

    // Convert to array and sort by year descending
    const yearlyData = Object.values(yearlyResults)
      .sort((a, b) => b.year - a.year)
      .slice(0, 5)
      .map(row => ({
        year: row.year.toString(),
        income: row.yearly_income
      }));
    
    res.json({
      success: true,
      data: yearlyData
    });
    
  } catch (error) {
    console.error('Error fetching yearly income:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายได้รายปี',
      error: error.message
    });
  }
};

// Get dashboard summary statistics
exports.getIncomeSummary = async (req, res) => {
  try {
    const { dormId } = req.params;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Get current month income from payments
    const paymentsData = await prisma.payments.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        payment_date: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        },
        payment_amount: {
          gt: 0
        }
      }
    });

    // Get current month income from move-in receipts
    const moveInData = await prisma.move_in_receipts.findMany({
      where: {
        contracts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        receipt_date: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        },
        total_amount: {
          gt: 0
        }
      }
    });

    // Get current month income from move-out receipts
    const moveOutData = await prisma.move_out_receipts.findMany({
      where: {
        contracts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        receipt_date: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      }
    });

    // Calculate total income
    const paymentsTotal = paymentsData.reduce((sum, payment) => sum + parseFloat(payment.payment_amount), 0);
    const moveInTotal = moveInData.reduce((sum, moveIn) => sum + parseFloat(moveIn.total_amount), 0);
    const moveOutTotal = moveOutData.reduce((sum, moveOut) => sum + parseFloat(moveOut.net_amount || 0), 0);
    const totalIncome = paymentsTotal + moveInTotal + moveOutTotal;

    // Get late fees from invoice receipt items
    const lateFees = await prisma.invoice_receipt_items.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          },
          payments: {
            some: {
              payment_date: {
                gte: new Date(currentYear, currentMonth - 1, 1),
                lt: new Date(currentYear, currentMonth, 1)
              },
              payment_amount: {
                gt: 0
              }
            }
          }
        },
        item_type: 'late_fee',
        amount: {
          gt: 0
        }
      }
    });

    // Get penalty fees from move-out receipt items
    const penaltyFees = await prisma.move_out_receipt_items.findMany({
      where: {
        move_out_receipts: {
          contracts: {
            rooms: {
              dorm_id: parseInt(dormId)
            }
          },
          move_out_date: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1)
          }
        },
        item_type: 'penalty',
        total_price: {
          gt: 0
        }
      }
    });

    const totalLateFees = lateFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
    const totalPenaltyFees = penaltyFees.reduce((sum, fee) => sum + parseFloat(fee.total_price), 0);
    const totalFines = totalLateFees + totalPenaltyFees;

    // Get room statistics
    const totalRoomsData = await prisma.rooms.count({
      where: {
        dorm_id: parseInt(dormId)
      }
    });

    const occupiedRoomsData = await prisma.rooms.count({
      where: {
        dorm_id: parseInt(dormId),
        contracts: {
          some: {
            status: 'active'
          }
        }
      }
    });
    
    const summary = {
      totalIncome: totalIncome,
      totalFines: totalFines,
      currentTenants: occupiedRoomsData,
      totalRooms: totalRoomsData,
      vacantRooms: totalRoomsData - occupiedRoomsData
    };
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Error fetching income summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปรายได้',
      error: error.message
    });
  }
};

// Get income breakdown by type
exports.getIncomeBreakdown = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get rent income from invoice receipt items
    const rentItems = await prisma.invoice_receipt_items.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          },
          payments: {
            some: {
              payment_date: {
                gte: new Date(targetYear, targetMonth - 1, 1),
                lt: new Date(targetYear, targetMonth, 1)
              },
              payment_amount: {
                gt: 0
              }
            }
          }
        },
        item_type: 'rent'
      }
    });

    // Get electricity income from invoice receipt items
    const electricItems = await prisma.invoice_receipt_items.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          },
          payments: {
            some: {
              payment_date: {
                gte: new Date(targetYear, targetMonth - 1, 1),
                lt: new Date(targetYear, targetMonth, 1)
              },
              payment_amount: {
                gt: 0
              }
            }
          }
        },
        item_type: 'electric'
      }
    });

    // Get electricity from move-out receipts
    const electricMoveOutItems = await prisma.move_out_receipt_items.findMany({
      where: {
        move_out_receipts: {
          contracts: {
            rooms: {
              dorm_id: parseInt(dormId)
            }
          },
          move_out_date: {
            gte: new Date(targetYear, targetMonth - 1, 1),
            lt: new Date(targetYear, targetMonth, 1)
          }
        },
        item_type: 'meter',
        description: {
          contains: 'ค่าไฟ'
        },
        total_price: {
          gt: 0
        }
      }
    });

    // Get water income from invoice receipt items
    const waterItems = await prisma.invoice_receipt_items.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          },
          payments: {
            some: {
              payment_date: {
                gte: new Date(targetYear, targetMonth - 1, 1),
                lt: new Date(targetYear, targetMonth, 1)
              },
              payment_amount: {
                gt: 0
              }
            }
          }
        },
        item_type: 'water'
      }
    });

    // Get water from move-out receipts
    const waterMoveOutItems = await prisma.move_out_receipt_items.findMany({
      where: {
        move_out_receipts: {
          contracts: {
            rooms: {
              dorm_id: parseInt(dormId)
            }
          },
          move_out_date: {
            gte: new Date(targetYear, targetMonth - 1, 1),
            lt: new Date(targetYear, targetMonth, 1)
          }
        },
        item_type: 'meter',
        description: {
          contains: 'ค่าน้ำ'
        },
        total_price: {
          gt: 0
        }
      }
    });

    // Get late fees from invoice receipt items
    const lateFeeItems = await prisma.invoice_receipt_items.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          },
          payments: {
            some: {
              payment_date: {
                gte: new Date(targetYear, targetMonth - 1, 1),
                lt: new Date(targetYear, targetMonth, 1)
              },
              payment_amount: {
                gt: 0
              }
            }
          }
        },
        item_type: 'late_fee',
        amount: {
          gt: 0
        }
      }
    });

    // Get penalty fees from move-out receipt items
    const penaltyItems = await prisma.move_out_receipt_items.findMany({
      where: {
        move_out_receipts: {
          contracts: {
            rooms: {
              dorm_id: parseInt(dormId)
            }
          },
          move_out_date: {
            gte: new Date(targetYear, targetMonth - 1, 1),
            lt: new Date(targetYear, targetMonth, 1)
          }
        },
        item_type: 'penalty',
        total_price: {
          gt: 0
        }
      }
    });

    // Calculate totals
    const rentAmount = rentItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.unit_count)), 0);
    const electricAmount = electricItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.unit_count)), 0) +
                           electricMoveOutItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const waterAmount = waterItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.unit_count)), 0) +
                        waterMoveOutItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const fineAmount = lateFeeItems.reduce((sum, item) => sum + parseFloat(item.amount), 0) +
                       penaltyItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    
    const breakdown = [
      {
        type: 'rent',
        name: 'ค่าเช่า',
        amount: rentAmount
      },
      {
        type: 'electricity',
        name: 'ค่าไฟ',
        amount: electricAmount
      },
      {
        type: 'water',
        name: 'ค่าน้ำ',
        amount: waterAmount
      },
      {
        type: 'fines',
        name: 'ค่าปรับ',
        amount: fineAmount
      }
    ];
    
    res.json({
      success: true,
      data: breakdown
    });
    
  } catch (error) {
    console.error('Error fetching income breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแยกประเภทรายได้',
      error: error.message
    });
  }
};

// Get service fees from various sources
exports.getServiceFees = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get monthly service fees from invoice receipt items
    const monthlyServiceItems = await prisma.invoice_receipt_items.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          },
          payments: {
            some: {
              payment_date: {
                gte: new Date(targetYear, targetMonth - 1, 1),
                lt: new Date(targetYear, targetMonth, 1)
              },
              payment_amount: {
                gt: 0
              }
            }
          }
        },
        item_type: 'service'
      }
    });

    // Get contract service fees from move-in receipt items
    const contractServiceItems = await prisma.move_in_receipt_items.findMany({
      where: {
        move_in_receipts: {
          contracts: {
            rooms: {
              dorm_id: parseInt(dormId)
            }
          },
          receipt_date: {
            gte: new Date(targetYear, targetMonth - 1, 1),
            lt: new Date(targetYear, targetMonth, 1)
          }
        },
        item_type: 'service',
        total_price: {
          gt: 0
        }
      }
    });

    // Get move-out service fees from move-out receipt items
    const moveoutServiceItems = await prisma.move_out_receipt_items.findMany({
      where: {
        move_out_receipts: {
          contracts: {
            rooms: {
              dorm_id: parseInt(dormId)
            }
          },
          receipt_date: {
            gte: new Date(targetYear, targetMonth - 1, 1),
            lt: new Date(targetYear, targetMonth, 1)
          }
        },
        item_type: 'service',
        total_price: {
          gt: 0
        }
      }
    });
    
    const monthlyService = monthlyServiceItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.unit_count)), 0);
    const contractService = contractServiceItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const moveoutService = moveoutServiceItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const totalService = monthlyService + contractService + moveoutService;

    res.json({
      success: true,
      data: {
        monthly_service: monthlyService,
        contract_service: contractService,
        moveout_service: moveoutService,
        total: totalService
      }
    });
    
  } catch (error) {
    console.error('Error fetching service fees:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลค่าบริการ',
      error: error.message
    });
  }
};

// Get monthly occupancy data for income dashboard
exports.getMonthlyOccupancy = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get total rooms for this dormitory
    const totalRooms = await prisma.rooms.count({
      where: {
        dorm_id: parseInt(dormId)
      }
    });
    
    // Get contracts that were active during the specified month
    const firstDayOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const lastDayOfMonth = new Date(targetYear, targetMonth, 0);
    
    const activeContracts = await prisma.contracts.findMany({
      where: {
        rooms: {
          dorm_id: parseInt(dormId)
        },
        OR: [
          // Contract started in the selected month
          {
            contract_start_date: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth
            }
          },
          // Contract started before the selected month and was still active during it
          {
            AND: [
              {
                contract_start_date: {
                  lt: firstDayOfMonth
                }
              },
              {
                OR: [
                  { contract_end_date: null },
                  {
                    contract_end_date: {
                      gte: firstDayOfMonth
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      include: {
        rooms: true
      }
    });

    // Count unique rooms that were occupied
    const occupiedRooms = new Set(activeContracts.map(contract => contract.room_id)).size;
    const vacantRooms = totalRooms - occupiedRooms;

    const data = {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      month: targetMonth,
      year: targetYear
    };
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error fetching monthly occupancy:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเข้าพักรายเดือน',
      error: error.message
    });
  }
};
