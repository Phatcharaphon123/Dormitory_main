const  prisma  = require('../config/prisma');

//  สร้างสัญญาใหม่พร้อมข้อมูลผู้เช่า
exports.createContract = async (req, res) => {
  try {
    const { dormId, roomNumber } = req.params;
    const {
      // ข้อมูลผู้เช่า
      first_name, last_name, phone_number, email, id_card_number, address, province, district, subdistrict,
      // ข้อมูลติดต่อฉุกเฉิน
      emergency_contact,
      // ข้อมูลยานพาหนะ
      vehicles,
      // ข้อมูลสัญญา
      contract_start_date, contract_end_date, deposit_monthly, advance_amount, monthly_rent,
      water_meter_start, electric_meter_start, moveout_notice_date,
      // บริการเพิ่มเติม
      services,
      // หมายเหตุ
      note,
      // ชื่อประเภทห้อง
      room_type_name
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {

      // 1. ดึงข้อมูลห้องพักพร้อมประเภทห้อง
      const room = await tx.rooms.findFirst({
        where: {
          room_number: roomNumber,
          dorm_id: parseInt(dormId)
        },
        include: {
          room_types: {
            select: {
              room_type_name: true
            }
          }
        }
      });

      if (!room) {
        throw new Error('ไม่พบห้องที่ระบุ');
      }

      const roomId = room.room_id;
      const roomTypeId = room.room_type_id;

      // ดึงชื่อประเภทห้องจากฐานข้อมูลหากไม่ได้ส่งมาจาก frontend
      let finalRoomTypeName = room_type_name || room.room_types?.room_type_name || null;

      // 2. สร้างข้อมูลผู้เช่า
      const tenant = await tx.tenants.create({
        data: {
          room_id: roomId,
          first_name,
          last_name,
          phone_number,
          email,
          id_card_number,
          address,
          province: province || null,
          district: district || null,
          subdistrict: subdistrict || null,
          note
        }
      });

      const tenantId = tenant.tenant_id;

      // 3. เพิ่กผู้ติดต่อฉุกเฉิน
      if (emergency_contact) {
        await tx.tenant_emergency_contacts.create({
          data: {
            tenant_id: tenantId,
            first_name: emergency_contact.first_name,
            last_name: emergency_contact.last_name,
            phone_number: emergency_contact.phone_number,
            relationship: emergency_contact.relationship
          }
        });
      }

      // 4. เพิ่กยานพาหนะ (ถ้ามี)
      if (vehicles && vehicles.length > 0) {
        const vehicleData = vehicles.map(vehicle => ({
          tenant_id: tenantId,
          vehicle_type: vehicle.vehicle_type,
          license_plate: vehicle.license_plate
        }));

        await tx.tenant_vehicles.createMany({
          data: vehicleData
        });
      }

      // 5. สร้างสัญญา
      console.log('📝 กำลังสร้างสัญญาด้วยข้อมูล:', {
        tenantId, roomId, roomTypeId, 
        contract_start_date, contract_end_date, 
        deposit_monthly, advance_amount, monthly_rent,
        water_meter_start, electric_meter_start, 
        moveout_notice_date, finalRoomTypeName
      });
      
      const contract = await tx.contracts.create({
        data: {
          tenant_id: tenantId,
          room_id: roomId,
          room_type_id: roomTypeId,
          contract_start_date: new Date(contract_start_date),
          contract_end_date: contract_end_date ? new Date(contract_end_date) : null,
          deposit_monthly: deposit_monthly || 0,
          advance_amount: advance_amount || 0,
          monthly_rent: monthly_rent || 0,
          water_meter_start: water_meter_start || 0,
          electric_meter_start: electric_meter_start || 0,
          status: 'active',
          moveout_notice_date: moveout_notice_date ? new Date(moveout_notice_date) : null,
          room_type_name: finalRoomTypeName
        }
      });

      const contractId = contract.contract_id;

      // 6. ข้ามการเพิ่มรายการค่าใช้จ่ายใน contracts_services (ใช้ move_in_receipt_items แทน)
      // move_in_receipt_items จะถูกสร้างโดย API แยกต่างหาก

      // 7. อัปเดตสถานะห้อง
      await tx.rooms.update({
        where: { room_id: roomId },
        data: {
          available: false,
          status_id: 2
        }
      });

      return {
        contract_id: contractId,
        tenant_id: tenantId
      };
    });

    res.status(201).json({
      message: 'สร้างสัญญาสำเร็จ',
      contract_id: result.contract_id,
      tenant_id: result.tenant_id
    });

  } catch (err) {
    console.error('Error creating contract:', err);
    res.status(500).json({ error: 'Failed to create contract: ' + err.message });
  }
};

//  ดึงสัญญาทั้งหมดของหอพัก
exports.getContractsByDorm = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const contracts = await prisma.contracts.findMany({
      where: {
        rooms: {
          dorm_id: parseInt(dormId)
        }
      },
      include: {
        tenants: {
          select: {
            first_name: true,
            last_name: true,
            phone_number: true,
            email: true
          }
        },
        rooms: {
          select: {
            room_number: true,
            floor_number: true
          }
        },
        room_types: {
          select: {
            room_type_name: true,
            monthly_rent: true
          }
        },
        monthly_service: {
          where: {
            is_active: true
          },
          select: {
            monthly_service_id: true,
            service_name: true,
            service_price: true,
            quantity: true,
            is_active: true
          }
        }
      },
      orderBy: {
        rooms: {
          room_number: 'asc'
        }
      }
    });

    // จัดรูปแบบข้อมูลให้ตรงกับ format เดิม
    const formattedContracts = contracts.map(contract => ({
      ...contract,
      first_name: contract.tenants.first_name,
      last_name: contract.tenants.last_name,
      phone_number: contract.tenants.phone_number,
      email: contract.tenants.email,
      room_number: contract.rooms.room_number,
      floor_number: contract.rooms.floor_number,
      room_type_name: contract.room_type_name || contract.room_types?.room_type_name,
      monthly_rent: contract.room_types?.monthly_rent,
      services: contract.monthly_service.map(service => ({
        service_id: service.monthly_service_id,
        name: service.service_name,
        price: service.service_price,
        quantity: service.quantity,
        is_active: service.is_active
      }))
    }));

    res.json(formattedContracts);
  } catch (err) {
    console.error('Error fetching contracts:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

//  ดึงรายละเอียดสัญญาเฉพาะ
exports.getContractDetail = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const contract = await prisma.contracts.findFirst({
      where: {
        contract_id: parseInt(contractId)
      },
      include: {
        tenants: {
          select: {
            first_name: true,
            last_name: true,
            phone_number: true,
            email: true,
            id_card_number: true,
            address: true,
            province: true,
            district: true,
            subdistrict: true,
            note: true
          }
        },
        rooms: {
          select: {
            room_number: true,
            floor_number: true,
            dorm_id: true,
            dormitories: {
              select: {
                name: true
              }
            }
          }
        },
        room_types: {
          select: {
            room_type_name: true,
            monthly_rent: true
          }
        }
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'ไม่พบสัญญาที่ระบุ' });
    }

    // ดึงข้อมูล emergency contact
    const emergencyContacts = await prisma.tenant_emergency_contacts.findMany({
      where: {
        tenant_id: contract.tenant_id
      },
      take: 1
    });

    // ดึงข้อมูล vehicles
    const vehicles = await prisma.tenant_vehicles.findMany({
      where: {
        tenant_id: contract.tenant_id
      }
    });

    // จัดรูปแบบข้อมูลให้ตรงกับ format เดิม
    const contractData = {
      ...contract,
      first_name: contract.tenants.first_name,
      last_name: contract.tenants.last_name,
      phone_number: contract.tenants.phone_number,
      email: contract.tenants.email,
      id_card_number: contract.tenants.id_card_number,
      address: contract.tenants.address,
      province: contract.tenants.province,
      district: contract.tenants.district,
      subdistrict: contract.tenants.subdistrict,
      note: contract.tenants.note,
      room_number: contract.rooms.room_number,
      floor_number: contract.rooms.floor_number,
      dorm_id: contract.rooms.dorm_id,
      room_type_name: contract.room_type_name || contract.room_types?.room_type_name,
      monthly_rent: contract.room_types?.monthly_rent,
      dorm_name: contract.rooms.dormitories.name,
      emergency_first_name: emergencyContacts[0]?.first_name || null,
      emergency_last_name: emergencyContacts[0]?.last_name || null,
      emergency_phone: emergencyContacts[0]?.phone_number || null,
      emergency_relationship: emergencyContacts[0]?.relationship || null,
      emergency_contacts_id: emergencyContacts[0]?.emergency_contacts_id || null,
      vehicles: vehicles.map(vehicle => ({
        tenant_vehicle_id: vehicle.tenant_vehicle_id,
        vehicle_type: vehicle.vehicle_type,
        license_plate: vehicle.license_plate
      }))
    };

    res.json(contractData);
  } catch (err) {
    console.error('Error fetching contract detail:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

//  ดึงสัญญาของห้องเฉพาะ
exports.getContractByRoom = async (req, res) => {
  try {
    const { dormId, roomNumber } = req.params;
    
    // ดึงข้อมูลสัญญาหลัก
    const contract = await prisma.contracts.findFirst({
      where: {
        rooms: {
          dorm_id: parseInt(dormId),
          room_number: roomNumber
        },
        status: 'active'
      },
      include: {
        tenants: {
          select: {
            first_name: true,
            last_name: true,
            phone_number: true,
            email: true
          }
        },
        rooms: {
          select: {
            room_number: true,
            floor_number: true,
            room_id: true
          }
        },
        room_types: {
          select: {
            room_type_name: true,
            monthly_rent: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    if (!contract) {
      console.log('No active contract found for room');
      return res.status(404).json({ error: 'ไม่พบสัญญาที่ยังใช้งานในห้องนี้' });
    }

    let contractData = {
      ...contract,
      first_name: contract.tenants.first_name,
      last_name: contract.tenants.last_name,
      phone_number: contract.tenants.phone_number,
      email: contract.tenants.email,
      room_number: contract.rooms.room_number,
      floor_number: contract.rooms.floor_number,
      room_type_name: contract.room_type_name || contract.room_types?.room_type_name,
      monthly_rent: contract.room_types?.monthly_rent
    };
    
    // ดึงข้อมูลมิเตอร์ล่าสุดจากตาราง meter_readings
    const latestMeter = await prisma.meter_readings.findFirst({
      where: {
        room_id: contract.rooms.room_id,
        meter_records: {
          dorm_id: parseInt(dormId)
        }
      },
      include: {
        meter_records: {
          select: {
            meter_record_date: true
          }
        }
      },
      orderBy: [
        { meter_records: { meter_record_date: 'desc' } },
        { created_at: 'desc' }
      ]
    });
    
    if (latestMeter) {
      // ใช้ข้อมูลมิเตอร์ล่าสุดจาก meter_readings
      contractData.water_meter_start = latestMeter.water_curr || contractData.water_meter_start;
      contractData.electric_meter_start = latestMeter.electric_curr || contractData.electric_meter_start;
      contractData.latest_meter_read_date = latestMeter.created_at;
    } else {
      console.log('⚠️ ไม่พบข้อมูลมิเตอร์ใน meter_readings ใช้ค่าเริ่มต้นจากสัญญา');
    }

    // ดึงข้อมูล utility rates ล่าสุด
    const rates = await prisma.utility_rates.findFirst({
      where: {
        dorm_id: parseInt(dormId)
      },
      orderBy: {
        start_date: 'desc'
      }
    });
    
    if (rates) {
      contractData.rates = {
        water: rates.water_rate,
        electric: rates.electricity_rate
      };
    }

    console.log('Contract data with latest meter readings:', contractData);
    res.json(contractData);
  } catch (err) {
    console.error('Error fetching room contract:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

//  อัปเดตข้อมูลสัญญา
exports.updateContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { contract_start_date, contract_end_date, moveout_notice_date } = req.body;

    // 🔍 1. ดึงค่าปัจจุบัน
    const existingContract = await prisma.contracts.findUnique({
      where: {
        contract_id: parseInt(contractId)
      },
      select: {
        moveout_notice_date: true
      }
    });

    if (!existingContract) {
      throw new Error('ไม่พบสัญญาที่ต้องการอัปเดต');
    }

    const oldMoveoutDate = existingContract.moveout_notice_date;
    const newMoveoutDate = moveout_notice_date || null;

    const formatDate = (date) =>
      date ? new Date(date).toISOString().split('T')[0] : null;

    const oldDateFormatted = formatDate(oldMoveoutDate);
    const newDateFormatted = formatDate(newMoveoutDate);

    const hasChanged = oldDateFormatted !== newDateFormatted;

    // ✅ สร้าง data object สำหรับ update
    let updateData = {
      contract_start_date: new Date(contract_start_date),
      contract_end_date: contract_end_date ? new Date(contract_end_date) : null,
      moveout_notice_date: newMoveoutDate ? new Date(newMoveoutDate) : null,
      updated_at: new Date()
    };

    if (newMoveoutDate === null) {
      // ❌ ไม่มีวันที่ย้าย → ล้าง notice_created_at ด้วย
      updateData.notice_created_at = null;
    } else if (hasChanged) {
      // ✅ วันที่ย้ายมีการเปลี่ยน → อัปเดต notice_created_at
      updateData.notice_created_at = new Date();
    }
    // else → ไม่มีการเปลี่ยนแปลง → ไม่แตะต้อง notice_created_at

    const result = await prisma.contracts.update({
      where: {
        contract_id: parseInt(contractId)
      },
      data: updateData
    });

    res.json({
      message: 'อัปเดตข้อมูลสัญญาสำเร็จ',
      contract: result,
    });

  } catch (err) {
    console.error('Error updating contract:', err);
    res.status(500).json({ error: 'Failed to update contract: ' + err.message });
  }
};

//  ยกเลิกสัญญา/ย้ายออก (รวมข้อมูล termination และ move_out_receipt)
exports.terminateContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { 
      termination_date,
      water_meter_end,
      electric_meter_end,
      adjustments = [],
      paymentMethod = 'เงินสด',
      finalAmount = 0,
      note = '',
      depositRefund = 0,
      isDepositRefund = false
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // อัปเดตสถานะสัญญาและข้อมูล termination
      const terminationTimestamp = new Date(termination_date);
      const contractEndDate = new Date(termination_date);
      
      const contract = await tx.contracts.update({
        where: {
          contract_id: parseInt(contractId)
        },
        data: {
          status: 'terminated',
          termination_date: terminationTimestamp,
          contract_end_date: contractEndDate,
          water_meter_end: water_meter_end || 0,
          electric_meter_end: electric_meter_end || 0,
          updated_at: new Date()
        },
        select: {
          room_id: true,
          tenant_id: true,
          contract_start_date: true,
          monthly_rent: true,
          deposit_monthly: true,
          advance_amount: true
        }
      });

      if (!contract) {
        throw new Error('ไม่พบสัญญาที่ต้องการยกเลิก');
      }

      const { room_id, tenant_id } = contract;

      // สร้าง receipt number รูปแบบ MO{YYYYMMDD}{สุ่ม2ตัว} เช่น MO2025090804
      const today = new Date();
      const dateStr = today.getFullYear().toString() + 
                     (today.getMonth() + 1).toString().padStart(2, '0') + 
                     today.getDate().toString().padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const receiptNumber = `MO${dateStr}${randomNum}`;
      
      const moveOutReceipt = await tx.move_out_receipts.create({
        data: {
          contract_id: parseInt(contractId),
          receipt_number: receiptNumber,
          receipt_date: contractEndDate,
          move_out_date: contractEndDate,
          payment_method: paymentMethod,
          net_amount: finalAmount,
          receipt_note: note,
          created_at: new Date()
        }
      });

      const moveOutReceiptId = moveOutReceipt.move_out_receipt_id;

      // สร้าง move_out_receipt_items สำหรับแต่ละ adjustment
      let calculatedNetAmount = 0;
      if (adjustments && adjustments.length > 0) {
        const receiptItems = adjustments.map(adjustment => {
          const amount = adjustment.amount || 0;
          const itemType = adjustment.type || 'service';
          
          // คำนวณ net_amount: charge/meter/penalty = บวก, refund = ลบ
          if (itemType === 'charge' || itemType === 'meter' || itemType === 'penalty') {
            calculatedNetAmount += amount;
          } else if (itemType === 'refund') {
            calculatedNetAmount -= amount;
          }
          
          return {
            move_out_receipt_id: moveOutReceiptId,
            item_type: itemType,
            description: adjustment.description || 'รายการไม่ระบุ',
            quantity: adjustment.unit || 1,
            unit_price: adjustment.pricePerUnit || amount,
            total_price: amount,
            created_at: new Date()
          };
        });

        await tx.move_out_receipt_items.createMany({
          data: receiptItems
        });

        // อัปเดต net_amount ในตาราง move_out_receipts ด้วยค่าที่คำนวณใหม่
        await tx.move_out_receipts.update({
          where: {
            move_out_receipt_id: moveOutReceiptId
          },
          data: {
            net_amount: calculatedNetAmount
          }
        });
      }

      // อัปเดตสถานะห้อง (ว่าง)
      await tx.rooms.update({
        where: {
          room_id: room_id
        },
        data: {
          available: true,
          status_id: 1
        }
      });

      // หยุดบริการรายเดือนทั้งหมด
      await tx.monthly_service.updateMany({
        where: {
          contract_id: parseInt(contractId)
        },
        data: {
          is_active: false,
          updated_at: new Date()
        }
      });

      return {
        contract_id: parseInt(contractId),
        tenant_id: tenant_id,
        room_id: room_id,
        receiptNumber: receiptNumber,
        moveOutReceiptId: moveOutReceiptId,
        terminationId: parseInt(contractId) // เพิ่ม terminationId สำหรับ frontend
      };
    });

    res.json({
      success: true,
      message: 'ยกเลิกสัญญาสำเร็จ',
      data: result
    });

  } catch (err) {
    console.error('Error terminating contract:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to terminate contract: ' + err.message 
    });
  }
};

//  ดึงรายการสัญญาที่ยกเลิกแล้ว (Terminated Contracts)
exports.getTerminatedContracts = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const result = await prisma.contracts.findMany({
      where: {
        rooms: {
          dormitory_id: parseInt(dormId)
        },
        status: 'terminated'
      },
      include: {
        tenants: {
          select: {
            first_name: true,
            last_name: true,
            phone_number: true,
            email: true
          }
        },
        rooms: {
          select: {
            room_number: true,
            floor_number: true
          }
        },
        room_types: {
          select: {
            room_type_name: true
          }
        }
      },
      orderBy: [
        { updated_at: 'desc' },
        { termination_date: 'desc' }
      ]
    });

    // จัดรูปแบบข้อมูลให้ตรงกับ API เดิม
    const terminatedContracts = result.map(contract => ({
      ...contract,
      first_name: contract.tenants.first_name,
      last_name: contract.tenants.last_name,
      phone_number: contract.tenants.phone_number,
      email: contract.tenants.email,
      room_number: contract.rooms.room_number,
      floor_number: contract.rooms.floor_number,
      room_type_name: contract.room_type_name || contract.room_types?.room_type_name,
      water_usage: contract.water_meter_end ? (contract.water_meter_end - contract.water_meter_start) : 0,
      electric_usage: contract.electric_meter_end ? (contract.electric_meter_end - contract.electric_meter_start) : 0,
      // ลบข้อมูล nested object ออกเพื่อไม่ให้ซ้ำ
      tenants: undefined,
      rooms: undefined,
      room_types: undefined
    }));

    res.json(terminatedContracts);

  } catch (err) {
    console.error('Error fetching terminated contracts:', err);
    res.status(500).json({ error: 'Error fetching terminated contracts' });
  }
};

//  ดึงรายละเอียดสัญญาที่ยกเลิกแล้ว
exports.getTerminatedContractDetail = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const contract = await prisma.contracts.findFirst({
      where: {
        contract_id: parseInt(contractId),
        status: 'terminated'
      },
      include: {
        tenants: {
          include: {
            tenant_vehicles: true,
            tenant_emergency_contacts: true
          }
        },
        rooms: {
          include: {
            dormitories: true
          }
        },
        room_types: true,
        move_out_receipts: true
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'ไม่พบสัญญาที่ยกเลิกแล้วที่ระบุ' });
    }

    // จัดกลุ่มยานพาหนะตามประเภท
    
    const vehicles = contract.tenants.tenant_vehicles.reduce((acc, vehicle) => {
      if (vehicle.vehicle_type === 'car') {
        acc.car.plates.push(vehicle.license_plate);
      } else if (vehicle.vehicle_type === 'motorcycle') {
        acc.motorcycle.plates.push(vehicle.license_plate);
      }
      return acc;
    }, {
      car: { has: false, plates: [] },
      motorcycle: { has: false, plates: [] }
    });
    
    // อัปเดตสถานะ has
    vehicles.car.has = vehicles.car.plates.length > 0;
    vehicles.motorcycle.has = vehicles.motorcycle.plates.length > 0;
    
    // หาข้อมูลผู้ติดต่อฉุกเฉินคนแรก
    const emergencyContact = contract.tenants.tenant_emergency_contacts[0];
    
    // จัดโครงสร้างข้อมูลให้ตรงกับที่ frontend คาดหวัง
    const formattedData = {
      move_out_receipt_id: contract.move_out_receipts[0]?.move_out_receipt_id || null,
      contract: {
        checkInDate: contract.contract_start_date,
        checkOutDate: contract.termination_date || contract.contract_end_date,
        monthlyRent: parseFloat(contract.monthly_rent) || 0,
        deposit: parseFloat(contract.deposit_monthly) || 0,
        advance: parseFloat(contract.advance_amount) || 0
      },
      tenant: {
        fullName: `${contract.tenants.first_name || ''} ${contract.tenants.last_name || ''}`.trim(),
        phone: contract.tenants.phone_number || '',
        email: contract.tenants.email || '',
        idNumber: contract.tenants.id_card_number || '',
        emergencyContact: {
          name: emergencyContact 
            ? `${emergencyContact.first_name} ${emergencyContact.last_name}`.trim()
            : 'ไม่ระบุ',
          relationship: emergencyContact?.relationship || 'ไม่ระบุ',
          phone: emergencyContact?.phone_number || 'ไม่ระบุ'
        },
        vehicleData: vehicles
      },
      room: {
        number: contract.rooms.room_number,
        type: contract.room_type_name || contract.room_types?.room_type_name
      },
      meters: {
        water: {
          start: contract.water_meter_start || 0,
          end: contract.water_meter_end || 0,
          usage: Math.abs((contract.water_meter_end || 0) - (contract.water_meter_start || 0)) || 0
        },
        electric: {
          start: contract.electric_meter_start || 0,
          end: contract.electric_meter_end || 0,
          usage: Math.abs((contract.electric_meter_end || 0) - (contract.electric_meter_start || 0)) || 0
        }
      },
      termination: {
        status: 'ย้ายออกแล้ว',
        notes: '',
        createdAt: contract.updated_at
      }
    };

    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching terminated contract detail:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

//  ดึงรายการแจ้งย้ายออกล่วงหน้าทั้งหมด
exports.getMoveoutList = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const result = await prisma.contracts.findMany({
      where: {
        moveout_notice_date: {
          not: null
        },
        status: {
          not: 'terminated'
        },
        rooms: {
          dorm_id: parseInt(dormId)
        }
      },
      include: {
        tenants: {
          select: {
            first_name: true,
            last_name: true,
            phone_number: true
          }
        },
        rooms: {
          select: {
            room_number: true
          }
        }
      },
      orderBy: {
        moveout_notice_date: 'asc'
      }
    });

    // จัดรูปแบบข้อมูลให้ตรงกับ API เดิม
    const moveoutList = result.map(contract => ({
      contract_id: contract.contract_id,
      room_number: contract.rooms.room_number,
      first_name: contract.tenants.first_name,
      last_name: contract.tenants.last_name,
      phone_number: contract.tenants.phone_number,
      notice_created_at: contract.notice_created_at,
      moveout_notice_date: contract.moveout_notice_date,
      status: contract.status
    }));

    res.json(moveoutList);
  } catch (err) {
    console.error('Error fetching moveout list:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
//  ยกเลิกแจ้งย้ายออกล่วงหน้า
exports.cancelMoveoutNotice = async (req, res) => {
  const { contractId } = req.params;

  try {
    const result = await prisma.contracts.update({
      where: {
        contract_id: parseInt(contractId)
      },
      data: {
        moveout_notice_date: null,
        notice_created_at: null,
        updated_at: new Date(),
        status: 'active'
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'ไม่พบสัญญาที่ต้องการยกเลิกแจ้งย้าย' });
    }

    res.json({
      message: 'ยกเลิกการแจ้งย้ายออกสำเร็จ',
      contract: result,
    });

  } catch (err) {
    console.error('Error cancelling moveout notice:', err);
    res.status(500).json({ error: 'Failed to cancel moveout notice: ' + err.message });
  }
};

/* ─────────────── 🔹 CONTRACT SERVICES FUNCTIONS ─────────────── */

// ดึงบริการรายเดือนของสัญญา
exports.getContractServices = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const result = await prisma.monthly_service.findMany({
      where: {
        contract_id: parseInt(contractId),
        is_active: true
      },
      select: {
        monthly_service_id: true,
        service_name: true,
        service_price: true,
        quantity: true,
        is_active: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // จัดรูปแบบให้ตรงกับ API เดิม
    const services = result.map(service => ({
      id: service.monthly_service_id,
      name: service.service_name,
      price: service.service_price,
      quantity: service.quantity,
      is_active: service.is_active
    }));

    res.json(services);
  } catch (err) {
    console.error('Error getting contract services:', err);
    res.status(500).json({ error: 'Failed to get contract services: ' + err.message });
  }
};

// เพิ่มบริการรายเดือนใหม่
exports.addContractService = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { name, price, quantity = 1 } = req.body;

    if (!name || !price || price <= 0) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อบริการและราคาที่ถูกต้อง' });
    }

    const result = await prisma.monthly_service.create({
      data: {
        contract_id: parseInt(contractId),
        service_name: name,
        service_price: price,
        quantity: quantity
      },
      select: {
        monthly_service_id: true,
        service_name: true,
        service_price: true,
        quantity: true
      }
    });

    res.status(201).json({
      message: 'เพิ่มบริการเรียบร้อย',
      service: {
        id: result.monthly_service_id,
        name: result.service_name,
        price: result.service_price,
        quantity: result.quantity
      }
    });
  } catch (err) {
    console.error('Error adding contract service:', err);
    res.status(500).json({ error: 'Failed to add contract service: ' + err.message });
  }
};

// แก้ไขบริการรายเดือน
exports.updateContractService = async (req, res) => {
  try {
    const { contractId, serviceId } = req.params;
    const { name, price, quantity = 1 } = req.body;

    if (!name || !price || price <= 0) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อบริการและราคาที่ถูกต้อง' });
    }

    const result = await prisma.monthly_service.update({
      where: {
        monthly_service_id: parseInt(serviceId),
        contract_id: parseInt(contractId)
      },
      data: {
        service_name: name,
        service_price: price,
        quantity: quantity,
        updated_at: new Date()
      },
      select: {
        monthly_service_id: true,
        service_name: true,
        service_price: true,
        quantity: true
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'ไม่พบบริการที่ระบุ' });
    }

    res.json({
      message: 'แก้ไขบริการเรียบร้อย',
      service: {
        id: result.monthly_service_id,
        name: result.service_name,
        price: result.service_price,
        quantity: result.quantity
      }
    });
  } catch (err) {
    console.error('Error updating contract service:', err);
    res.status(500).json({ error: 'Failed to update contract service: ' + err.message });
  }
};

// ลบบริการรายเดือน
exports.deleteContractService = async (req, res) => {
  try {
    const { contractId, serviceId } = req.params;

    const result = await prisma.monthly_service.update({
      where: {
        monthly_service_id: parseInt(serviceId),
        contract_id: parseInt(contractId)
      },
      data: {
        is_active: false,
        updated_at: new Date()
      },
      select: {
        monthly_service_id: true
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'ไม่พบบริการที่ระบุ' });
    }

    res.json({ message: 'ลบบริการเรียบร้อย' });
  } catch (err) {
    console.error('Error deleting contract service:', err);
    res.status(500).json({ error: 'Failed to delete contract service: ' + err.message });
  }
};