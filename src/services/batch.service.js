import cron from "node-cron";
import { pool } from "../config/db.js";

const _runActivationJob = async () => {
  console.log("[BATCH] Running: Tác vụ tự động kích hoạt vé...");
  try {
    const { rows } = await pool.query(
      "SELECT * FROM batch.fn_auto_activate_due_json()"
    );
    console.log(
      "[BATCH] Success (Activate):",
      rows[0].fn_auto_activate_due_json
    );
  } catch (err) {
    console.error("[BATCH] Error (Activate):", err.message);
  }
};

const _runExpirationJob = async () => {
  console.log("[BATCH] Running: Tác vụ tự động hết hạn vé...");
  try {
    const { rows } = await pool.query(
      "SELECT * FROM batch.fn_expire_passes_due()"
    );
    console.log(
      `[BATCH] Success (Expire): ${rows[0].fn_expire_passes_due} vé đã hết hạn.`
    );
  } catch (err) {
    console.error("[BATCH] Error (Expire):", err.message);
  }
};

const cleanupUnpaidTickets = async () => {
  console.log("[BATCH] Running: Dọn dẹp vé chưa thanh toán quá hạn...");
  try {
    const { rows } = await pool.query(
      "SELECT batch.fn_cleanup_unpaid_tickets() as result"
    );

    const result = rows[0].result;
    if (result.cleaned_count > 0) {
      console.log(
        `[CRON] Thành công: Đã hủy ${result.cleaned_count} giao dịch/vé quá hạn.`
      );
    } else {
      console.log("[CRON] Không có giao dịch nào cần xử lý.");
    }

    return { success: true, count: result.cleaned_count };
  } catch (error) {
    console.error("[CRON] Lỗi khi dọn vé rác:", error.message);
    return { success: false, error: error.message };
  }
};

export const startBatchJobs = () => {
  console.log("Batch jobs starting...");

  cron.schedule("* * * * *", _runActivationJob, {
    timezone: "Asia/Ho_Chi_Minh",
  });

  cron.schedule("* * * * *", _runExpirationJob, {
    timezone: "Asia/Ho_Chi_Minh",
  });

  cron.schedule("0 */12 * * *", cleanupUnpaidTickets, {
    timezone: "Asia/Ho_Chi_Minh",
  });
};
