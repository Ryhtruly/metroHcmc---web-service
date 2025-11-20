import crypto from 'crypto';
import { paymentService } from '../services/payment.service.js';
import { payos } from '../config/payos.js';

const CLIENT_URL = process.env.CLIENT_APP_URL || 'http://localhost:3001';

const createPaymentRequest = async (req, res) => {
  try {
    const { ticket_id, method = 'PAYOS' } = req.body; // Lấy ticket_id từ body
    // Không lấy 'amount' từ client, mà sẽ lấy từ DB thông qua ticket_id để tránh client giả mạo số tiền

    // 1. Lấy thông tin vé 
    const ticketResponse = await paymentService.getTicketDetails(ticket_id);

    if (ticketResponse.error) {
      return res.status(404).json({ success: false, message: ticketResponse.error });
    }
    const ticketDetails = ticketResponse.data;

    if (ticketDetails.status !== 'NEW') {
      return res.status(400).json({ success: false, message: 'Vé đã được thanh toán hoặc không ở trạng thái MỚI.' });
    }
    
    // Lấy giá an toàn từ DB
    const amount = ticketDetails.final_price;

    // 2. Tạo bản ghi thanh toán PENDING trong DB
    const dbResponse = await paymentService.createPayment(ticket_id, method, amount);
    
    if (!dbResponse.success) {
      return res.status(400).json(dbResponse);
    }

    const payment_id = dbResponse.payment.payment_id; 
    const orderCode = parseInt(payment_id); 

    // 3. Tạo link thanh toán PayOS
    const description = `Thanh toan ve Metro HCM ${ticket_id}`;
    const returnUrl = `${CLIENT_URL}/payment/success?orderCode=${orderCode}`;
    const cancelUrl = `${CLIENT_URL}/payment/cancel?orderCode=${orderCode}`;

    const link = await payos.paymentRequests.create({
      orderCode,
      amount: Number(amount),
      description,
      returnUrl,
      cancelUrl,
    });

    res.status(201).json({
      success: true,
      provider: 'payos',
      orderCode,
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const confirmPaymentWebhook = async (req, res) => {
  try {
    const body = req.body || {};
    const orderCodeStr = String(body?.data?.orderCode ?? body?.orderCode ?? "");
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!orderCodeStr) {
      return res.status(200).json({ ok: true }); // Ping từ PayOS
    }

    // 1. Xác thực chữ ký (Signature) 
    let isValid = false;
    try {
      // Thử bằng SDK
      isValid = payos.verifyPaymentWebhookData(body) === true;
    } catch (sdkError) {
      isValid = false;
    }

    if (!isValid) {
      // Fallback: Thử xác thực thủ công 
      try {
        const data = body?.data ?? {};
        const signature = String(body?.signature || "");
        
        const ordered = Object.keys(data).sort().reduce((acc, k) => {
          let v = (data)[k];
          if (Array.isArray(v)) {
            v = JSON.stringify(v.map((o) =>
              Object.keys(o || {}).sort().reduce((oo, kk) => (oo[kk] = (o)[kk], oo), {})
            ));
          } else if (v == null || v === "null" || v === "undefined") {
            v = "";
          }
          acc[k] = v;
          return acc;
        }, {});

        const dataQueryStr = Object.keys(ordered)
          .map((k) => `${k}=${ordered[k]}`)
          .join("&");

        const computed = crypto.createHmac("sha256", checksumKey).update(dataQueryStr).digest("hex");
        isValid = computed === signature;
      } catch (manualError) {
        isValid = false;
      }
    }

    if (!isValid) {
      console.error('[PayOS Webhook] Invalid signature for order:', orderCodeStr);
      return res.status(400).json({ ok: false, error: "Invalid signature" });
    }

    // 2. Chữ ký HỢP LỆ, kiểm tra trạng thái thanh toán
    const paidOK =
      body?.code === "00" ||
      String(body?.data?.status ?? "").toUpperCase() === "PAID" ||
      String(body?.data?.status ?? "").toUpperCase() === "SUCCEEDED";

    const failed =
      String(body?.data?.status ?? "").toUpperCase() === "FAILED" ||
      String(body?.data?.status ?? "").toUpperCase() === "CANCELLED";

    const payment_id = parseInt(orderCodeStr); // orderCode là payment_id

    if (paidOK) {
      // 3. Gọi hàm DB để cập nhật status PENDING -> SUCCESS
      const dbResponse = await paymentService.confirmPayment(payment_id);
      
      if (!dbResponse.success) {
         console.warn(`[PayOS Webhook] DB confirm failed for ${payment_id}:`, dbResponse.message);
      } else {
         console.log(`[PayOS Webhook] Payment ${payment_id} confirmed in DB.`);
      }
      
    } else if (failed) {
      // (Optional) có thể tạo 1 hàm DB fn_fail_payment_json
      // để cập nhật status PENDING -> FAILED
      console.warn(`[PayOS Webhook] Payment ${payment_id} FAILED or CANCELLED.`);
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[PayOS Webhook] Fatal Error:', err.message);
    return res.status(200).json({ ok: true, error: "Internal processing error" });
  }
};

// Demo thanh toán
const createPaymentDemo = async (req, res) => {
  try {
    const { ticket_id, method = 'DEMO' } = req.body;
    // 1, Lấy thông tin vé
    const ticketResponse = await paymentService.getTicketDetails(ticket_id);

    if (ticketResponse.error) {
      return res.status(404).json({ success: false, message: ticketResponse.error });
    }
    
    const ticketDetails = ticketResponse.data;
    if (ticketDetails.status !== 'NEW') {
      return res.status(400).json({ success: false, message: 'Vé đã được thanh toán hoặc không ở trạng thái MỚI.' });
    }
    
    const amount = ticketDetails.final_price;
    
    // 2. Tạo PENDING payment
    const createResponse = await paymentService.createPayment(ticket_id, method, amount);
    if (!createResponse.success) {
      return res.status(400).json(createResponse);
    }
    
    const payment_id = createResponse.payment.payment_id;

    // 3. "Finalize" ngay lập tức: Cập nhật PENDING -> SUCCESS
    const confirmResponse = await paymentService.confirmPayment(payment_id);
    if (!confirmResponse.success) {
      return res.status(500).json(confirmResponse); 
    }
    
    res.status(201).json({
      success: true,
      provider: 'demo',
      orderCode: payment_id,
      message: "Demo payment succeeded. Vé đã sẵn sàng.",
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const paymentController = {
  createPaymentRequest,
  confirmPaymentWebhook,
  createPaymentDemo, 
};