import * as adminService from "../services/admin.service.js";


// Line 
export const upsertLine = async (req, res) => {
  try {
    const actor_user_id = req.user.user_id;

    const { code, name, color_hex, state } = req.body;

    const data = await adminService.upsertLine(
      actor_user_id,
      code,
      name,
      color_hex,
      state
    );

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * 2) Ga (Station)
 */
export const upsertStation = async (req, res) => {
  try {
    const actor_user_id = req.user.user_id;

    const {
      code,
      name,
      line_code,
      order_index,
      lat, // có thể null
      lon, // có thể null
    } = req.body;

    const result = await adminService.upsertStation(
      actor_user_id,
      code,
      name,
      line_code,
      order_index,
      lat,
      lon
    );

    return res.json(result);
  } catch (err) {
    console.error("upsertStation error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 3) Đoạn tuyến (Segment)
 */
export const upsertSegment = async (req, res) => {
  try {
    const actor_user_id = req.user.user_id;

    const { line_code, from_station, to_station, travel_min } = req.body;

    const result = await adminService.upsertSegment(
      actor_user_id,
      line_code,
      from_station,
      to_station,
      travel_min
    );

    return res.json(result);
  } catch (err) {
    console.error("upsertSegment error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 4) Cấu hình Fare Rule
 */
export const setActiveFareRule = async (req, res) => {
  try {
    const actor_user_id = req.user.user_id;

    const {
      line_code,
      base_price,
      base_stops,
      step_stops,
      step_price,
    } = req.body;

    const result = await adminService.setActiveFareRule(
      actor_user_id,
      line_code,
      base_price,
      base_stops,
      step_stops,
      step_price
    );

    return res.json(result);
  } catch (err) {
    console.error("setActiveFareRule error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 5) Ticket Product
 */
export const upsertTicketProduct = async (req, res) => {
  try {
    const actor_user_id = req.user.user_id;

    const {
      code,
      name_vi,
      type, // 'single_ride' | 'day_pass' | 'multi_day_pass' | 'monthly_pass'
      price,
      duration_hours,
      auto_activate_after_days,
      state,
    } = req.body;

    const result = await adminService.upsertTicketProduct(
      actor_user_id,
      code,
      name_vi,
      type,
      price,
      duration_hours,
      auto_activate_after_days,
      state
    );

    return res.json(result);
  } catch (err) {
    console.error("upsertTicketProduct error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 6) Khuyến mãi (Promotion)
 */
export const upsertPromotion = async (req, res) => {
  try {
    const actor_user_id = req.user.user_id;

    const {
      code,
      name,
      description,
      promo_type, // 'percent' | 'amount'
      discount_percent,
      discount_amount,
      starts_at,
      ends_at,
      min_order_amount,
      state,
    } = req.body;

    const result = await adminService.upsertPromotion(
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
    );

    return res.json(result);
  } catch (err) {
    console.error("upsertPromotion error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 7) Thông báo (Announcement)
 */
export const upsertAnnouncement = async (req, res) => {
  try {
    const actor_user_id = req.user.user_id;

    const {
      title,
      content_md,
      visible_from,
      visible_to,
      is_active,
      ann_id, // null => insert, có giá trị => update
    } = req.body;

    const result = await adminService.upsertAnnouncement(
      actor_user_id,
      title,
      content_md,
      visible_from,
      visible_to,
      is_active,
      ann_id ?? null
    );

    return res.json(result);
  } catch (err) {
    console.error("upsertAnnouncement error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 8) Báo cáo doanh thu
 *   GET /api/admin/report/sales?from_date=2025-01-01&to_date=2025-01-31
 */
export const reportSales = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const result = await adminService.reportSales(from_date, to_date);

    return res.json(result);
  } catch (err) {
    console.error("reportSales error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/*
 * 9) Báo cáo lưu lượng soát vé
 * GET /api/admin/report/traffic?from_date=...&to_date=...
 */
export const reportTraffic = async (req, res) => {
  try {
    // Lấy from_date, to_date thay vì on_date
    const { from_date, to_date } = req.query;

    // Nếu thiếu thì mặc định lấy hôm nay
    const start = from_date || new Date().toISOString().split('T')[0];
    const end = to_date || new Date().toISOString().split('T')[0];

    const result = await adminService.reportTraffic(start, end);

    return res.json(result);
  } catch (err) {
    console.error("reportTraffic error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 10) Admin xem Audit log
 *   GET /api/admin/audit?from_ts=...&to_ts=...&action=...
 */
export const getAuditLog = async (req, res) => {
  try {
    const { from_ts, to_ts, action } = req.query;

    const result = await adminService.getAuditLog(from_ts, to_ts, action || null);

    return res.json(result);
  } catch (err) {
    console.error("getAuditLog error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 11) Admin xem Payments
 *   GET /api/admin/payments?from_ts=...&to_ts=...&status=SUCCESS
 */
export const getPayments = async (req, res) => {
  try {
    const { from_ts, to_ts, status } = req.query;

    const result = await adminService.getPayments(from_ts, to_ts, status || null);

    return res.json(result);
  } catch (err) {
    console.error("getPayments error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 12)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const data = await adminService.getDashboardStats();
    
    // Tính toán sơ bộ để trả về số tổng cho Frontend đỡ phải tính
    const totalRevenue = data.sales.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalPassengers = data.traffic.reduce((acc, curr) => acc + Number(curr.validations_count), 0);

    res.json({
      success: true,
      data: {
        revenue: totalRevenue,
        passengers: totalPassengers,
        scans: Number(data.totalScans),
        recentLogs: data.recentLogs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 13)
export const reportTicketTypes = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const result = await adminService.reportTicketTypes(from_date, to_date);
    return res.json(result);
  } catch (err) {
    console.error("reportTicketTypes error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// ... (Các hàm khác giữ nguyên)

/**
 * 14) Lấy danh sách khuyến mãi
 */
export const getPromotions = async (req, res) => {
  try {
    // Service đã trả về { ok: true, data: [...] } từ DB
    const result = await adminService.getPromotions(); 
    return res.json(result); // Trả về luôn
  } catch (err) {
    console.error("getPromotions error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 15)
 */
export const getAnnouncements = async (req, res) => {
  try {
    // Service đã trả về { ok: true, data: [...] } từ DB
    const result = await adminService.getAnnouncements();
    return res.json(result); 
  } catch (err) {
    console.error("getAnnouncements error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 16)
 */
export const getFareRules = async (req, res) => {
  try {
    // Service đã trả về object { ok: true, data: [...] }
    const result = await adminService.getFareRules();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 17)
 */
export const getTicketProducts = async (req, res) => {
  try {
    const result = await adminService.getTicketProducts();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 18) Tạo/Cập nhật Giftcode (Admin)
 * POST /api/admin/giftcodes/batch (Tạo mới)
 * PUT /api/admin/giftcodes/:promo_id (Cập nhật)
 */
// ĐÃ ĐỔI TÊN HÀM TỪ createGiftcodeBatch sang upsertGiftcode
export const upsertGiftcode = async (req, res) => {
  try {
    const { 
      promo_id, p_prefix, p_quantity, p_ticket_product_code, 
      p_max_usage, p_starts_at, p_expires_at, p_is_active // <--- Thêm p_expires_at
    } = req.body;

    const result = await adminService.upsertGiftcode(
      promo_id, 
      p_prefix, 
      p_quantity, 
      p_ticket_product_code, 
      p_max_usage, 
      p_starts_at, 
      p_expires_at, // <--- Truyền xuống Service
      p_is_active
    );
    
    let message = "Thao tác thành công.";

    if (result.count) {
        message = `Đã tạo thành công ${result.count} mã giftcode.`;
    } else if (result.promo_id) {
        message = "Cập nhật mã giftcode thành công.";
    }

    return res.json({
      ok: true,
      message: message,
      data: result
    });

  } catch (err) {
    console.error("upsertGiftcode error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * 19) Lấy danh sách Giftcode
 * GET /api/admin/giftcodes
 */
export const getGiftcodes = async (req, res) => {
  try {
    const result = await adminService.getGiftcodes();
    return res.json(result);
  } catch (err) {
    console.error("getGiftcodes error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

export const getAllStations = async (req, res) => {
  try {
    const result = await adminService.getAllStations();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
};

export const deleteStation = async (req, res) => {
  try {
    const actor_user_id = req.user.user_id;
    const { code } = req.params; // Lấy code từ URL
    const result = await adminService.deleteStation(actor_user_id, code);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// Lấy danh sách Feedback
export const getFeedbacks = async (req, res) => {
  try {
    // 👇 SỬA Ở ĐÂY: Gọi qua adminService thay vì dùng pool.query
    const result = await adminService.getFeedbacks();
    
    // Kiểm tra kết quả trả về
    if (result && result.success) {
        return res.json(result.data); // Trả về mảng data
    }
    return res.json([]); // Nếu không có dữ liệu trả về mảng rỗng
  } catch (err) {
    console.error("Lỗi getFeedbacks:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};