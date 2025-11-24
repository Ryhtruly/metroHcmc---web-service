import { pool } from "../config/db.js";

/**
 * Helper: tra ve result.row[0].result
 */
const unwrap = (queryResult) => queryResult.rows[0]?.result ?? null;

/**
 * Line
 */

/**
 * @swagger
 * /api/admin/lines:
 *   post:
 *     summary: Create or update a Metro line
 *     description: Upsert a Metro line (code, name, color, state). Requires admin permission.
 *     tags: [Admin - Lines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, color_hex, state]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "L1"
 *               name:
 *                 type: string
 *                 example: "Line 1"
 *               color_hex:
 *                 type: string
 *                 example: "#003eb3"
 *               state:
 *                 type: string
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Successfully created or updated
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               data:
 *                 code: "L1"
 *                 name: "Line 1"
 *                 color_hex: "#003eb3"
 *                 state: "active"
 *       500:
 *         description: Server error
 */
export const upsertLine = async(actor_user_id, code, line_name, color_hex, state) => {
    const result = await pool.query(
        `select api.fn_admin_upsert_line_json($1, $2, $3, $4, $5) AS result`, 
        [actor_user_id, code, line_name, color_hex, state]
    );

    return unwrap(result);
}

/**
 * Station
 */
/**
 * @swagger
 * /api/admin/stations:
 *   post:
 *     summary: Create or update a station
 *     description: Insert or update a station belonging to a Metro line.
 *     tags: [Admin - Stations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, line_code, order_index]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "L1-03"
 *               name:
 *                 type: string
 *                 example: "Suoi Tien"
 *               line_code:
 *                 type: string
 *                 example: "L1"
 *               order_index:
 *                 type: integer
 *                 example: 3
 *               lat:
 *                 type: number
 *                 nullable: true
 *                 example: 10.12345
 *               lon:
 *                 type: number
 *                 nullable: true
 *                 example: 106.12345
 *     responses:
 *       200:
 *         description: Successfully upserted
 *       500:
 *         description: Server error
 */
export const upsertStation = async(actor_user_id, code, name, line_code, order_index, lat, lon) => {
    const result = await pool.query(
        `SELECT api.fn_admin_upsert_station_json($1, $2, $3, $4, $5, $6, $7) AS result`, // Thêm câu lệnh SQL
        [actor_user_id, code, name, line_code, order_index, lat, lon] // Gom tham số vào mảng
    );
    return unwrap(result);
}

/**
 * 3) Đoạn tuyến (Segment)
 */
/**
 * @swagger
 * /api/admin/segments:
 *   post:
 *     summary: Create or update a track segment between two stations
 *     tags: [Admin - Segments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [line_code, from_station, to_station, travel_min]
 *             properties:
 *               line_code:
 *                 type: string
 *               from_station:
 *                 type: string
 *               to_station:
 *                 type: string
 *               travel_min:
 *                 type: integer
 *                 example: 4
 *     responses:
 *       200:
 *         description: Segment updated
 *       500:
 *         description: Server error
 */
export const upsertSegment = async (
  actor_user_id,
  line_code,
  from_station,
  to_station,
  travel_min
) => {
  const result = await pool.query(
    `SELECT api.fn_admin_upsert_segment_json($1,$2,$3,$4,$5) AS result`,
    [actor_user_id, line_code, from_station, to_station, travel_min]
  );
  return unwrap(result);
};

/**
 * 4) Cấu hình Fare Rule
 */
/**
 * @swagger
 * /api/admin/fare-rules:
 *   post:
 *     summary: Configure fare rule for a line
 *     tags: [Admin - Fare Rules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [line_code, base_price, base_stops, step_stops, step_price]
 *             properties:
 *               line_code:
 *                 type: string
 *               base_price:
 *                 type: number
 *               base_stops:
 *                 type: integer
 *               step_stops:
 *                 type: integer
 *               step_price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Fare rule updated
 */
export const setActiveFareRule = async (
  actor_user_id,
  line_code,
  base_price,
  base_stops,
  step_stops,
  step_price
) => {
  const result = await pool.query(
    `SELECT api.fn_admin_set_active_fare_rule_json($1,$2,$3,$4,$5,$6) AS result`,
    [
      actor_user_id,
      line_code,
      base_price,
      base_stops,
      step_stops,
      step_price,
    ]
  );
  return unwrap(result);
};

/**
 * 5) Ticket Product
 */
/**
 * @swagger
 * /api/admin/ticket-products:
 *   post:
 *     summary: Create or update a ticket product
 *     tags: [Admin - Ticket Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name_vi, type, state]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "L1_DAY_1"
 *               name_vi:
 *                 type: string
 *                 example: "Vé ngày"
 *               type:
 *                 type: string
 *                 enum: [single_ride, day_pass, multi_day_pass, monthly_pass]
 *               price:
 *                 type: number
 *                 nullable: true
 *               duration_hours:
 *                 type: number
 *               auto_activate_after_days:
 *                 type: number
 *               state:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated
 */
export const upsertTicketProduct = async (
  actor_user_id,
  code,
  name_vi,
  type,
  price,
  duration_hours,
  auto_activate_after_days,
  state
) => {
  const result = await pool.query(
    `SELECT api.fn_admin_upsert_ticket_product_json($1,$2,$3,$4,$5,$6,$7,$8) AS result`,
    [
      actor_user_id,
      code,
      name_vi,
      type,
      price,
      duration_hours,
      auto_activate_after_days,
      state,
    ]
  );
  return unwrap(result);
};

/**
 * 6) Khuyến mãi (Promotion)
 */
/**
 * @swagger
 * /api/admin/promotions:
 *   post:
 *     summary: Create or update a promotion
 *     tags: [Admin - Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               promo_type:
 *                 type: string
 *                 enum: [percent, amount]
 *               discount_percent:
 *                 type: number
 *               discount_amount:
 *                 type: number
 *               starts_at:
 *                 type: string
 *                 format: date-time
 *               ends_at:
 *                 type: string
 *                 format: date-time
 *               min_order_amount:
 *                 type: number
 *               state:
 *                 type: string
 *     responses:
 *       200:
 *         description: Promotion saved
 */
export const upsertPromotion = async (
  actor_user_id,
  code,
  name,
  description,
  promo_type,
  discount_percent,
  discount_amount,
  starts_at,
  ends_at,
  min_order_amount,
  state
) => {
  const result = await pool.query(
    `SELECT api.fn_admin_upsert_promotion_json($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS result`,
    [
      actor_user_id,
      code,
      name,
      description,
      promo_type,
      discount_percent,
      discount_amount,
      starts_at,
      ends_at,
      min_order_amount,
      state,
    ]
  );
  return unwrap(result);
};

/**
 * 7) Thông báo (Announcement)
 */
/**
 * @swagger
 * /api/admin/announcements:
 *   post:
 *     summary: Create or update an announcement
 *     tags: [Admin - Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content_md:
 *                 type: string
 *               visible_from:
 *                 type: string
 *                 format: date-time
 *               visible_to:
 *                 type: string
 *                 format: date-time
 *               is_active:
 *                 type: boolean
 *               ann_id:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Announcement saved
 */
export const upsertAnnouncement = async (
  actor_user_id,
  title,
  content_md,
  visible_from,
  visible_to,
  is_active,
  ann_id // có thể null
) => {
  const result = await pool.query(
    `SELECT api.fn_admin_upsert_announcement_json($1,$2,$3,$4,$5,$6,$7) AS result`,
    [
      actor_user_id,
      title,
      content_md,
      visible_from,
      visible_to,
      is_active,
      ann_id,
    ]
  );
  return unwrap(result);
};

/**
 * 8) Báo cáo doanh thu
 */
/**
 * @swagger
 * /api/admin/report/sales:
 *   get:
 *     summary: Get revenue report
 *     tags: [Admin - Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Revenue statistics
 */
export const reportSales = async (from_date, to_date) => {
  const result = await pool.query(
    `SELECT api.fn_report_sales_json($1,$2) AS result`,
    [from_date, to_date]
  );
  return unwrap(result);
};

/**
 * 9) Báo cáo lưu lượng
 */
/**
 * @swagger
 * /api/admin/report/ticket-types:
 *   get:
 *     summary: Ticket type distribution
 *     tags: [Admin - Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket type ratio
 */
export const reportTraffic = async (on_date) => {
  const result = await pool.query(
    `SELECT api.fn_report_traffic_json($1) AS result`,
    [on_date]
  );
  return unwrap(result);
};

/**
 * 10) Audit log
 */
/**
 * @swagger
 * /api/admin/audit:
 *   get:
 *     summary: View audit logs
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_ts
 *         schema:
 *           type: string
 *       - in: query
 *         name: to_ts
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log list
 */
export const getAuditLog = async (from_ts, to_ts, action_filter) => {
  const result = await pool.query(
    `SELECT api.fn_admin_get_audit_json($1,$2,$3) AS result`,
    [from_ts, to_ts, action_filter]
  );
  return unwrap(result);
};

/**
 * 11) Payments
 */
/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: View payments
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: from_ts
 *         in: query
 *         schema:
 *           type: string
 *       - name: to_ts
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           example: SUCCESS
 *     responses:
 *       200:
 *         description: Payment list
 */
export const getPayments = async (from_ts, to_ts, status_filter) => {
  const result = await pool.query(
    `SELECT api.fn_admin_get_payments_json($1,$2,$3) AS result`,
    [from_ts, to_ts, status_filter]
  );
  return unwrap(result);
};



export const getDashboardStats = async () => {
  // Gọi song song các hàm báo cáo có sẵn để lấy số liệu
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  // 1. Doanh thu tháng này
  const salesRes = await pool.query(
    `SELECT api.fn_report_sales_json($1, $2) AS result`,
    [firstDayOfMonth, today]
  );
  
  // 2. Lượt khách hôm nay
  const trafficRes = await pool.query(
    `SELECT api.fn_report_traffic_json($1) AS result`,
    [today]
  );

  // 3. Tổng vé đã quét (Đếm trong bảng validations)
  // (Hoặc có thể viết thêm hàm SQL riêng, ở đây query trực tiếp cho nhanh)
  const scanRes = await pool.query(`SELECT COUNT(*) FROM validations`);

  // 4. Hoạt động gần đây (Lấy 5 dòng audit log mới nhất)
  const auditRes = await pool.query(
    `SELECT api.fn_admin_get_audit_json($1, $2, NULL) AS result`,
    [firstDayOfMonth, new Date().toISOString()] // Lấy tạm trong tháng
  );

  return {
    sales: salesRes.rows[0]?.result?.rows || [],
    traffic: trafficRes.rows[0]?.result?.rows || [],
    totalScans: scanRes.rows[0]?.count || 0,
    recentLogs: auditRes.rows[0]?.result?.logs?.slice(0, 5) || [] // Lấy 5 dòng đầu
  };
};

// ...
/**
 * 12) Báo cáo tỷ lệ vé
 */
export const reportTicketTypes = async (from_date, to_date) => {
  const result = await pool.query(
    `SELECT api.fn_report_ticket_types_json($1, $2) AS result`,
    [from_date, to_date]
  );
  return unwrap(result);
};

/**
 * 13) Lấy danh sách khuyến mãi (Đã chuẩn hóa)
 */
export const getPromotions = async () => {
  // Gọi hàm trong DB thay vì viết SELECT *
  const result = await pool.query(
    `SELECT api.fn_admin_get_promotions_json() AS result`
  );
  return unwrap(result);
};
/**
 * 16) Lấy danh sách thông báo (Đã chuẩn hóa gọi hàm DB)
 */
export const getAnnouncements = async () => {
  // Gọi hàm SQL vừa tạo
  const result = await pool.query(
    `SELECT api.fn_admin_get_announcements_json() AS result`
  );
  return unwrap(result);
};

export const getFareRules = async () => {
  const result = await pool.query(
    `SELECT api.fn_admin_get_fare_rules_json() AS result`
  );
  return unwrap(result);
};

/**
 * 15) Lấy Ticket Products (Dùng hàm SQL)
 */
export const getTicketProducts = async () => {
  const result = await pool.query(
    `SELECT api.fn_admin_get_ticket_products_json() AS result`
  );
  return unwrap(result);
};