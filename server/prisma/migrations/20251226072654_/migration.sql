-- CreateTable
CREATE TABLE `bill_send_history` (
    `bill_send_history_id` INTEGER NOT NULL AUTO_INCREMENT,
    `bill_id` INTEGER NULL,
    `send_method` VARCHAR(50) NOT NULL,
    `send_to` VARCHAR(255) NOT NULL,
    `send_status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `send_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `error_message` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`bill_send_history_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `contract_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `room_type_id` INTEGER NULL,
    `contract_start_date` DATE NOT NULL,
    `contract_end_date` DATE NULL,
    `deposit_monthly` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `advance_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `water_meter_start` INTEGER NULL DEFAULT 0,
    `electric_meter_start` INTEGER NULL DEFAULT 0,
    `status` VARCHAR(20) NULL DEFAULT 'active',
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `moveout_notice_date` DATE NULL,
    `notice_created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `monthly_rent` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `room_type_name` VARCHAR(100) NULL,
    `water_meter_end` INTEGER NULL,
    `electric_meter_end` INTEGER NULL,
    `termination_date` TIMESTAMP(6) NULL,

    INDEX `idx_contracts_room_id`(`room_id`),
    INDEX `idx_contracts_status`(`status`),
    INDEX `idx_contracts_tenant_id`(`tenant_id`),
    INDEX `idx_contracts_termination_date`(`termination_date`),
    PRIMARY KEY (`contract_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `default_receipt_notes` (
    `default_receipt_note_id` INTEGER NOT NULL AUTO_INCREMENT,
    `dorm_id` INTEGER NOT NULL,
    `note_content` VARCHAR(191) NULL DEFAULT '',
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `receipt_type` VARCHAR(50) NOT NULL DEFAULT 'monthly',

    INDEX `idx_default_receipt_notes_dorm_id`(`dorm_id`),
    UNIQUE INDEX `unique_dorm_receipt_type`(`dorm_id`, `receipt_type`),
    PRIMARY KEY (`default_receipt_note_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dormitories` (
    `dorm_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `image_filename` VARCHAR(255) NULL,
    `address` VARCHAR(191) NULL,
    `province` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `subdistrict` VARCHAR(100) NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `floors` INTEGER NULL DEFAULT 1,
    `total_rooms` INTEGER NULL DEFAULT 0,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `payment_due_day` INTEGER NULL,
    `late_fee_per_day` DECIMAL(10, 2) NULL,
    `auto_apply_late_fee` BOOLEAN NULL DEFAULT false,
    `user_id` INTEGER NOT NULL,

    INDEX `idx_dormitories_user_id`(`user_id`),
    PRIMARY KEY (`dorm_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dorm_staffs` (
    `user_id` INTEGER NOT NULL,
    `dorm_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`, `dorm_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_receipt_items` (
    `invoice_receipt_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_receipt_id` INTEGER NULL,
    `item_type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `unit_count` INTEGER NULL DEFAULT 1,
    `price` DECIMAL(10, 2) NOT NULL,
    `amount` DECIMAL NULL,

    PRIMARY KEY (`invoice_receipt_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_receipts` (
    `invoice_receipt_id` INTEGER NOT NULL AUTO_INCREMENT,
    `monthly_invoice_id` INTEGER NULL,
    `dorm_id` INTEGER NULL,
    `utility_rate_id` INTEGER NULL,
    `room_id` INTEGER NULL,
    `tenant_id` INTEGER NULL,
    `invoice_number` VARCHAR(50) NULL,
    `total` DECIMAL(10, 2) NULL,
    `status` VARCHAR(20) NULL,
    `bill_month` DATE NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `due_date` DATE NULL,
    `paid_date` DATE NULL,

    PRIMARY KEY (`invoice_receipt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meter_electricity` (
    `room_id` INTEGER NOT NULL,
    `electricity_meter_code` VARCHAR(50) NULL,
    `updated_at` TIMESTAMP(6) NULL,
    `installation_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`room_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meter_readings` (
    `meter_reading_id` INTEGER NOT NULL AUTO_INCREMENT,
    `meter_record_id` INTEGER NULL,
    `room_id` INTEGER NULL,
    `water_prev` INTEGER NULL,
    `water_curr` INTEGER NULL,
    `electric_prev` INTEGER NULL,
    `electric_curr` INTEGER NULL,
    `water_unit_used` INTEGER NULL,
    `electric_unit_used` INTEGER NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `month` DATE NULL,
    `water_rate` DECIMAL(10, 2) NULL,
    `electricity_rate` DECIMAL(10, 2) NULL,
    `water_total_cost` DECIMAL(10, 2) NULL DEFAULT 0,
    `electricity_total_cost` DECIMAL(10, 2) NULL DEFAULT 0,
    `total_cost` DECIMAL(10, 2) NULL DEFAULT 0,

    INDEX `idx_meter_readings_electricity_cost`(`electricity_total_cost`),
    INDEX `idx_meter_readings_total_cost`(`total_cost`),
    INDEX `idx_meter_readings_water_cost`(`water_total_cost`),
    PRIMARY KEY (`meter_reading_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meter_records` (
    `meter_record_id` INTEGER NOT NULL AUTO_INCREMENT,
    `meter_record_date` DATE NOT NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `dorm_id` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`meter_record_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meter_water` (
    `room_id` INTEGER NOT NULL,
    `water_meter_code` VARCHAR(50) NULL,
    `updated_at` TIMESTAMP(6) NULL,
    `installation_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`room_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_invoices` (
    `monthly_invoice_id` INTEGER NOT NULL AUTO_INCREMENT,
    `meter_record_id` INTEGER NULL,
    `dorm_id` INTEGER NULL,
    `issue_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `month` DATE NOT NULL,
    `charge_per_day` DECIMAL(10, 2) NULL DEFAULT 50.00,
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`monthly_invoice_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_service` (
    `monthly_service_id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `service_name` VARCHAR(255) NOT NULL,
    `service_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_contract_services_active`(`is_active`),
    INDEX `idx_contract_services_contract_id`(`contract_id`),
    PRIMARY KEY (`monthly_service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `move_in_receipt_items` (
    `move_in_receipt_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `move_in_receipt_id` INTEGER NULL,
    `item_type` VARCHAR(50) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NULL DEFAULT 1,
    `unit_price` DECIMAL(10, 2) NULL DEFAULT 0,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_receipt_items_receipt_id`(`move_in_receipt_id`),
    PRIMARY KEY (`move_in_receipt_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `move_in_receipts` (
    `move_in_receipt_id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NULL,
    `receipt_number` VARCHAR(50) NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(50) NULL DEFAULT 'cash',
    `receipt_date` DATE NOT NULL,
    `receipt_note` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `move_in_receipts_receipt_number_key`(`receipt_number`),
    INDEX `idx_receipts_contract_id`(`contract_id`),
    INDEX `idx_receipts_receipt_date`(`receipt_date`),
    INDEX `idx_receipts_receipt_number`(`receipt_number`),
    PRIMARY KEY (`move_in_receipt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `move_out_receipt_items` (
    `move_out_receipt_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `move_out_receipt_id` INTEGER NOT NULL,
    `item_type` VARCHAR(50) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NULL DEFAULT 1,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_move_out_receipt_items_item_type`(`item_type`),
    INDEX `idx_move_out_receipt_items_receipt_id`(`move_out_receipt_id`),
    PRIMARY KEY (`move_out_receipt_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `move_out_receipts` (
    `move_out_receipt_id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NULL,
    `receipt_number` VARCHAR(50) NOT NULL,
    `net_amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(50) NULL DEFAULT 'เงินสด',
    `receipt_date` DATE NOT NULL,
    `move_out_date` DATE NULL,
    `receipt_note` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `move_out_receipts_receipt_number_key`(`receipt_number`),
    INDEX `idx_move_out_receipts_contract_id`(`contract_id`),
    INDEX `idx_move_out_receipts_move_out_date`(`move_out_date`),
    INDEX `idx_move_out_receipts_receipt_date`(`receipt_date`),
    INDEX `idx_move_out_receipts_receipt_number`(`receipt_number`),
    PRIMARY KEY (`move_out_receipt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_receipt_id` INTEGER NULL,
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'เงินสด',
    `payment_amount` DECIMAL(10, 2) NOT NULL,
    `payment_date` DATE NOT NULL,
    `payment_note` VARCHAR(191) NULL,
    `receipt_number` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `payments_receipt_number_key`(`receipt_number`),
    INDEX `idx_payments_invoice_id`(`invoice_receipt_id`),
    INDEX `idx_payments_payment_date`(`payment_date`),
    INDEX `idx_payments_receipt_number`(`receipt_number`),
    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_type_images` (
    `room_type_image_id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_type_id` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`room_type_image_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_types` (
    `room_type_id` INTEGER NOT NULL AUTO_INCREMENT,
    `dorm_id` INTEGER NOT NULL,
    `room_type_name` VARCHAR(255) NOT NULL,
    `monthly_rent` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `security_deposit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `prepaid_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `amenities` JSON NULL,

    PRIMARY KEY (`room_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `room_id` INTEGER NOT NULL AUTO_INCREMENT,
    `dorm_id` INTEGER NOT NULL,
    `room_type_id` INTEGER NULL,
    `floor_number` INTEGER NOT NULL,
    `room_number` VARCHAR(10) NOT NULL,
    `status_id` INTEGER NULL DEFAULT 1,
    `available` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_rooms_dorm_id`(`dorm_id`),
    INDEX `idx_rooms_room_type_id`(`room_type_id`),
    UNIQUE INDEX `rooms_dorm_id_room_number_key`(`dorm_id`, `room_number`),
    PRIMARY KEY (`room_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_emergency_contacts` (
    `emergency_contacts_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` INTEGER NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `relationship` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`emergency_contacts_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_vehicles` (
    `tenant_vehicle_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` INTEGER NOT NULL,
    `license_plate` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `vehicle_type` VARCHAR(20) NULL,

    PRIMARY KEY (`tenant_vehicle_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `tenant_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `room_id` INTEGER NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NULL,
    `id_card_number` VARCHAR(20) NULL,
    `address` VARCHAR(191) NULL,
    `province` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `subdistrict` VARCHAR(100) NULL,
    `note` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `tenants_user_id_key`(`user_id`),
    INDEX `idx_tenants_district`(`district`),
    INDEX `idx_tenants_province`(`province`),
    INDEX `idx_tenants_room_id`(`room_id`),
    INDEX `idx_tenants_subdistrict`(`subdistrict`),
    PRIMARY KEY (`tenant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role` ENUM('SUPER_ADMIN', 'OWNER', 'ADMIN', 'STAFF', 'TENANT', 'TECHNICIAN') NOT NULL DEFAULT 'OWNER',
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `utility_rates` (
    `utility_rate_id` INTEGER NOT NULL AUTO_INCREMENT,
    `dorm_id` INTEGER NULL,
    `water_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `electricity_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `start_date` DATE NOT NULL,

    PRIMARY KEY (`utility_rate_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`room_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`room_type_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `default_receipt_notes` ADD CONSTRAINT `default_receipt_notes_dorm_id_fkey` FOREIGN KEY (`dorm_id`) REFERENCES `dormitories`(`dorm_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dormitories` ADD CONSTRAINT `fk_dormitories_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dorm_staffs` ADD CONSTRAINT `dorm_staffs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dorm_staffs` ADD CONSTRAINT `dorm_staffs_dorm_id_fkey` FOREIGN KEY (`dorm_id`) REFERENCES `dormitories`(`dorm_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_receipt_items` ADD CONSTRAINT `invoice_receipt_items_invoice_receipt_id_fkey` FOREIGN KEY (`invoice_receipt_id`) REFERENCES `invoice_receipts`(`invoice_receipt_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_receipts` ADD CONSTRAINT `invoice_receipts_dorm_id_fkey` FOREIGN KEY (`dorm_id`) REFERENCES `dormitories`(`dorm_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_receipts` ADD CONSTRAINT `invoice_receipts_monthly_invoice_id_fkey` FOREIGN KEY (`monthly_invoice_id`) REFERENCES `monthly_invoices`(`monthly_invoice_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_receipts` ADD CONSTRAINT `invoice_receipts_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`room_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_receipts` ADD CONSTRAINT `invoice_receipts_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_receipts` ADD CONSTRAINT `invoice_receipts_utility_rate_id_fkey` FOREIGN KEY (`utility_rate_id`) REFERENCES `utility_rates`(`utility_rate_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `meter_electricity` ADD CONSTRAINT `meter_electricity_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`room_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_record` FOREIGN KEY (`meter_record_id`) REFERENCES `meter_records`(`meter_record_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `meter_readings` ADD CONSTRAINT `meter_readings_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`room_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `meter_records` ADD CONSTRAINT `fk_meter_records_dorm` FOREIGN KEY (`dorm_id`) REFERENCES `dormitories`(`dorm_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meter_water` ADD CONSTRAINT `meter_water_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`room_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `monthly_invoices` ADD CONSTRAINT `monthly_invoices_dorm_id_fkey` FOREIGN KEY (`dorm_id`) REFERENCES `dormitories`(`dorm_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `monthly_invoices` ADD CONSTRAINT `monthly_invoices_meter_record_id_fkey` FOREIGN KEY (`meter_record_id`) REFERENCES `meter_records`(`meter_record_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `monthly_service` ADD CONSTRAINT `monthly_service_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`contract_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `move_in_receipt_items` ADD CONSTRAINT `move_in_receipt_items_move_in_receipt_id_fkey` FOREIGN KEY (`move_in_receipt_id`) REFERENCES `move_in_receipts`(`move_in_receipt_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `move_in_receipts` ADD CONSTRAINT `move_in_receipts_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`contract_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `move_out_receipt_items` ADD CONSTRAINT `move_out_receipt_items_move_out_receipt_id_fkey` FOREIGN KEY (`move_out_receipt_id`) REFERENCES `move_out_receipts`(`move_out_receipt_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `move_out_receipts` ADD CONSTRAINT `move_out_receipts_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`contract_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_receipt_id_fkey` FOREIGN KEY (`invoice_receipt_id`) REFERENCES `invoice_receipts`(`invoice_receipt_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `room_type_images` ADD CONSTRAINT `room_type_images_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`room_type_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `room_types` ADD CONSTRAINT `room_types_dorm_id_fkey` FOREIGN KEY (`dorm_id`) REFERENCES `dormitories`(`dorm_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `fk_rooms_dorm` FOREIGN KEY (`dorm_id`) REFERENCES `dormitories`(`dorm_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`room_type_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tenant_emergency_contacts` ADD CONSTRAINT `tenant_emergency_contacts_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tenant_vehicles` ADD CONSTRAINT `tenant_vehicles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`room_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
