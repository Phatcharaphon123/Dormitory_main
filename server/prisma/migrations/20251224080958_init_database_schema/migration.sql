-- CreateEnum
CREATE TYPE "meter_source" AS ENUM ('manual', 'digital');

-- CreateEnum
CREATE TYPE "meter_type" AS ENUM ('water', 'electricity');

-- CreateTable
CREATE TABLE "bill_send_history" (
    "bill_send_history_id" SERIAL NOT NULL,
    "bill_id" INTEGER,
    "send_method" VARCHAR(50) NOT NULL,
    "send_to" VARCHAR(255) NOT NULL,
    "send_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "send_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "error_message" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_send_history_pkey" PRIMARY KEY ("bill_send_history_id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "contract_id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "room_type_id" INTEGER,
    "contract_start_date" DATE NOT NULL,
    "contract_end_date" DATE,
    "deposit_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "advance_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "water_meter_start" INTEGER DEFAULT 0,
    "electric_meter_start" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "moveout_notice_date" DATE,
    "notice_created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "monthly_rent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "room_type_name" VARCHAR(100),
    "water_meter_end" INTEGER,
    "electric_meter_end" INTEGER,
    "termination_date" TIMESTAMP(6),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "default_receipt_notes" (
    "default_receipt_note_id" SERIAL NOT NULL,
    "dorm_id" INTEGER NOT NULL,
    "note_content" TEXT DEFAULT '',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "receipt_type" VARCHAR(50) NOT NULL DEFAULT 'monthly',

    CONSTRAINT "default_receipt_notes_pkey" PRIMARY KEY ("default_receipt_note_id")
);

-- CreateTable
CREATE TABLE "dormitories" (
    "dorm_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "image_filename" VARCHAR(255),
    "address" TEXT,
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "subdistrict" VARCHAR(100),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "floors" INTEGER DEFAULT 1,
    "total_rooms" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "payment_due_day" INTEGER,
    "late_fee_per_day" DECIMAL(10,2),
    "auto_apply_late_fee" BOOLEAN DEFAULT false,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "dormitories_pkey" PRIMARY KEY ("dorm_id")
);

-- CreateTable
CREATE TABLE "invoice_receipt_items" (
    "invoice_receipt_item_id" SERIAL NOT NULL,
    "invoice_receipt_id" INTEGER,
    "item_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit_count" INTEGER DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL,

    CONSTRAINT "invoice_items_pkey1" PRIMARY KEY ("invoice_receipt_item_id")
);

-- CreateTable
CREATE TABLE "invoice_receipts" (
    "invoice_receipt_id" SERIAL NOT NULL,
    "monthly_invoice_id" INTEGER,
    "dorm_id" INTEGER,
    "utility_rate_id" INTEGER,
    "room_id" INTEGER,
    "tenant_id" INTEGER,
    "invoice_number" VARCHAR(50),
    "total" DECIMAL(10,2),
    "status" VARCHAR(20),
    "bill_month" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATE,
    "paid_date" DATE,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("invoice_receipt_id")
);

-- CreateTable
CREATE TABLE "meter_electricity" (
    "room_id" INTEGER NOT NULL,
    "electricity_meter_code" VARCHAR,
    "updated_at" TIMESTAMP(6),
    "installation_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_electricity_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "meter_reading_id" SERIAL NOT NULL,
    "meter_record_id" INTEGER,
    "room_id" INTEGER,
    "water_prev" INTEGER,
    "water_curr" INTEGER,
    "electric_prev" INTEGER,
    "electric_curr" INTEGER,
    "water_unit_used" INTEGER,
    "electric_unit_used" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "month" DATE,
    "water_rate" DECIMAL(10,2),
    "electricity_rate" DECIMAL(10,2),
    "water_total_cost" DECIMAL(10,2) DEFAULT 0,
    "electricity_total_cost" DECIMAL(10,2) DEFAULT 0,
    "total_cost" DECIMAL(10,2) DEFAULT 0,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("meter_reading_id")
);

-- CreateTable
CREATE TABLE "meter_records" (
    "meter_record_id" SERIAL NOT NULL,
    "meter_record_date" DATE NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "dorm_id" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "meter_records_pkey" PRIMARY KEY ("meter_record_id")
);

-- CreateTable
CREATE TABLE "meter_water" (
    "room_id" INTEGER NOT NULL,
    "water_meter_code" VARCHAR,
    "updated_at" TIMESTAMP(6),
    "installation_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_water_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "monthly_invoices" (
    "monthly_invoice_id" SERIAL NOT NULL,
    "meter_record_id" INTEGER,
    "dorm_id" INTEGER,
    "issue_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "due_date" DATE NOT NULL,
    "month" DATE NOT NULL,
    "charge_per_day" DECIMAL(10,2) DEFAULT 50.00,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_invoices_pkey" PRIMARY KEY ("monthly_invoice_id")
);

-- CreateTable
CREATE TABLE "monthly_service" (
    "monthly_service_id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "service_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_services_pkey" PRIMARY KEY ("monthly_service_id")
);

-- CreateTable
CREATE TABLE "move_in_receipt_items" (
    "move_in_receipt_item_id" SERIAL NOT NULL,
    "move_in_receipt_id" INTEGER,
    "item_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" DECIMAL(10,2) DEFAULT 0,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_items_pkey" PRIMARY KEY ("move_in_receipt_item_id")
);

-- CreateTable
CREATE TABLE "move_in_receipts" (
    "move_in_receipt_id" SERIAL NOT NULL,
    "contract_id" INTEGER,
    "receipt_number" VARCHAR(50) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50) DEFAULT 'cash',
    "receipt_date" DATE NOT NULL,
    "receipt_note" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("move_in_receipt_id")
);

-- CreateTable
CREATE TABLE "move_out_receipt_items" (
    "move_out_receipt_item_id" SERIAL NOT NULL,
    "move_out_receipt_id" INTEGER NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "move_out_receipt_items_pkey" PRIMARY KEY ("move_out_receipt_item_id")
);

-- CreateTable
CREATE TABLE "move_out_receipts" (
    "move_out_receipt_id" SERIAL NOT NULL,
    "contract_id" INTEGER,
    "receipt_number" VARCHAR(50) NOT NULL,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50) DEFAULT 'เงินสด',
    "receipt_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "move_out_date" DATE,
    "receipt_note" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "move_out_receipts_pkey" PRIMARY KEY ("move_out_receipt_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" SERIAL NOT NULL,
    "invoice_receipt_id" INTEGER NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'เงินสด',
    "payment_amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_note" TEXT,
    "receipt_number" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "room_type_images" (
    "room_type_image_id" SERIAL NOT NULL,
    "room_type_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_type_images_pkey" PRIMARY KEY ("room_type_image_id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "room_type_id" SERIAL NOT NULL,
    "dorm_id" INTEGER NOT NULL,
    "room_type_name" VARCHAR(255) NOT NULL,
    "monthly_rent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "security_deposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "prepaid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "amenities" JSONB,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("room_type_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "room_id" SERIAL NOT NULL,
    "dorm_id" INTEGER NOT NULL,
    "room_type_id" INTEGER,
    "floor_number" INTEGER NOT NULL,
    "room_number" VARCHAR(10) NOT NULL,
    "status_id" INTEGER DEFAULT 1,
    "available" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "tenant_emergency_contacts" (
    "emergency_contacts_id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "phone_number" VARCHAR(20) NOT NULL,
    "relationship" VARCHAR(50),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_emergency_contacts_pkey" PRIMARY KEY ("emergency_contacts_id")
);

-- CreateTable
CREATE TABLE "tenant_vehicles" (
    "tenant_vehicle_id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "license_plate" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "vehicle_type" VARCHAR(20),

    CONSTRAINT "tenant_vehicles_pkey" PRIMARY KEY ("tenant_vehicle_id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "tenant_id" SERIAL NOT NULL,
    "room_id" INTEGER,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "phone_number" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "id_card_number" VARCHAR(20),
    "address" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "subdistrict" VARCHAR(100),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "phone" VARCHAR(20),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "utility_rates" (
    "utility_rate_id" SERIAL NOT NULL,
    "dorm_id" INTEGER,
    "water_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "electricity_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "start_date" DATE NOT NULL,

    CONSTRAINT "utility_rates_pkey" PRIMARY KEY ("utility_rate_id")
);

-- CreateIndex
CREATE INDEX "idx_contracts_room_id" ON "contracts"("room_id");

-- CreateIndex
CREATE INDEX "idx_contracts_status" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "idx_contracts_tenant_id" ON "contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_contracts_termination_date" ON "contracts"("termination_date");

-- CreateIndex
CREATE INDEX "idx_default_receipt_notes_dorm_id" ON "default_receipt_notes"("dorm_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_dorm_receipt_type" ON "default_receipt_notes"("dorm_id", "receipt_type");

-- CreateIndex
CREATE INDEX "idx_dormitories_user_id" ON "dormitories"("user_id");

-- CreateIndex
CREATE INDEX "idx_meter_readings_electricity_cost" ON "meter_readings"("electricity_total_cost");

-- CreateIndex
CREATE INDEX "idx_meter_readings_total_cost" ON "meter_readings"("total_cost");

-- CreateIndex
CREATE INDEX "idx_meter_readings_water_cost" ON "meter_readings"("water_total_cost");

-- CreateIndex
CREATE INDEX "idx_contract_services_active" ON "monthly_service"("is_active");

-- CreateIndex
CREATE INDEX "idx_contract_services_contract_id" ON "monthly_service"("contract_id");

-- CreateIndex
CREATE INDEX "idx_receipt_items_receipt_id" ON "move_in_receipt_items"("move_in_receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "move_in_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "idx_receipts_contract_id" ON "move_in_receipts"("contract_id");

-- CreateIndex
CREATE INDEX "idx_receipts_receipt_date" ON "move_in_receipts"("receipt_date");

-- CreateIndex
CREATE INDEX "idx_receipts_receipt_number" ON "move_in_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "idx_move_out_receipt_items_item_type" ON "move_out_receipt_items"("item_type");

-- CreateIndex
CREATE INDEX "idx_move_out_receipt_items_receipt_id" ON "move_out_receipt_items"("move_out_receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "move_out_receipts_receipt_number_key" ON "move_out_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "idx_move_out_receipts_contract_id" ON "move_out_receipts"("contract_id");

-- CreateIndex
CREATE INDEX "idx_move_out_receipts_move_out_date" ON "move_out_receipts"("move_out_date");

-- CreateIndex
CREATE INDEX "idx_move_out_receipts_receipt_date" ON "move_out_receipts"("receipt_date");

-- CreateIndex
CREATE INDEX "idx_move_out_receipts_receipt_number" ON "move_out_receipts"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE INDEX "idx_payments_invoice_id" ON "payments"("invoice_receipt_id");

-- CreateIndex
CREATE INDEX "idx_payments_payment_date" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "idx_payments_receipt_number" ON "payments"("receipt_number");

-- CreateIndex
CREATE INDEX "idx_rooms_dorm_id" ON "rooms"("dorm_id");

-- CreateIndex
CREATE INDEX "idx_rooms_room_type_id" ON "rooms"("room_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_dorm_id_room_number_key" ON "rooms"("dorm_id", "room_number");

-- CreateIndex
CREATE INDEX "idx_tenants_district" ON "tenants"("district");

-- CreateIndex
CREATE INDEX "idx_tenants_province" ON "tenants"("province");

-- CreateIndex
CREATE INDEX "idx_tenants_room_id" ON "tenants"("room_id");

-- CreateIndex
CREATE INDEX "idx_tenants_subdistrict" ON "tenants"("subdistrict");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("room_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "default_receipt_notes" ADD CONSTRAINT "default_receipt_notes_dorm_id_fkey" FOREIGN KEY ("dorm_id") REFERENCES "dormitories"("dorm_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dormitories" ADD CONSTRAINT "fk_dormitories_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_receipt_items" ADD CONSTRAINT "invoice_receipt_items_invoice_receipt_id_fkey" FOREIGN KEY ("invoice_receipt_id") REFERENCES "invoice_receipts"("invoice_receipt_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_receipts" ADD CONSTRAINT "invoice_receipts_dorm_id_fkey" FOREIGN KEY ("dorm_id") REFERENCES "dormitories"("dorm_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_receipts" ADD CONSTRAINT "invoice_receipts_monthly_invoice_id_fkey" FOREIGN KEY ("monthly_invoice_id") REFERENCES "monthly_invoices"("monthly_invoice_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_receipts" ADD CONSTRAINT "invoice_receipts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_receipts" ADD CONSTRAINT "invoice_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_receipts" ADD CONSTRAINT "invoice_receipts_utility_rate_id_fkey" FOREIGN KEY ("utility_rate_id") REFERENCES "utility_rates"("utility_rate_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meter_electricity" ADD CONSTRAINT "meter_electricity_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "fk_meter_record" FOREIGN KEY ("meter_record_id") REFERENCES "meter_records"("meter_record_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meter_records" ADD CONSTRAINT "fk_meter_records_dorm" FOREIGN KEY ("dorm_id") REFERENCES "dormitories"("dorm_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_water" ADD CONSTRAINT "meter_water_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_invoices" ADD CONSTRAINT "monthly_invoices_dorm_id_fkey" FOREIGN KEY ("dorm_id") REFERENCES "dormitories"("dorm_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_invoices" ADD CONSTRAINT "monthly_invoices_meter_record_id_fkey" FOREIGN KEY ("meter_record_id") REFERENCES "meter_records"("meter_record_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_service" ADD CONSTRAINT "contract_services_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("contract_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "move_in_receipt_items" ADD CONSTRAINT "move_in_receipt_items_move_in_receipt_id_fkey" FOREIGN KEY ("move_in_receipt_id") REFERENCES "move_in_receipts"("move_in_receipt_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "move_in_receipts" ADD CONSTRAINT "move_in_receipts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("contract_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "move_out_receipt_items" ADD CONSTRAINT "move_out_receipt_items_move_out_receipt_id_fkey" FOREIGN KEY ("move_out_receipt_id") REFERENCES "move_out_receipts"("move_out_receipt_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "move_out_receipts" ADD CONSTRAINT "move_out_receipts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("contract_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_receipt_id_fkey" FOREIGN KEY ("invoice_receipt_id") REFERENCES "invoice_receipts"("invoice_receipt_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_type_images" ADD CONSTRAINT "room_type_images_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("room_type_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_dorm_id_fkey" FOREIGN KEY ("dorm_id") REFERENCES "dormitories"("dorm_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "fk_rooms_dorm" FOREIGN KEY ("dorm_id") REFERENCES "dormitories"("dorm_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("room_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_emergency_contacts" ADD CONSTRAINT "tenant_emergency_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_vehicles" ADD CONSTRAINT "tenant_vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
