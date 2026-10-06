-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "role_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "flagged_for_review" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "force_password_reset" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "category_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "brand" TEXT,
    "description" TEXT,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'piece',
    "allow_fractional" BOOLEAN NOT NULL DEFAULT false,
    "has_expiry" BOOLEAN NOT NULL DEFAULT false,
    "reorder_level" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "default_tax_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_units" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "unit_name" TEXT NOT NULL,
    "conversion_factor" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "buying_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "selling_price_retail" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "selling_price_wholesale" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "min_wholesale_qty" INTEGER NOT NULL DEFAULT 10,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_histories" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "old_price" DECIMAL(65,30) NOT NULL,
    "new_price" DECIMAL(65,30) NOT NULL,
    "price_type" TEXT NOT NULL,
    "changed_by" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "quantity_on_hand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "batch_no" TEXT,
    "expiry_date" TIMESTAMP(3),
    "last_cost_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "from_location_id" INTEGER,
    "to_location_id" INTEGER,
    "quantity" DECIMAL(65,30) NOT NULL,
    "movement_type" TEXT NOT NULL,
    "reference_id" INTEGER,
    "reference_type" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tin" TEXT,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "po_number" TEXT NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ordered_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMP(3),
    "grand_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER,
    "receipt_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "received_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" SERIAL NOT NULL,
    "goods_receipt_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_cost" DECIMAL(65,30) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "batch_no" TEXT,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "goods_receipt_id" INTEGER,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "paid_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tin" TEXT,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "is_wholesale" BOOLEAN NOT NULL DEFAULT false,
    "credit_limit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "sale_number" TEXT NOT NULL,
    "customer_id" INTEGER,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "sale_type" TEXT NOT NULL DEFAULT 'RETAIL',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "total" DECIMAL(65,30) NOT NULL,
    "discount_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(65,30) NOT NULL,
    "paid_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "client_reference" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_lines" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_unit_id" INTEGER,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(65,30) NOT NULL,
    "cost_price" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "sale_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_reference" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by" INTEGER NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "paid_to" TEXT,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "paid_by" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_fiscals" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "efris_uid" TEXT,
    "efris_status" TEXT NOT NULL DEFAULT 'PENDING',
    "efris_payload" TEXT,
    "response_payload" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_fiscals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER,
    "previous_value" TEXT,
    "new_value" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "owner_email" TEXT,
    "owner_phone" TEXT,
    "address" TEXT,
    "business_type" TEXT DEFAULT 'retail',
    "description" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "single_user" BOOLEAN NOT NULL DEFAULT false,
    "trial_ends_at" TIMESTAMP(3),
    "plan_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "period_months" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tracking_id" TEXT,
    "merchant_ref" TEXT NOT NULL,
    "ipn_id" TEXT,
    "payment_method" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "unlock_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "target_plan" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_locks" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "user_id" INTEGER,
    "reason" TEXT NOT NULL,
    "trigger_source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "ip_address" TEXT,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3),
    "unlocked_at" TIMESTAMP(3),
    "unlocked_by_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "account_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_tenant_id_key" ON "users"("username", "tenant_id");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_tenant_id_key" ON "roles"("name", "tenant_id");

-- CreateIndex
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_tenant_id_key" ON "categories"("name", "tenant_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_is_active_idx" ON "products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_tenant_id_key" ON "products"("sku", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_tenant_id_key" ON "products"("barcode", "tenant_id");

-- CreateIndex
CREATE INDEX "price_histories_product_id_changed_at_idx" ON "price_histories"("product_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "stock_locations_name_tenant_id_key" ON "stock_locations"("name", "tenant_id");

-- CreateIndex
CREATE INDEX "stock_items_product_id_idx" ON "stock_items"("product_id");

-- CreateIndex
CREATE INDEX "stock_items_location_id_idx" ON "stock_items"("location_id");

-- CreateIndex
CREATE INDEX "stock_items_location_id_quantity_on_hand_idx" ON "stock_items"("location_id", "quantity_on_hand");

-- CreateIndex
CREATE INDEX "stock_items_location_id_expiry_date_idx" ON "stock_items"("location_id", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_product_id_location_id_batch_no_key" ON "stock_items"("product_id", "location_id", "batch_no");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_movement_type_created_at_idx" ON "stock_movements"("product_id", "movement_type", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_created_by_idx" ON "stock_movements"("created_by");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_is_active_idx" ON "suppliers"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_created_at_idx" ON "suppliers"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_status_idx" ON "purchase_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_tenant_id_key" ON "purchase_orders"("po_number", "tenant_id");

-- CreateIndex
CREATE INDEX "purchase_order_lines_purchase_order_id_idx" ON "purchase_order_lines"("purchase_order_id");

-- CreateIndex
CREATE INDEX "goods_receipts_tenant_id_idx" ON "goods_receipts"("tenant_id");

-- CreateIndex
CREATE INDEX "goods_receipts_tenant_id_receipt_date_idx" ON "goods_receipts"("tenant_id", "receipt_date");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_goods_receipt_id_idx" ON "goods_receipt_lines"("goods_receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_goods_receipt_id_key" ON "supplier_invoices"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "supplier_invoices_supplier_id_idx" ON "supplier_invoices"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_invoices_supplier_id_invoice_date_idx" ON "supplier_invoices"("supplier_id", "invoice_date");

-- CreateIndex
CREATE INDEX "customers_tenant_id_is_active_idx" ON "customers"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "customers_tenant_id_phone_idx" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "customers_tenant_id_created_at_idx" ON "customers"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "sales_tenant_id_created_at_idx" ON "sales"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "sales_tenant_id_status_idx" ON "sales"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_client_reference_idx" ON "sales"("tenant_id", "client_reference");

-- CreateIndex
CREATE UNIQUE INDEX "sales_sale_number_tenant_id_key" ON "sales"("sale_number", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenant_id_client_reference_key" ON "sales"("tenant_id", "client_reference");

-- CreateIndex
CREATE INDEX "sale_lines_sale_id_idx" ON "sale_lines"("sale_id");

-- CreateIndex
CREATE INDEX "sale_lines_product_id_idx" ON "sale_lines"("product_id");

-- CreateIndex
CREATE INDEX "payments_sale_id_idx" ON "payments"("sale_id");

-- CreateIndex
CREATE INDEX "payments_received_at_idx" ON "payments"("received_at");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_paid_at_idx" ON "expenses"("tenant_id", "paid_at");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_category_paid_at_idx" ON "expenses"("tenant_id", "category", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_fiscals_sale_id_key" ON "invoice_fiscals"("sale_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_is_read_idx" ON "notifications"("tenant_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_is_read_created_at_idx" ON "notifications"("tenant_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_name_key" ON "tenants"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tracking_id_key" ON "subscriptions"("tracking_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_merchant_ref_key" ON "subscriptions"("merchant_ref");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_unlock_code_key" ON "subscriptions"("unlock_code");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_status_idx" ON "subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_created_at_idx" ON "subscriptions"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "account_locks_username_idx" ON "account_locks"("username");

-- CreateIndex
CREATE INDEX "account_locks_is_active_locked_at_idx" ON "account_locks"("is_active", "locked_at");

-- CreateIndex
CREATE INDEX "account_locks_user_id_idx" ON "account_locks"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_product_unit_id_fkey" FOREIGN KEY ("product_unit_id") REFERENCES "product_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_fiscals" ADD CONSTRAINT "invoice_fiscals_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_locks" ADD CONSTRAINT "account_locks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_locks" ADD CONSTRAINT "account_locks_unlocked_by_id_fkey" FOREIGN KEY ("unlocked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

