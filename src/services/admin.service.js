import { pool } from "../config/db.js";

/**
 * Helper: tra ve result.row[0].result
 */
const unwrap = (queryResult) => queryResult.rows[0]?.result ?? null;

/**
 * Line
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