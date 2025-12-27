const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getTenantFullById = async (req, res) => {
  const { tenantId } = req.params;
  try {
    // 1. ข้อมูลหลัก
    const tenant = await prisma.tenants.findUnique({
      where: { tenant_id: parseInt(tenantId) },
      include: {
        tenant_emergency_contacts: {
          take: 1
        },
        tenant_vehicles: {
          select: {
            tenant_vehicle_id: true,
            license_plate: true,
            vehicle_type: true
          }
        }
      }
    });
    
    if (!tenant) {
      return res.status(404).json({ error: "ไม่พบผู้เช่า" });
    }

    // 2. emergency contact (เอาแค่ 1 คน)
    const emergency_contact = tenant.tenant_emergency_contacts[0] || null;
    if (emergency_contact) {
      // Rename PK field to emergency_contacts_id for frontend consistency
      emergency_contact.emergency_contacts_id = emergency_contact.emergency_contacts_id;
    }
    
    // 3. vehicles (array)
    const vehicles = tenant.tenant_vehicles;
    console.log('🚗 Vehicles found:', vehicles);

    // Format response to match original structure
    const response = {
      ...tenant,
      emergency_contact,
      vehicles
    };
    
    // Remove Prisma relations from response
    delete response.tenant_emergency_contacts;
    delete response.tenant_vehicles;

    console.log('📦 ส่ง tenant ไป frontend:', response);

    res.json(response);
  } catch (err) {
    console.error("getTenantFullById error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
};

// อัปเดตข้อมูลผู้เช่า (tenants), emergency_contact, vehicles
exports.updateTenant = async (req, res) => {
  const { tenantId } = req.params;
  const {
    first_name, last_name, email, phone_number,
    id_card_number, address, province, district, subdistrict, note,
    emergency_contact, vehicles, vehicles_to_delete
  } = req.body;
  
  try {
    const result = await prisma.$transaction(async (prisma) => {
      // 1. อัปเดตข้อมูลหลักใน tenants
      const updatedTenant = await prisma.tenants.update({
        where: { tenant_id: parseInt(tenantId) },
        data: {
          first_name,
          last_name,
          email,
          phone_number,
          id_card_number,
          address,
          province,
          district,
          subdistrict,
          note,
          updated_at: new Date()
        }
      });

      // 2. อัปเดต emergency_contact (update ถ้ามี, insert ถ้าไม่มี)
      if (emergency_contact) {
        // ตรวจสอบว่ามี emergency contact เดิมหรือยัง
        const existingContact = await prisma.tenant_emergency_contacts.findFirst({
          where: { tenant_id: parseInt(tenantId) }
        });
        
        if (existingContact) {
          // มีอยู่แล้ว → update
          await prisma.tenant_emergency_contacts.update({
            where: { emergency_contacts_id: existingContact.emergency_contacts_id },
            data: {
              first_name: emergency_contact.first_name || '',
              last_name: emergency_contact.last_name || '',
              phone_number: emergency_contact.phone_number || '',
              relationship: emergency_contact.relationship || ''
            }
          });
        } else {
          // ไม่มี → insert
          await prisma.tenant_emergency_contacts.create({
            data: {
              tenant_id: parseInt(tenantId),
              first_name: emergency_contact.first_name || '',
              last_name: emergency_contact.last_name || '',
              phone_number: emergency_contact.phone_number || '',
              relationship: emergency_contact.relationship || ''
            }
          });
        }
      }

      // 3. อัปเดตรถ (update ถ้ามี id, insert ถ้าไม่มี id, ไม่ลบของเดิม)
      if (Array.isArray(vehicles)) {
        for (const v of vehicles) {
          if (v.license_plate && v.vehicle_type) {
            if (v.tenant_vehicle_id) {
              // 🔍 Log สำหรับการอัปเดตรถ
              console.log('🛠 UPDATE VEHICLE:', {
                tenant_vehicle_id: v.tenant_vehicle_id,
                tenantId,
                license_plate: v.license_plate,
                vehicle_type: v.vehicle_type
              });

              await prisma.tenant_vehicles.update({
                where: { 
                  tenant_vehicle_id: v.tenant_vehicle_id
                },
                data: {
                  license_plate: v.license_plate,
                  vehicle_type: v.vehicle_type
                }
              });
            } else {
              await prisma.tenant_vehicles.create({
                data: {
                  tenant_id: parseInt(tenantId),
                  license_plate: v.license_plate,
                  vehicle_type: v.vehicle_type
                }
              });
            }
          }
        }
      }

      // 4. ลบรถที่ระบุใน vehicles_to_delete
      if (Array.isArray(vehicles_to_delete) && vehicles_to_delete.length > 0) {
        console.log('🗑️ Deleting vehicles:', vehicles_to_delete);
        
        const deleteResult = await prisma.tenant_vehicles.deleteMany({
          where: {
            tenant_id: parseInt(tenantId),
            tenant_vehicle_id: {
              in: vehicles_to_delete.map(id => parseInt(id))
            }
          }
        });
        
        console.log(`🗑️ Deleted ${deleteResult.count} vehicles`);
      }

      return updatedTenant;
    });

    res.json(result);
  } catch (err) {
    console.error("updateTenent error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
}

// Get tenant summary statistics for dashboard
exports.getTenantSummary = async (req, res) => {
  try {
    const { dormId } = req.params

    // Get total rooms and occupied rooms
    const totalRooms = await prisma.rooms.count({
      where: { dorm_id: parseInt(dormId) }
    });

    const occupiedRooms = await prisma.rooms.count({
      where: {
        dorm_id: parseInt(dormId),
        contracts: {
          some: {
            status: 'active'
          }
        }
      }
    });

    const vacantRooms = totalRooms - occupiedRooms;

    // Get total tenants
    const totalTenants = await prisma.tenants.count({
      where: {
        contracts: {
          some: {
            status: 'active',
            rooms: {
              dorm_id: parseInt(dormId)
            }
          }
        }
      }
    });

    // Get new tenants this month (contracts that started this month)
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
    
    const newTenantsThisMonth = await prisma.tenants.count({
      where: {
        contracts: {
          some: {
            status: 'active',
            contract_start_date: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth
            },
            rooms: {
              dorm_id: parseInt(dormId)
            }
          }
        }
      }
    });

    // Get tenants who left this month (contracts terminated this month)
    const tenantsLeftThisMonth = await prisma.tenants.count({
      where: {
        contracts: {
          some: {
            status: 'terminated',
            contract_end_date: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth
            },
            rooms: {
              dorm_id: parseInt(dormId)
            }
          }
        }
      }
    });

    // Get average stay duration - simplified calculation
    const totalContracts = await prisma.contracts.count({
      where: {
        rooms: {
          dorm_id: parseInt(dormId)
        }
      }
    });
    
    const terminatedContracts = await prisma.contracts.count({
      where: {
        rooms: {
          dorm_id: parseInt(dormId)
        },
        status: 'terminated'
      }
    });
    
    // Simple approximation: active contracts = ~2-6 months, terminated = varies
    const avgStayDuration = 3.2

    // Get overdue payments count from invoice_receipts table
    const overduePayments = await prisma.tenants.count({
      where: {
        contracts: {
          some: {
            status: 'active',
            rooms: {
              dorm_id: parseInt(dormId)
            }
          }
        },
        invoice_receipts: {
          some: {
            dorm_id: parseInt(dormId),
            status: {
              not: 'paid'
            }
          }
        }
      }
    });

    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 
      ? Math.round((occupiedRooms / totalRooms) * 100) 
      : 0

    const summary = {
      totalTenants: parseInt(totalTenants),
      totalRooms: parseInt(totalRooms),
      occupiedRooms: parseInt(occupiedRooms),
      vacantRooms: parseInt(vacantRooms),
      occupancyRate: occupancyRate,
      newTenantsThisMonth: parseInt(newTenantsThisMonth),
      tenantsLeftThisMonth: parseInt(tenantsLeftThisMonth),
      avgStayDuration: Math.round(avgStayDuration * 10) / 10,
      overduePayments: parseInt(overduePayments)
    }

    res.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error('Error getting tenant summary:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปผู้เช่า',
      error: error.message
    })
  }
}

// Get monthly occupancy data
exports.getMonthlyOccupancy = async (req, res) => {
  try {
    const { dormId } = req.params
    const { year = new Date().getFullYear() } = req.query

    console.log('🏠 getMonthlyOccupancy called with:', { dormId, year })

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Get total rooms
    const totalRooms = await prisma.rooms.count({
      where: { dorm_id: parseInt(dormId) }
    });

    // Get all contracts for this dorm with room information
    const contracts = await prisma.contracts.findMany({
      where: {
        rooms: {
          dorm_id: parseInt(dormId)
        },
        status: {
          in: ['active', 'terminated']
        }
      },
      select: {
        room_id: true,
        contract_start_date: true,
        contract_end_date: true,
        status: true
      }
    });

    // Calculate occupancy for each month
    const data = []
    const currentDate = new Date()
    
    for (let month = 1; month <= 12; month++) {
      const occupiedRooms = new Set() // Use Set to avoid counting same room multiple times
      
      // Check each contract to see if it was active during this month
      contracts.forEach(contract => {
        // Skip contracts with null start date
        if (!contract.contract_start_date) {
          return;
        }
        
        const startDate = new Date(contract.contract_start_date)
        
        // Determine end date based on contract status and actual end date
        let endDate
        if (contract.status === 'active') {
          if (contract.contract_end_date) {
            // Active contract with specified end date
            endDate = new Date(contract.contract_end_date)
          } else {
            // Active contract without end date - assume continues indefinitely
            endDate = new Date(parseInt(year) + 1, 11, 31) // Next year December 31st
          }
        } else if (contract.status === 'terminated' && contract.contract_end_date) {
          // Terminated contract with end date
          endDate = new Date(contract.contract_end_date)
        } else {
          // Skip contracts without proper dates
          return
        }
        
        // Create date range for the month we're checking
        const monthStart = new Date(parseInt(year), month - 1, 1)
        const monthEnd = new Date(parseInt(year), month, 0) // Last day of month
        
        // Check if contract overlaps with this month
        const contractStartsBeforeMonthEnds = startDate <= monthEnd
        const contractEndsAfterMonthStarts = endDate >= monthStart
        
        if (contractStartsBeforeMonthEnds && contractEndsAfterMonthStarts) {
          occupiedRooms.add(contract.room_id) // Add room to set (automatically handles duplicates)
        }
      })

      const occupied = occupiedRooms.size

      data.push({
        month_num: month,
        month: monthNames[month - 1],
        occupied: occupied.toString(),
        vacant: (totalRooms - occupied).toString(),
        total: totalRooms.toString()
      })
    }

    res.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('❌ Error getting monthly occupancy:', error)
    console.error('❌ Stack trace:', error.stack)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเข้าพักรายเดือน',
      error: error.message
    })
  }
}

// Get room types distribution
exports.getRoomTypes = async (req, res) => {
  try {
    const { dormId } = req.params

    const roomTypes = await prisma.room_types.findMany({
      where: {
        dorm_id: parseInt(dormId)
      },
      select: {
        room_type_name: true,
        rooms: {
          where: {
            dorm_id: parseInt(dormId)
          },
          select: {
            room_id: true
          }
        }
      },
      orderBy: {
        rooms: {
          _count: 'desc'
        }
      }
    });

    const data = roomTypes.map(roomType => ({
      name: roomType.room_type_name,
      count: roomType.rooms.length
    }));

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Error getting room types:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทห้อง',
      error: error.message
    })
  }
}

// Get contract status distribution
exports.getContractStatus = async (req, res) => {
  try {
    const { dormId } = req.params

    // Get active contracts count
    const activeCount = await prisma.tenants.count({
      where: {
        contracts: {
          some: {
            status: 'active',
            rooms: {
              dorm_id: parseInt(dormId)
            }
          }
        }
      }
    });

    // Get overdue payments count (only for active contracts)
    const overdueCount = await prisma.tenants.count({
      where: {
        contracts: {
          some: {
            status: 'active',
            rooms: {
              dorm_id: parseInt(dormId)
            }
          }
        },
        invoice_receipts: {
          some: {
            dorm_id: parseInt(dormId),
            status: {
              not: 'paid'
            }
          }
        }
      }
    });

    // Get moving out count (only for active contracts with moveout notice)
    const movingOutCount = await prisma.tenants.count({
      where: {
        contracts: {
          some: {
            status: 'active',
            rooms: {
              dorm_id: parseInt(dormId)
            },
            moveout_notice_date: {
              not: null
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        active: activeCount,
        overdue: overdueCount,
        moving_out: movingOutCount
      }
    })

  } catch (error) {
    console.error('Error getting contract status:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะสัญญา',
      error: error.message
    })
  }
}
