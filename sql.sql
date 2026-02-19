CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "inv_direction" AS ENUM ('IN', 'OUT', 'NONE');
CREATE TYPE "inv_doc_status" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
CREATE TYPE "inv_doc_type" AS ENUM ('PURCHASE_RECEIPT', 'SALE_SHIPMENT', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT', 'TRANSFER', 'CYCLE_COUNT', 'IN_PRIMA', 'OUT_PRIMA');
CREATE TYPE "po_status" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED');
CREATE TYPE "product_type" AS ENUM ('PRIMA', 'FINISHED');
CREATE TYPE "production_status" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "reservation_status" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED');

CREATE TABLE "stock_reservations" (
    "reservation_id" uuid NOT NULL,
    "warehouse_id " uuid NOT NULL,
    "location_id " uuid NOT NULL,
    "variant_id " uuid NOT NULL,
    "quantity " integer NOT NULL,
    "status" reservation_status NOT NULL DEFAULT 'ACTIVE',
    "reference_type" varchar(30) NOT NULL,
    "reference_id" uuid,
    " expires_at" timestamp NOT NULL,
    "created_by" uuid,
    "created_at" timestamp,
    PRIMARY KEY ("reservation_id")
);

CREATE TABLE "public"."production_order_item" (
    "production_item_id" uuid NOT NULL,
    "production_id" uuid,
    "finished_variant_id" uuid,
    "from_location_id" uuid,
    "to_location_id" uuid,
    "quantity" int,
    "unit_cost" numeric,
    PRIMARY KEY ("production_item_id")
);

CREATE TABLE "purchase_order_items" (
    "po_item_id " uuid NOT NULL,
    "po_id " uuid NOT NULL,
    "variant_id " uuid NOT NULL,
    "quantity " integer NOT NULL,
    "unit_cost " numeric(12, 2) NOT NULL,
    PRIMARY KEY ("po_item_id ")
);

CREATE TABLE "inventory_ledger" (
    "ledger_id" uuid NOT NULL,
    "doc_id" uuid NOT NULL,
    "warehouse_id " uuid NOT NULL,
    "location_id " uuid NOT NULL,
    "variant_id " uuid NOT NULL,
    "direction" inv_direction NOT NULL,
    "quantity" integer NOT NULL,
    "unit_cost " numeric(12, 2) NOT NULL,
    "created_at " timestamp NOT NULL,
    PRIMARY KEY ("ledger_id")
);

CREATE TABLE "users" (
    "user_ID" uuid NOT NULL,
    "nombre" varchar(100) NOT NULL,
    "email" varchar(255) NOT NULL,
    "password" varchar(255) NOT NULL,
    "rol_ID" uuid NOT NULL,
    "delete" boolean NOT NULL,
    "avatar" text,
    "createdAt" timestamp,
    PRIMARY KEY ("user_ID")
);

CREATE TABLE "purchase_orders" (
    "po_id" uuid NOT NULL,
    "supplier_id " uuid,
    "warehouse_id " uuid,
    "status " po_status,
    "expected_at " timestamp,
    "note " text,
    "created_at " timestamp,
    PRIMARY KEY ("po_id")
);

CREATE TABLE "products" (
    "product_id" uuid NOT NULL,
    "name" varchar(100) NOT NULL,
    "descripcion" text NOT NULL,
    "type" product_type NOT NULL,
    "is_active" boolean NOT NULL,
    "updateAt" timestamp NOT NULL,
    "createdAt" timestamp NOT NULL,
    PRIMARY KEY ("product_id")
);

CREATE TABLE "inventory_documents" (
    "doc_id " uuid NOT NULL,
    "production_id" uuid,
    "doc_type " inv_doc_type NOT NULL,
    "status" inv_doc_status NOT NULL,
    "from_warehouse_id " uuid NOT NULL,
    "to_warehouse_id " uuid NOT NULL,
    "series_id" uuid NOT NULL UNIQUE,
    "reference_type " varchar(30) NOT NULL,
    "reference_id " uuid NOT NULL,
    "note" text,
    "created_by " uuid NOT NULL,
    "posted_by" uuid NOT NULL,
    "posted_at " timestamp NOT NULL,
    "created_at" timestamp NOT NULL,
    PRIMARY KEY ("doc_id ")
);

CREATE TABLE "public"."units" (
    "unit_id" uuid NOT NULL,
    "code" varchar,
    "name" varchar,
    PRIMARY KEY ("unit_id")
);

CREATE TABLE "roles" (
    "rol_ID" uuid NOT NULL,
    "name" varchar(100) NOT NULL,
    "delete" boolean NOT NULL,
    "createdAt" timestamp,
    PRIMARY KEY ("rol_ID")
);

CREATE TABLE "public"."product_equivalences" (
    "equivalence_id" uuid NOT NULL,
    "prima_variant_id" uuid UNIQUE,
    "from_unit_id" uuid UNIQUE,
    "to_unit_id" uuid UNIQUE,
    "factor" int,
    PRIMARY KEY ("equivalence_id")
);

CREATE TABLE "suppliers" (
    "supplier_id" uuid NOT NULL,
    "name " varchar(160) NOT NULL,
    "phone" varchar(40) NOT NULL,
    "email " varchar(120) NOT NULL,
    "address " text,
    "created_at " timestamp NOT NULL,
    PRIMARY KEY ("supplier_id")
);

CREATE TABLE "supplier_variants" (
    "supplier_id " uuid NOT NULL,
    "variant_id" uuid,
    "supplier_sku " varchar(80) NOT NULL,
    "last_cost " numeric(12, 2) NOT NULL,
    "lead_time_days " integer NOT NULL
);

CREATE TABLE "public"."documents_series" (
    "series_id" uuid NOT NULL,
    "code" varchar(60) NOT NULL UNIQUE,
    "name" varchar(60) NOT NULL,
    "doc_type" inv_doc_type NOT NULL UNIQUE,
    " warehouse_id" uuid NOT NULL UNIQUE,
    "next_number " int NOT NULL,
    "padding " smallint NOT NULL,
    "separator" varchar NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp NOT NULL,
    "updated_at " timestamp NOT NULL,
    PRIMARY KEY ("series_id")
);

CREATE TABLE "warehouses" (
    "warehouse_id" uuid NOT NULL,
    "name " varchar(120) NOT NULL,
    "department" varchar(100) NOT NULL,
    "province" varchar NOT NULL DEFAULT 100,
    "district" varchar(100) NOT NULL,
    "address" text,
    "is_active" boolean NOT NULL,
    "created_at" timestamp,
    PRIMARY KEY ("warehouse_id")
);

CREATE TABLE "inventory_document_items" (
    "item_id" uuid NOT NULL,
    "doc_id " uuid NOT NULL,
    "variant_id " uuid NOT NULL,
    "from_location_id " uuid NOT NULL,
    "to_location_id " uuid NOT NULL,
    "quantity " integer NOT NULL,
    "unit_cost" numeric(12, 2) NOT NULL,
    PRIMARY KEY ("item_id")
);

CREATE TABLE "product_variants" (
    "variant_id" uuid NOT NULL,
    " product_id" uuid NOT NULL,
    "base_unit_id" uuid,
    "sku" varchar(80) NOT NULL,
    "barcode" varchar(80) NOT NULL,
    " attributes" jsonb NOT NULL,
    -- precio de venta
    "price" decimal(12, 2) NOT NULL,
    -- costo del producto
    -- 
    "cost" decimal(12, 2) NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp NOT NULL,
    PRIMARY KEY ("variant_id")
);
COMMENT ON COLUMN "product_variants"."price" IS 'precio de venta';
COMMENT ON COLUMN "product_variants"."cost" IS 'costo del producto';

CREATE TABLE "warehouse_location" (
    "location_id" uuid NOT NULL,
    "warehouse_id " uuid NOT NULL,
    "code" varchar NOT NULL UNIQUE,
    "description" text NOT NULL,
    "is_active" boolean NOT NULL,
    PRIMARY KEY ("location_id")
);

CREATE TABLE "reorder_rules" (
    "rule_id " uuid NOT NULL,
    "warehouse_id " uuid NOT NULL,
    "variant_id " uuid NOT NULL,
    "min_qty " integer NOT NULL DEFAULT 0,
    "reorder_point " integer NOT NULL DEFAULT 0,
    "max_qty " integer NOT NULL,
    "lead_time_days " integer NOT NULL DEFAULT 0,
    PRIMARY KEY ("rule_id ")
);

CREATE TABLE "public"."product_recipe" (
    "recipe_id" uuid NOT NULL,
    "finished_variant_id" uuid,
    "prima_variant_id" uuid,
    "quantity" int,
    "waste" numeric,
    PRIMARY KEY ("recipe_id")
);

CREATE TABLE "inventory" (
    "warehouse_id " uuid NOT NULL,
    "location_id " uuid NOT NULL,
    "variant_id " uuid NOT NULL,
    "on_hand " integer NOT NULL,
    "reserved" integer NOT NULL,
    "available " integer NOT NULL,
    "updated_at" timestamp NOT NULL
);

CREATE TABLE "public"."production_orders" (
    "production_id" uuid NOT NULL,
    "from_warehouse" uuid,
    "to_warehouse" uuid,
    "serie_id" uuid,
    "correlative" int,
    "status" production_status,
    "reference" varchar,
    "manufacture_time" int,
    "ready_at" timestamptz NOT NULL,
    "created_at" timestamptz,
    "updated_at" timestamptz,
    "created_by" uuid,
    "updated_by" uuid NOT NULL,
    PRIMARY KEY ("production_id")
);

-- Foreign key constraints
-- Schema: public
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "fk_production_orders_serie_id_documents_series_series_id" FOREIGN KEY("serie_id") REFERENCES "public"."documents_series"("series_id");
ALTER TABLE "inventory_documents" ADD CONSTRAINT "fk_inventory_documents_doc_id__inventory_document_items_doc_" FOREIGN KEY("doc_id ") REFERENCES "inventory_document_items"("doc_id ");
ALTER TABLE "warehouse_location" ADD CONSTRAINT "fk_warehouse_location_location_id_inventory_document_items_f" FOREIGN KEY("location_id") REFERENCES "inventory_document_items"("from_location_id ");
ALTER TABLE "warehouse_location" ADD CONSTRAINT "fk_warehouse_location_location_id_inventory_document_items_t" FOREIGN KEY("location_id") REFERENCES "inventory_document_items"("to_location_id ");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_inventory_document_items_vari" FOREIGN KEY("variant_id") REFERENCES "inventory_document_items"("variant_id ");
ALTER TABLE "users" ADD CONSTRAINT "fk_users_user_ID_inventory_documents_created_by_" FOREIGN KEY("user_ID") REFERENCES "inventory_documents"("created_by ");
ALTER TABLE "users" ADD CONSTRAINT "fk_users_user_ID_inventory_documents_posted_by" FOREIGN KEY("user_ID") REFERENCES "inventory_documents"("posted_by");
ALTER TABLE "public"."documents_series" ADD CONSTRAINT "fk_documents_series_series_id_inventory_documents_series_id" FOREIGN KEY("series_id") REFERENCES "inventory_documents"("series_id");
ALTER TABLE "inventory_documents" ADD CONSTRAINT "fk_inventory_documents_doc_id__inventory_ledger_doc_id" FOREIGN KEY("doc_id ") REFERENCES "inventory_ledger"("doc_id");
ALTER TABLE "warehouse_location" ADD CONSTRAINT "fk_warehouse_location_location_id_inventory_ledger_location_" FOREIGN KEY("location_id") REFERENCES "inventory_ledger"("location_id ");
ALTER TABLE "warehouse_location" ADD CONSTRAINT "fk_warehouse_location_location_id_inventory_ledger_location_" FOREIGN KEY("location_id") REFERENCES "inventory_ledger"("location_id ");
ALTER TABLE "warehouse_location" ADD CONSTRAINT "fk_warehouse_location_location_id_inventory_ledger_location_" FOREIGN KEY("location_id") REFERENCES "inventory_ledger"("location_id ");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_inventory_ledger_variant_id_" FOREIGN KEY("variant_id") REFERENCES "inventory_ledger"("variant_id ");
ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_warehouse_id_inventory_ledger_warehouse_id_" FOREIGN KEY("warehouse_id") REFERENCES "inventory_ledger"("warehouse_id ");
ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_warehouse_id_inventory_warehouse_id_" FOREIGN KEY("warehouse_id") REFERENCES "inventory"("warehouse_id ");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_product_recipe_finished_varia" FOREIGN KEY("variant_id") REFERENCES "public"."product_recipe"("finished_variant_id");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_product_recipe_prima_variant_" FOREIGN KEY("variant_id") REFERENCES "public"."product_recipe"("prima_variant_id");
ALTER TABLE "public"."production_order_item" ADD CONSTRAINT "fk_production_order_item_finished_variant_id_product_variant" FOREIGN KEY("finished_variant_id") REFERENCES "product_variants"("variant_id");
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "fk_inventory_ledger_variant_id__product_variants_variant_id" FOREIGN KEY("variant_id ") REFERENCES "product_variants"("variant_id");
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "fk_purchase_order_items_variant_id__product_variants_variant" FOREIGN KEY("variant_id ") REFERENCES "product_variants"("variant_id");
ALTER TABLE "reorder_rules" ADD CONSTRAINT "fk_reorder_rules_variant_id__product_variants_variant_id" FOREIGN KEY("variant_id ") REFERENCES "product_variants"("variant_id");
ALTER TABLE "public"."product_equivalences" ADD CONSTRAINT "fk_product_equivalences_prima_variant_id_product_variants_va" FOREIGN KEY("prima_variant_id") REFERENCES "product_variants"("variant_id");
ALTER TABLE "public"."product_recipe" ADD CONSTRAINT "fk_product_recipe_finished_variant_id_product_variants_varia" FOREIGN KEY("finished_variant_id") REFERENCES "product_variants"("variant_id");
ALTER TABLE "supplier_variants" ADD CONSTRAINT "fk_supplier_variants_variant_id_product_variants_variant_id" FOREIGN KEY("variant_id") REFERENCES "product_variants"("variant_id");
ALTER TABLE "stock_reservations" ADD CONSTRAINT "fk_stock_reservations_variant_id__product_variants_variant_i" FOREIGN KEY("variant_id ") REFERENCES "product_variants"("variant_id");
ALTER TABLE "public"."product_recipe" ADD CONSTRAINT "fk_product_recipe_prima_variant_id_product_variants_variant_" FOREIGN KEY("prima_variant_id") REFERENCES "product_variants"("variant_id");
ALTER TABLE "inventory" ADD CONSTRAINT "fk_inventory_variant_id__product_variants_variant_id" FOREIGN KEY("variant_id ") REFERENCES "product_variants"("variant_id");
ALTER TABLE "public"."production_order_item" ADD CONSTRAINT "fk_production_order_item_production_id_production_orders_pro" FOREIGN KEY("production_id") REFERENCES "public"."production_orders"("production_id");
ALTER TABLE "inventory_documents" ADD CONSTRAINT "fk_inventory_documents_production_id_production_orders_produ" FOREIGN KEY("production_id") REFERENCES "public"."production_orders"("production_id");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants__product_id_products_product_id" FOREIGN KEY(" product_id") REFERENCES "products"("product_id");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "fk_purchase_orders_po_id_purchase_order_items_po_id_" FOREIGN KEY("po_id") REFERENCES "purchase_order_items"("po_id ");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_reorder_rules_variant_id_" FOREIGN KEY("variant_id") REFERENCES "reorder_rules"("variant_id ");
ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_warehouse_id_reorder_rules_warehouse_id_" FOREIGN KEY("warehouse_id") REFERENCES "reorder_rules"("warehouse_id ");
ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_warehouse_id_reorder_rules_warehouse_id_" FOREIGN KEY("warehouse_id") REFERENCES "reorder_rules"("warehouse_id ");
ALTER TABLE "users" ADD CONSTRAINT "fk_users_user_ID_stock_reservations_created_by" FOREIGN KEY("user_ID") REFERENCES "stock_reservations"("created_by");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_stock_reservations_location_i" FOREIGN KEY("variant_id") REFERENCES "stock_reservations"("location_id ");
ALTER TABLE "warehouse_location" ADD CONSTRAINT "fk_warehouse_location_location_id_stock_reservations_locatio" FOREIGN KEY("location_id") REFERENCES "stock_reservations"("location_id ");
ALTER TABLE "warehouse_location" ADD CONSTRAINT "fk_warehouse_location_location_id_stock_reservations_locatio" FOREIGN KEY("location_id") REFERENCES "stock_reservations"("location_id ");
ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_warehouse_id_stock_reservations_warehouse_id_" FOREIGN KEY("warehouse_id") REFERENCES "stock_reservations"("warehouse_id ");
ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_warehouse_id_stock_reservations_warehouse_id_" FOREIGN KEY("warehouse_id") REFERENCES "stock_reservations"("warehouse_id ");
ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_warehouse_id_stock_reservations_warehouse_id_" FOREIGN KEY("warehouse_id") REFERENCES "stock_reservations"("warehouse_id ");
ALTER TABLE "suppliers" ADD CONSTRAINT "fk_suppliers_supplier_id_supplier_variants_supplier_id_" FOREIGN KEY("supplier_id") REFERENCES "supplier_variants"("supplier_id ");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_supplier_variants_variant_id" FOREIGN KEY("variant_id") REFERENCES "supplier_variants"("variant_id");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_supplier_variants_variant_id" FOREIGN KEY("variant_id") REFERENCES "supplier_variants"("variant_id");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_supplier_variants_variant_id" FOREIGN KEY("variant_id") REFERENCES "supplier_variants"("variant_id");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "fk_purchase_orders_supplier_id__suppliers_supplier_id" FOREIGN KEY("supplier_id ") REFERENCES "suppliers"("supplier_id");
ALTER TABLE "public"."units" ADD CONSTRAINT "fk_units_unit_id_product_equivalences_from_unit_id" FOREIGN KEY("unit_id") REFERENCES "public"."product_equivalences"("from_unit_id");
ALTER TABLE "public"."units" ADD CONSTRAINT "fk_units_unit_id_product_equivalences_to_unit_id" FOREIGN KEY("unit_id") REFERENCES "public"."product_equivalences"("to_unit_id");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_product_equivalences_prima_va" FOREIGN KEY("variant_id") REFERENCES "public"."product_equivalences"("prima_variant_id");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_variant_id_product_equivalences_prima_va" FOREIGN KEY("variant_id") REFERENCES "public"."product_equivalences"("prima_variant_id");
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_base_unit_id_units_unit_id" FOREIGN KEY("base_unit_id") REFERENCES "public"."units"("unit_id");
ALTER TABLE "roles" ADD CONSTRAINT "fk_roles_rol_ID_users_rol_ID" FOREIGN KEY("rol_ID") REFERENCES "users"("rol_ID");
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "fk_production_orders_created_by_users_user_ID" FOREIGN KEY("created_by") REFERENCES "users"("user_ID");
ALTER TABLE "stock_reservations" ADD CONSTRAINT "fk_stock_reservations_location_id__warehouse_location_locati" FOREIGN KEY("location_id ") REFERENCES "warehouse_location"("location_id");
ALTER TABLE "inventory" ADD CONSTRAINT "fk_inventory_location_id__warehouse_location_location_id" FOREIGN KEY("location_id ") REFERENCES "warehouse_location"("location_id");
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "fk_inventory_ledger_location_id__warehouse_location_location" FOREIGN KEY("location_id ") REFERENCES "warehouse_location"("location_id");
ALTER TABLE "public"."production_order_item" ADD CONSTRAINT "fk_production_order_item_from_location_id_warehouse_location" FOREIGN KEY("from_location_id") REFERENCES "warehouse_location"("location_id");
ALTER TABLE "reorder_rules" ADD CONSTRAINT "fk_reorder_rules_warehouse_id__warehouses_warehouse_id" FOREIGN KEY("warehouse_id ") REFERENCES "warehouses"("warehouse_id");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "fk_purchase_orders_warehouse_id__warehouses_warehouse_id" FOREIGN KEY("warehouse_id ") REFERENCES "warehouses"("warehouse_id");
ALTER TABLE "warehouse_location" ADD CONSTRAINT "fk_warehouse_location_warehouse_id__warehouses_warehouse_id" FOREIGN KEY("warehouse_id ") REFERENCES "warehouses"("warehouse_id");
ALTER TABLE "inventory_documents" ADD CONSTRAINT "fk_inventory_documents_to_warehouse_id__warehouses_warehouse" FOREIGN KEY("to_warehouse_id ") REFERENCES "warehouses"("warehouse_id");
ALTER TABLE "inventory_documents" ADD CONSTRAINT "fk_inventory_documents_from_warehouse_id__warehouses_warehou" FOREIGN KEY("from_warehouse_id ") REFERENCES "warehouses"("warehouse_id");
ALTER TABLE "stock_reservations" ADD CONSTRAINT "fk_stock_reservations_warehouse_id__warehouses_warehouse_id" FOREIGN KEY("warehouse_id ") REFERENCES "warehouses"("warehouse_id");
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "fk_production_orders_from_warehouse_warehouses_warehouse_id" FOREIGN KEY("from_warehouse") REFERENCES "warehouses"("warehouse_id");
ALTER TABLE "public"."documents_series" ADD CONSTRAINT "fk_documents_series__warehouse_id_warehouses_warehouse_id" FOREIGN KEY(" warehouse_id") REFERENCES "warehouses"("warehouse_id");
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "fk_production_orders_to_warehouse_warehouses_warehouse_id" FOREIGN KEY("to_warehouse") REFERENCES "warehouses"("warehouse_id");