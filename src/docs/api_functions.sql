--
-- PostgreSQL database dump
--

\restrict HLaMyqJw9NxJFqkIchWU05aPggjNUbkuprDeMNYXpVSPqT1O0hueqjLpLce8IiI

-- Dumped from database version 18.0 (Ubuntu 18.0-1.pgdg24.04+3)
-- Dumped by pg_dump version 18.0 (Ubuntu 18.0-1.pgdg24.04+3)

-- Started on 2025-11-23 09:42:32 +07

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 9 (class 2615 OID 31959)
-- Name: api; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA api;


ALTER SCHEMA api OWNER TO postgres;

--
-- TOC entry 3620 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA api; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA api IS 'Chứa các hàm đầu cuối (endpoint) cho Web Service (trả JSON)';


--
-- TOC entry 320 (class 1255 OID 32503)
-- Name: fn_activate_or_use_ticket_json(text, text, uuid, boolean); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_activate_or_use_ticket_json(p_qr_code text, p_station_code text, p_actor_user uuid DEFAULT NULL::uuid, p_is_auto boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_product ticket_products%ROWTYPE;
  v_payment_status pay_status;
  v_scan_time TIMESTAMPTZ := now();
  v_action_type TEXT;
  v_validation_note TEXT;
  v_response JSONB;
BEGIN
-- 1. Lấy thông tin vé và sản phẩm
 SELECT * INTO v_ticket
 FROM tickets t
 WHERE t.qr_code = p_qr_code;

 IF NOT FOUND THEN
   RETURN jsonb_build_object('success', FALSE, 'message', 'QR Code không hợp lệ hoặc không tìm thấy vé.');
 END IF;
 
 SELECT * INTO v_product
 FROM ticket_products p
 WHERE p.code = v_ticket.product_code;

 IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Không tìm thấy thông tin sản phẩm của vé.');
 END IF;

  -- 2. Kiểm tra thanh toán (trừ khi là auto-activate)
  IF NOT p_is_auto THEN
    SELECT status INTO v_payment_status
    FROM payments
    WHERE ticket_id = v_ticket.ticket_id AND status = 'SUCCESS'
    LIMIT 1;

    IF v_payment_status IS NULL THEN
      RETURN jsonb_build_object('success', FALSE, 'status', 'UNPAID', 'message', 'Vé chưa được thanh toán.');
    END IF;
  END IF;

  -- 3. Xử lý logic (State Machine)
  CASE v_ticket.status
    WHEN 'NEW' THEN
      -- Lần quét đầu tiên: Kích hoạt vé
      IF v_product.type = 'single_ride' THEN
        -- Vé lượt: Kích hoạt và SỬ DỤNG ngay lập tức
        UPDATE tickets
        SET status = 'USED', valid_from = v_scan_time -- Trigger (internal.tickets_set_used_at) sẽ set used_at
        WHERE ticket_id = v_ticket.ticket_id;
        
        v_action_type := 'USE_SINGLE_RIDE';
        v_validation_note := 'Sử dụng vé lượt';
        v_response := jsonb_build_object('success', TRUE, 'status', 'USED', 'message', 'Vé lượt đã được sử dụng.');

      ELSE
        -- Vé pass (ngày, tháng...): KÍCH HOẠT
        UPDATE tickets
        SET status = 'ACTIVE',
            valid_from = v_scan_time,
            valid_to = v_scan_time + (v_product.duration_hours || ' hours')::interval
        WHERE ticket_id = v_ticket.ticket_id;
        
        IF p_is_auto THEN
          v_action_type := 'AUTO_ACTIVATE_PASS';
          v_validation_note := 'Tự động kích hoạt vé pass';
          v_response := jsonb_build_object('success', TRUE, 'status', 'ACTIVE', 'message', 'Vé pass đã được tự động kích hoạt.');
        ELSE
          v_action_type := 'ACTIVATE_PASS';
          v_validation_note := 'Kích hoạt vé pass';
          v_response := jsonb_build_object('success', TRUE, 'status', 'ACTIVE', 'message', 'Vé pass đã được kích hoạt.');
        END IF;
      END IF;

    WHEN 'ACTIVE' THEN
      -- Vé đang trong thời hạn sử dụng (chắc chắn là vé pass)
      -- GỌI HÀM HELPER: internal.fn_is_ticket_in_effect
      IF internal.fn_is_ticket_in_effect(v_ticket.ticket_id, v_scan_time) THEN
        v_action_type := 'VALIDATE_PASS';
        v_validation_note := 'Quét vé pass hợp lệ';
        v_response := jsonb_build_object('success', TRUE, 'status', 'ACTIVE', 'message', 'Vé pass hợp lệ.');
      ELSE
        -- Vé đã hết hạn
        UPDATE tickets SET status = 'EXPIRED' WHERE ticket_id = v_ticket.ticket_id;
        v_action_type := 'VALIDATE_EXPIRED_PASS';
        v_validation_note := 'Quét vé pass đã hết hạn';
        v_response := jsonb_build_object('success', FALSE, 'status', 'EXPIRED', 'message', 'Vé pass đã hết hạn.');
      END IF;

    WHEN 'USED' THEN
      v_response := jsonb_build_object('success', FALSE, 'status', 'USED', 'message', 'Vé này đã được sử dụng.');
    WHEN 'EXPIRED' THEN
      v_response := jsonb_build_object('success', FALSE, 'status', 'EXPIRED', 'message', 'Vé này đã hết hạn.');
    WHEN 'CANCELLED' THEN
      v_response := jsonb_build_object('success', FALSE, 'status', 'CANCELLED', 'message', 'Vé này đã bị huỷ.');
  END CASE;

  -- 4. Ghi log
  IF v_action_type IS NOT NULL AND NOT p_is_auto THEN
    INSERT INTO validations (ticket_id, station_code, validated_by, validated_at, note)
    VALUES (v_ticket.ticket_id, p_station_code, p_actor_user, v_scan_time, v_validation_note);
  END IF;
  
  IF v_action_type IS NOT NULL THEN
    INSERT INTO audit_log (actor_user, action, object_type, object_id, payload_json)
    VALUES (p_actor_user, v_action_type, 'ticket', v_ticket.ticket_id::text, jsonb_build_object('station', p_station_code, 'is_auto', p_is_auto));
  END IF;

  RETURN v_response;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION api.fn_activate_or_use_ticket_json(p_qr_code text, p_station_code text, p_actor_user uuid, p_is_auto boolean) OWNER TO postgres;

--
-- TOC entry 340 (class 1255 OID 32526)
-- Name: fn_admin_get_announcements_json(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_get_announcements_json() RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_data JSON;
BEGIN
  -- Lấy dữ liệu và chuyển thành mảng JSON
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
  INTO v_data
  FROM (
    SELECT * FROM announcements 
    ORDER BY created_at DESC
  ) t;

  -- Trả về cấu trúc chuẩn
  RETURN json_build_object(
    'ok', TRUE, 
    'data', v_data
  );
END;
$$;


ALTER FUNCTION api.fn_admin_get_announcements_json() OWNER TO postgres;

--
-- TOC entry 339 (class 1255 OID 32522)
-- Name: fn_admin_get_audit_json(timestamp with time zone, timestamp with time zone, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_get_audit_json(p_from_ts timestamp with time zone, p_to_ts timestamp with time zone, p_action_filter text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_rows JSON;
BEGIN
  -- Validate time range
  IF p_from_ts IS NULL OR p_to_ts IS NULL THEN
    RETURN json_build_object('ok', FALSE,
      'error', json_build_object(
        'code','INVALID_TIME_RANGE',
        'message','from_ts and to_ts are required'
      ));
  END IF;

  IF p_from_ts > p_to_ts THEN
    RETURN json_build_object('ok', FALSE,
      'error', json_build_object(
        'code','INVALID_RANGE',
        'message','from_ts must be <= to_ts'
      ));
  END IF;

  -- Query logs (Sửa: Bỏ validate action_filter vì nó có thể tốn kém và không cần thiết)
  SELECT COALESCE(json_agg(
    json_build_object(
      'log_id', log_id,
      'actor_user', actor_user,
      'action', action,
      'object_type', object_type,
      'object_id', object_id,
      'payload', payload_json,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::JSON)
  INTO v_rows
  FROM audit_log
  WHERE created_at BETWEEN p_from_ts AND p_to_ts
    AND (p_action_filter IS NULL OR action = p_action_filter);

  RETURN json_build_object('ok', TRUE,
    'data', json_build_object(
      'logs', v_rows
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_get_audit_json(p_from_ts timestamp with time zone, p_to_ts timestamp with time zone, p_action_filter text) OWNER TO postgres;

--
-- TOC entry 250 (class 1255 OID 32528)
-- Name: fn_admin_get_fare_rules_json(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_get_fare_rules_json() RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_data JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
  INTO v_data
  FROM (
    SELECT * FROM fare_rules 
    ORDER BY state DESC
  ) t;

  RETURN json_build_object('ok', TRUE, 'data', v_data);
END;
$$;


ALTER FUNCTION api.fn_admin_get_fare_rules_json() OWNER TO postgres;

--
-- TOC entry 343 (class 1255 OID 32523)
-- Name: fn_admin_get_payments_json(timestamp with time zone, timestamp with time zone, public.pay_status); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_get_payments_json(p_from_ts timestamp with time zone, p_to_ts timestamp with time zone, p_status_filter public.pay_status DEFAULT NULL::public.pay_status) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_rows JSON;
BEGIN
  -- Validate timestamps
  IF p_from_ts IS NULL OR p_to_ts IS NULL THEN
    RETURN json_build_object('ok', FALSE,
      'error', json_build_object(
        'code', 'INVALID_TIME_RANGE',
        'message', 'from_ts and to_ts are required'
      ));
  END IF;

  IF p_from_ts > p_to_ts THEN
    RETURN json_build_object('ok', FALSE,
      'error', json_build_object(
        'code', 'INVALID_RANGE',
        'message', 'from_ts must be <= to_ts'
      ));
  END IF;

  -- Query payments (Sửa: Bỏ validate status_filter)
  SELECT COALESCE(json_agg(
    json_build_object(
      'payment_id', payment_id,
      'ticket_id', ticket_id,
      'amount', amount,
      'method', method,
      'status', status,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::JSON)
  INTO v_rows
  FROM payments
  WHERE created_at BETWEEN p_from_ts AND p_to_ts
    AND (p_status_filter IS NULL OR status = p_status_filter);

  RETURN json_build_object('ok', TRUE,
    'data', json_build_object(
      'payments', v_rows
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_get_payments_json(p_from_ts timestamp with time zone, p_to_ts timestamp with time zone, p_status_filter public.pay_status) OWNER TO postgres;

--
-- TOC entry 333 (class 1255 OID 32525)
-- Name: fn_admin_get_promotions_json(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_get_promotions_json() RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_data JSON;
BEGIN
  -- Lấy dữ liệu và chuyển thành mảng JSON
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
  INTO v_data
  FROM (
    SELECT * FROM promotions 
    ORDER BY created_at DESC
  ) t;

  -- Trả về cấu trúc chuẩn
  RETURN json_build_object(
    'ok', TRUE, 
    'data', v_data
  );
END;
$$;


ALTER FUNCTION api.fn_admin_get_promotions_json() OWNER TO postgres;

--
-- TOC entry 341 (class 1255 OID 32527)
-- Name: fn_admin_get_ticket_products_json(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_get_ticket_products_json() RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_data JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
  INTO v_data
  FROM (
    SELECT * FROM ticket_products 
    -- Sắp xếp: Vé có giá lên trước, vé null giá (Single) xuống dưới hoặc tùy ý
    ORDER BY price ASC NULLS FIRST
  ) t;

  RETURN json_build_object('ok', TRUE, 'data', v_data);
END;
$$;


ALTER FUNCTION api.fn_admin_get_ticket_products_json() OWNER TO postgres;

--
-- TOC entry 331 (class 1255 OID 32516)
-- Name: fn_admin_set_active_fare_rule_json(uuid, text, numeric, integer, integer, numeric); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_set_active_fare_rule_json(p_actor_user_id uuid, p_line_code text, p_base_price numeric, p_base_stops integer, p_step_stops integer, p_step_price numeric) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_rule fare_rules%ROWTYPE;
BEGIN
  -- Validate line_code
  IF p_line_code IS NULL OR trim(p_line_code) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_LINE','message','line_code required'));
  END IF;

  -- Check line exists
  PERFORM 1 FROM lines WHERE code = p_line_code;
  IF NOT FOUND THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','LINE_NOT_FOUND','message','line_code does not exist'));
  END IF;

  -- Validate prices & stops
  IF p_base_price IS NULL OR p_base_price <= 0 THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_BASE_PRICE','message','base_price must be > 0'));
  END IF;

  IF p_base_stops IS NULL OR p_base_stops <= 0 THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_BASE_STOPS','message','base_stops must be > 0'));
  END IF;

  IF p_step_stops IS NULL OR p_step_stops <= 0 THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_STEP_STOPS','message','step_stops must be > 0'));
  END IF;

  IF p_step_price IS NULL OR p_step_price < 0 THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_STEP_PRICE','message','step_price must be >= 0'));
  END IF;

  -- Disable previous active fare rules
  UPDATE fare_rules
     SET state = FALSE
   WHERE line_code = p_line_code
     AND state = TRUE;

  -- Insert new fare rule
  INSERT INTO fare_rules(
    line_code, base_price, base_stops,
    step_stops, step_price, state
  )
  VALUES(
    p_line_code, p_base_price, p_base_stops,
    p_step_stops, p_step_price, TRUE
  )
  RETURNING * INTO v_rule;

  -- Audit log (ĐÃ SỬA: Ghi lại actor_user)
  INSERT INTO audit_log(actor_user, action, object_type, object_id, payload_json)
  VALUES (
    p_actor_user_id,
    'ADMIN_UPSERT_FARE_RULE',
    'FARE_RULE',
    v_rule.line_code,
    to_jsonb(v_rule)
  );

  RETURN json_build_object('ok',TRUE,
    'data', json_build_object('fare_rule', row_to_json(v_rule)));

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok',FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_set_active_fare_rule_json(p_actor_user_id uuid, p_line_code text, p_base_price numeric, p_base_stops integer, p_step_stops integer, p_step_price numeric) OWNER TO postgres;

--
-- TOC entry 336 (class 1255 OID 32519)
-- Name: fn_admin_upsert_announcement_json(uuid, text, text, timestamp with time zone, timestamp with time zone, boolean, integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_upsert_announcement_json(p_actor_user_id uuid, p_title text, p_content_md text, p_visible_from timestamp with time zone, p_visible_to timestamp with time zone, p_is_active boolean, p_ann_id integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_ann announcements%ROWTYPE;
BEGIN
  -- Validate title
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_TITLE','message','title is required'));
  END IF;

  -- Validate content
  IF p_content_md IS NULL OR trim(p_content_md) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_CONTENT','message','content_md is required'));
  END IF;

  -- Auto set visible_from if NULL
  IF p_visible_from IS NULL THEN
    p_visible_from := NOW();
  END IF;

  -- Validate date range
  IF p_visible_to IS NOT NULL AND p_visible_to < p_visible_from THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_DATE_RANGE','message','visible_to must be after visible_from'));
  END IF;

  -- =========================
  -- INSERT NEW ANNOUNCEMENT
  -- =========================
  IF p_ann_id IS NULL THEN

    INSERT INTO announcements(
      title, content_md, visible_from, visible_to, is_active
    )
    VALUES(
      p_title,
      p_content_md,
      p_visible_from,
      p_visible_to,
      COALESCE(p_is_active, TRUE)
    )
    RETURNING * INTO v_ann;

  ELSE
    -- =========================
    -- UPDATE EXISTING ANNOUNCEMENT
    -- =========================
    UPDATE announcements
       SET title        = p_title,
           content_md   = p_content_md,
           visible_from = COALESCE(p_visible_from, visible_from),
           visible_to   = p_visible_to,
           is_active    = COALESCE(p_is_active, is_active)
     WHERE ann_id = p_ann_id
     RETURNING * INTO v_ann;

    -- Nếu update nhưng không có hàng nào → báo lỗi
    IF v_ann.ann_id IS NULL THEN
      RETURN json_build_object('ok',FALSE,
        'error', json_build_object('code','ANN_NOT_FOUND','message','announcement not found'));
    END IF;

  END IF;

  -- Audit log (ĐÃ SỬA: Ghi lại actor_user)
  INSERT INTO audit_log(actor_user, action, object_type, object_id, payload_json)
  VALUES (
    p_actor_user_id,
    'ADMIN_UPSERT_ANNOUNCEMENT',
    'ANNOUNCEMENT',
    v_ann.ann_id::TEXT,
    to_jsonb(v_ann)
  );

  RETURN json_build_object('ok', TRUE,
    'data', json_build_object('announcement', row_to_json(v_ann)));

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_upsert_announcement_json(p_actor_user_id uuid, p_title text, p_content_md text, p_visible_from timestamp with time zone, p_visible_to timestamp with time zone, p_is_active boolean, p_ann_id integer) OWNER TO postgres;

--
-- TOC entry 328 (class 1255 OID 32513)
-- Name: fn_admin_upsert_line_json(uuid, text, text, text, boolean); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_upsert_line_json(p_actor_user_id uuid, p_code text, p_name text, p_color_hex text, p_state boolean) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_line lines%ROWTYPE;
  v_status metro_status;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN json_build_object('ok', FALSE,
      'error', json_build_object('code','INVALID_CODE','message','code is required'));
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('ok', FALSE,
      'error', json_build_object('code','INVALID_NAME','message','name is required'));
  END IF;

  v_status := CASE WHEN COALESCE(p_state, TRUE)
                   THEN 'active'::metro_status
                   ELSE 'inactive'::metro_status END;

  INSERT INTO lines(code, name, color_hex, status)
  VALUES (p_code, p_name, COALESCE(p_color_hex,'#2E86DE'), v_status)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        color_hex = EXCLUDED.color_hex,
        status = EXCLUDED.status
  RETURNING * INTO v_line;

  -- ĐÃ SỬA: Ghi lại actor_user
  INSERT INTO audit_log(actor_user, action, object_type, object_id, payload_json)
  VALUES (p_actor_user_id, 'ADMIN_UPSERT_LINE', 'LINE', v_line.code, to_jsonb(v_line));

  RETURN json_build_object(
    'ok', TRUE,
    'data', json_build_object('line', row_to_json(v_line))
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_upsert_line_json(p_actor_user_id uuid, p_code text, p_name text, p_color_hex text, p_state boolean) OWNER TO postgres;

--
-- TOC entry 335 (class 1255 OID 32518)
-- Name: fn_admin_upsert_promotion_json(uuid, text, text, text, public.promotion_type, numeric, numeric, timestamp with time zone, timestamp with time zone, numeric, boolean); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_upsert_promotion_json(p_actor_user_id uuid, p_code text, p_name text, p_description text, p_promo_type public.promotion_type, p_discount_percent numeric, p_discount_amount numeric, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_min_order_amount numeric, p_state boolean) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_promo promotions%ROWTYPE;
BEGIN
  -- Validate code
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_CODE','message','code is required'));
  END IF;

  -- Validate name
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_NAME','message','name is required'));
  END IF;

  -- Validate promo_type
  IF p_promo_type IS NULL THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_TYPE','message','promo_type is required'));
  END IF;

  -- Validate min_order_amount
  IF p_min_order_amount IS NULL OR p_min_order_amount < 0 THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_MIN_ORDER','message','min_order_amount must be >= 0'));
  END IF;

  -- Validate datetime
  IF p_starts_at IS NULL THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_START','message','starts_at is required'));
  END IF;

  IF p_ends_at IS NOT NULL AND p_ends_at < p_starts_at THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_END','message','ends_at must be after starts_at'));
  END IF;

  -- Validate percent / amount
  IF p_promo_type = 'percent' THEN
    IF p_discount_percent IS NULL OR p_discount_percent <= 0 OR p_discount_percent > 100 THEN
      RETURN json_build_object('ok',FALSE,
        'error', json_build_object('code','INVALID_PERCENT','message','discount_percent must be between 1 and 100'));
    END IF;
  END IF;

  IF p_promo_type = 'amount' THEN
    IF p_discount_amount IS NULL OR p_discount_amount <= 0 THEN
      RETURN json_build_object('ok',FALSE,
        'error', json_build_object('code','INVALID_AMOUNT','message','discount_amount must be > 0'));
    END IF;
  END IF;

  -- Insert / Update
  INSERT INTO promotions(
    code, name, description, promo_type,
    discount_percent, discount_amount,
    starts_at, ends_at, min_order_amount, state
  )
  VALUES(
    p_code, p_name, p_description, p_promo_type,
    p_discount_percent, p_discount_amount,
    p_starts_at, p_ends_at, p_min_order_amount, COALESCE(p_state,TRUE)
  )
  ON CONFLICT (code) DO UPDATE
    SET name             = EXCLUDED.name,
        description      = EXCLUDED.description,
        promo_type       = EXCLUDED.promo_type,
        discount_percent = EXCLUDED.discount_percent,
        discount_amount  = EXCLUDED.discount_amount,
        starts_at        = EXCLUDED.starts_at,
        ends_at          = EXCLUDED.ends_at,
        min_order_amount = EXCLUDED.min_order_amount,
        state            = EXCLUDED.state
  RETURNING * INTO v_promo;

  -- Audit (ĐÃ SỬA: Ghi lại actor_user)
  INSERT INTO audit_log(actor_user, action, object_type, object_id, payload_json)
  VALUES (p_actor_user_id, 'ADMIN_UPSERT_PROMOTION', 'PROMOTION', v_promo.code, to_jsonb(v_promo));

  RETURN json_build_object('ok',TRUE,
    'data', json_build_object('promotion', row_to_json(v_promo)));

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok',FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_upsert_promotion_json(p_actor_user_id uuid, p_code text, p_name text, p_description text, p_promo_type public.promotion_type, p_discount_percent numeric, p_discount_amount numeric, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_min_order_amount numeric, p_state boolean) OWNER TO postgres;

--
-- TOC entry 330 (class 1255 OID 32515)
-- Name: fn_admin_upsert_segment_json(uuid, text, text, text, integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_upsert_segment_json(p_actor_user_id uuid, p_line_code text, p_from_station text, p_to_station text, p_travel_min integer) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_segment segments%ROWTYPE;
BEGIN
  -- Validate empty
  IF p_line_code IS NULL OR trim(p_line_code) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_LINE','message','line_code is required'));
  END IF;

  IF p_from_station IS NULL OR p_to_station IS NULL
     OR trim(p_from_station) = '' OR trim(p_to_station) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_STATION','message','from/to required'));
  END IF;

  IF p_from_station = p_to_station THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','SAME_STATION','message','from and to cannot be same'));
  END IF;

  IF p_travel_min <= 0 THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_TRAVEL','message','travel_min must be > 0'));
  END IF;

  -- Check line exists
  PERFORM 1 FROM lines WHERE code = p_line_code;
  IF NOT FOUND THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','LINE_NOT_FOUND','message','line_code does not exist'));
  END IF;

  -- Check from_station exists
  PERFORM 1 FROM stations WHERE code = p_from_station AND line_code = p_line_code;
  IF NOT FOUND THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','FROM_STATION_NOT_FOUND','message','from_station does not exist in this line'));
  END IF;

  -- Check to_station exists
  PERFORM 1 FROM stations WHERE code = p_to_station AND line_code = p_line_code;
  IF NOT FOUND THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','TO_STATION_NOT_FOUND','message','to_station does not exist in this line'));
  END IF;

  -- Insert or Update
  INSERT INTO segments(line_code, from_station, to_station, travel_min)
  VALUES (p_line_code, p_from_station, p_to_station, p_travel_min)
  ON CONFLICT (line_code, from_station, to_station) DO UPDATE
    SET travel_min = EXCLUDED.travel_min
  RETURNING * INTO v_segment;

  -- Audit log (ĐÃ SỬA: Ghi lại actor_user)
  INSERT INTO audit_log(actor_user, action, object_type, object_id, payload_json)
  VALUES (
    p_actor_user_id,
    'ADMIN_UPSERT_SEGMENT',
    'SEGMENT',
    v_segment.line_code || ':' || v_segment.from_station || '->' || v_segment.to_station,
    to_jsonb(v_segment)
  );

  RETURN json_build_object(
    'ok', TRUE,
    'data', json_build_object('segment', row_to_json(v_segment))
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok',FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_upsert_segment_json(p_actor_user_id uuid, p_line_code text, p_from_station text, p_to_station text, p_travel_min integer) OWNER TO postgres;

--
-- TOC entry 329 (class 1255 OID 32514)
-- Name: fn_admin_upsert_station_json(uuid, text, text, text, integer, double precision, double precision); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_upsert_station_json(p_actor_user_id uuid, p_code text, p_name text, p_line_code text, p_order_index integer, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_station stations%ROWTYPE;
  v_exists BOOLEAN;
BEGIN
  -- Validate code
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_CODE','message','code is required'));
  END IF;

  -- Validate name
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_NAME','message','name is required'));
  END IF;

  -- Validate line code
  IF p_line_code IS NULL OR trim(p_line_code) = '' THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_LINE','message','line_code is required'));
  END IF;

  -- Check line exists
  PERFORM 1 FROM lines WHERE code = p_line_code;
  IF NOT FOUND THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','LINE_NOT_FOUND','message','line_code does not exist'));
  END IF;

  -- Check if station exists (update case)
  SELECT EXISTS(SELECT 1 FROM stations WHERE code = p_code)
  INTO v_exists;

  -- Check duplicate order_index within the line
  PERFORM 1
  FROM stations
  WHERE line_code = p_line_code
    AND order_index = p_order_index
    AND code <> p_code;   -- ignore itself when updating

  IF FOUND THEN
    RETURN json_build_object('ok', FALSE,
      'error', json_build_object(
        'code','ORDER_INDEX_CONFLICT',
        'message','order_index already exists in this line'
      ));
  END IF;

  ---- INSERT OR UPDATE ----
  IF v_exists THEN
    -- UPDATE
    UPDATE stations
    SET name        = p_name,
        line_code   = p_line_code,
        order_index = p_order_index,
        lat         = p_lat,
        lon         = p_lon
    WHERE code = p_code
    RETURNING * INTO v_station;
  ELSE
    -- INSERT
    INSERT INTO stations(code, name, line_code, order_index, lat, lon)
    VALUES (p_code, p_name, p_line_code, p_order_index, p_lat, p_lon)
    RETURNING * INTO v_station;
  END IF;

  -- Log audit (ĐÃ SỬA: Ghi lại actor_user)
  INSERT INTO audit_log(actor_user, action, object_type, object_id, payload_json)
  VALUES (p_actor_user_id, 'ADMIN_UPSERT_STATION', 'STATION', v_station.code, to_jsonb(v_station));

  RETURN json_build_object(
    'ok', TRUE,
    'data', json_build_object('station', row_to_json(v_station))
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok',FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_upsert_station_json(p_actor_user_id uuid, p_code text, p_name text, p_line_code text, p_order_index integer, p_lat double precision, p_lon double precision) OWNER TO postgres;

--
-- TOC entry 332 (class 1255 OID 32517)
-- Name: fn_admin_upsert_ticket_product_json(uuid, text, text, public.ticket_product_type, numeric, integer, integer, boolean); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_admin_upsert_ticket_product_json(p_actor_user_id uuid, p_code text, p_name_vi text, p_type public.ticket_product_type, p_price numeric, p_duration_hours integer, p_auto_activate_after_days integer, p_state boolean) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_product ticket_products%ROWTYPE;
BEGIN
  IF p_code IS NULL THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_CODE','message','code required'));
  END IF;

  INSERT INTO ticket_products(
    code, name_vi, type, price, duration_hours,
    auto_activate_after_days, state
  )
  VALUES(
    p_code, p_name_vi, p_type, p_price, p_duration_hours,
    p_auto_activate_after_days, COALESCE(p_state,TRUE)
  )
  ON CONFLICT (code) DO UPDATE
    SET name_vi = EXCLUDED.name_vi,
        type = EXCLUDED.type,
        price = EXCLUDED.price,
        duration_hours = EXCLUDED.duration_hours,
        auto_activate_after_days = EXCLUDED.auto_activate_after_days,
        state = EXCLUDED.state
  RETURNING * INTO v_product;

  -- ĐÃ SỬA: Ghi lại actor_user
  INSERT INTO audit_log(actor_user, action, object_type, object_id, payload_json)
  VALUES (p_actor_user_id, 'ADMIN_UPSERT_TICKET_PRODUCT',
          'TICKET_PRODUCT', v_product.code, to_jsonb(v_product));

  RETURN json_build_object(
    'ok',TRUE,
    'data', json_build_object('ticket_product', row_to_json(v_product))
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok',FALSE,
    'error', json_build_object('code','SERVER_ERROR','message',SQLERRM));
END;
$$;


ALTER FUNCTION api.fn_admin_upsert_ticket_product_json(p_actor_user_id uuid, p_code text, p_name_vi text, p_type public.ticket_product_type, p_price numeric, p_duration_hours integer, p_auto_activate_after_days integer, p_state boolean) OWNER TO postgres;

--
-- TOC entry 348 (class 1255 OID 32536)
-- Name: fn_auth_forgot_password_json(text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_auth_forgot_password_json(p_email text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_id UUID;
  v_reset_token UUID;
  v_expires_at TIMESTAMP;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Email không hợp lệ'
    );
  END IF;

  SELECT user_id
  INTO v_user_id
  FROM auth_identities
  WHERE provider = 'LOCAL'
    AND lower(email) = lower(p_email)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Email không tồn tại'
    );
  END IF;

  v_reset_token := extensions.uuid_generate_v4();
  v_expires_at  := NOW() + INTERVAL '10 minutes';

  INSERT INTO auth_tokens(token, user_id, issued_at, expires_at, token_type)
  VALUES (
    v_reset_token,
    v_user_id,
    NOW(),
    v_expires_at,
    'RESET_PASSWORD'
  );

  RETURN json_build_object(
    'success', TRUE,
    'reset_token', v_reset_token,
    'expires_at', v_expires_at
  );

END;
$$;


ALTER FUNCTION api.fn_auth_forgot_password_json(p_email text) OWNER TO postgres;

--
-- TOC entry 291 (class 1255 OID 32489)
-- Name: fn_auth_get_me_json(uuid); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_auth_get_me_json(p_token uuid) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_id       UUID;
  v_expires_at    TIMESTAMP;
  v_display_name  TEXT;
  v_primary_email TEXT;
  v_role          user_role;
  v_avatar_url    TEXT;
  v_email_verified BOOLEAN;
  v_is_active     BOOLEAN;
  v_created_at    TIMESTAMP;
  v_updated_at    TIMESTAMP;
BEGIN
  -- 1. Tìm token
  SELECT
    user_id,
    expires_at
  INTO
    v_user_id,
    v_expires_at
  FROM auth_tokens
  WHERE token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success',    FALSE,
      'error_code', 'INVALID_TOKEN',
      'message',    'Token not found'
    );
  END IF;

  -- 2. Kiểm tra hết hạn
  IF v_expires_at <= NOW() THEN
    RETURN json_build_object(
      'success',    FALSE,
      'error_code', 'TOKEN_EXPIRED',
      'message',    'Token has expired'
    );
  END IF;

  -- 3. Lấy thông tin user
  SELECT
    display_name,
    primary_email,
    role,
    avatar_url,
    email_verified,
    is_active,
    created_at,
    updated_at
  INTO
    v_display_name,
    v_primary_email,
    v_role,
    v_avatar_url,
    v_email_verified,
    v_is_active,
    v_created_at,
    v_updated_at
  FROM users
  WHERE user_id = v_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success',    FALSE,
      'error_code', 'USER_NOT_FOUND',
      'message',    'User not found'
    );
  END IF;

  IF NOT v_is_active THEN
    RETURN json_build_object(
      'success',    FALSE,
      'error_code', 'USER_INACTIVE',
      'message',    'User is inactive'
    );
  END IF;

  -- 4. Trả JSON profile
  RETURN json_build_object(
    'success', TRUE,
    'user', json_build_object(
      'user_id',        v_user_id,
      'display_name',   v_display_name,
      'primary_email',  v_primary_email,
      'role',           v_role,
      'avatar_url',     v_avatar_url,
      'email_verified', v_email_verified,
      'created_at',     v_created_at,
      'updated_at',     v_updated_at
    )
  );
END;
$$;


ALTER FUNCTION api.fn_auth_get_me_json(p_token uuid) OWNER TO postgres;

--
-- TOC entry 344 (class 1255 OID 32488)
-- Name: fn_auth_login_json(public.auth_provider, text, text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_auth_login_json(p_provider public.auth_provider, p_email text, p_password text, p_provider_user_id text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_id        UUID;
  v_display_name   TEXT;
  v_primary_email  TEXT;
  v_role           user_role;
  v_is_active      BOOLEAN;
  v_password_hash  TEXT;
  v_token          UUID;
  v_issued_at      TIMESTAMP;
  v_expires_at     TIMESTAMP;
BEGIN
  IF p_provider = 'LOCAL' THEN
    IF p_email IS NULL OR trim(p_email) = '' OR p_password IS NULL THEN
      RETURN json_build_object('success', FALSE, 'message', 'Email and password required');
    END IF;

    SELECT u.user_id, u.display_name, u.primary_email, u.role, u.is_active, ai.password_hash
    INTO v_user_id, v_display_name, v_primary_email, v_role, v_is_active, v_password_hash
    FROM auth_identities ai
    JOIN users u ON u.user_id = ai.user_id
    WHERE ai.provider = 'LOCAL' AND lower(ai.email) = lower(p_email)
    LIMIT 1;

    IF NOT FOUND OR crypt(p_password, v_password_hash) <> v_password_hash THEN
      RETURN json_build_object('success', FALSE, 'message', 'Invalid email or password');
    END IF;
    
    IF NOT v_is_active THEN
       RETURN json_build_object('success', FALSE, 'message', 'User inactive');
    END IF;
  ELSE
     -- Logic cho Social login (giữ nguyên hoặc viết lại nếu cần)
     -- Ở đây tôi rút gọn để tập trung vào phần tạo token
      RETURN json_build_object('success', FALSE, 'message', 'Social login not implemented in this snippet');
  END IF;

  -- 👇 QUAN TRỌNG: Set hạn 10 phút
  v_token      := extensions.uuid_generate_v4();
  v_issued_at  := NOW();
  v_expires_at := NOW() + INTERVAL '10 minutes'; 

  INSERT INTO auth_tokens (token, user_id, issued_at, expires_at, client_ip, user_agent)
  VALUES (v_token, v_user_id, v_issued_at, v_expires_at, NULL, NULL);

  RETURN json_build_object(
    'success', TRUE,
    'user', json_build_object(
      'user_id', v_user_id,
      'email', v_primary_email,
      'display_name', v_display_name,
      'role', v_role
    ),
    'token', v_token,
    'token_expires_at', v_expires_at
  );
END;
$$;


ALTER FUNCTION api.fn_auth_login_json(p_provider public.auth_provider, p_email text, p_password text, p_provider_user_id text) OWNER TO postgres;

--
-- TOC entry 345 (class 1255 OID 32487)
-- Name: fn_auth_register_json(text, text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_auth_register_json(p_email text, p_password text, p_display_name text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_id        UUID;
  v_password_hash  TEXT;
  v_token          UUID;
  v_expires_at     TIMESTAMP;
  v_email_exists   BOOLEAN;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
     RETURN json_build_object('success', FALSE, 'message', 'Email required');
  END IF;

  SELECT EXISTS (SELECT 1 FROM auth_identities WHERE provider = 'LOCAL' AND lower(email) = lower(p_email)) INTO v_email_exists;
  IF v_email_exists THEN
    RETURN json_build_object('success', FALSE, 'message', 'Email exists');
  END IF;

  INSERT INTO users (display_name, primary_email, role, is_active) 
  VALUES (p_display_name, p_email, 'CUSTOMER', TRUE) 
  RETURNING user_id INTO v_user_id;

  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));

  INSERT INTO auth_identities (user_id, provider, email, password_hash, is_primary, provider_user_id)
  VALUES (v_user_id, 'LOCAL', p_email, v_password_hash, TRUE, p_email);

  -- 👇 QUAN TRỌNG: Set hạn 10 phút
  v_token      := extensions.uuid_generate_v4();
  v_expires_at := NOW() + INTERVAL '10 minutes';

  INSERT INTO auth_tokens (token, user_id, issued_at, expires_at)
  VALUES (v_token, v_user_id, NOW(), v_expires_at);

  RETURN json_build_object(
    'success', TRUE,
    'user', json_build_object('user_id', v_user_id, 'email', p_email, 'role', 'CUSTOMER'),
    'token', v_token,
    'token_expires_at', v_expires_at
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', FALSE, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION api.fn_auth_register_json(p_email text, p_password text, p_display_name text) OWNER TO postgres;

--
-- TOC entry 347 (class 1255 OID 32537)
-- Name: fn_auth_reset_password_json(uuid, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_auth_reset_password_json(p_reset_token uuid, p_new_password text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_id UUID;
  v_hash TEXT;
BEGIN
  IF p_reset_token IS NULL THEN
    RETURN json_build_object('success', FALSE, 'message', 'Token required');
  END IF;

  IF p_new_password IS NULL OR trim(p_new_password) = '' THEN
    RETURN json_build_object('success', FALSE, 'message', 'Password required');
  END IF;

  SELECT user_id INTO v_user_id
  FROM auth_tokens
  WHERE token = p_reset_token
    AND token_type = 'RESET_PASSWORD'
    AND expires_at > NOW()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Invalid or expired token');
  END IF;

  v_hash := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

  UPDATE auth_identities
  SET password_hash = v_hash
  WHERE user_id = v_user_id AND provider = 'LOCAL';

  DELETE FROM auth_tokens
  WHERE token = p_reset_token;

  RETURN json_build_object('success', TRUE, 'message', 'Password updated');
END;
$$;


ALTER FUNCTION api.fn_auth_reset_password_json(p_reset_token uuid, p_new_password text) OWNER TO postgres;

--
-- TOC entry 319 (class 1255 OID 32502)
-- Name: fn_confirm_payment_json(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_confirm_payment_json(p_payment_id integer) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  updated_payment RECORD;
BEGIN
  -- Cập nhật trạng thái payment
  UPDATE payments
  SET status = 'SUCCESS'
  WHERE payment_id = p_payment_id AND status = 'PENDING'
  RETURNING * INTO updated_payment;

  IF NOT FOUND THEN
    -- Kiểm tra xem payment có tồn tại không, hoặc đã được SUCCESS/FAILED từ trước
    SELECT * INTO updated_payment FROM payments WHERE payment_id = p_payment_id;
    IF updated_payment IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Payment ID không tồn tại.');
    END IF;
    
    IF updated_payment.status = 'SUCCESS' THEN
        RETURN jsonb_build_object(
            'success', TRUE, 
            'message', 'Thanh toán này đã được xác nhận trước đó.',
            'payment', jsonb_strip_nulls(row_to_json(updated_payment)::jsonb)
        );
    END IF;

    RETURN jsonb_build_object('success', FALSE, 'message', 'Không thể xác nhận thanh toán (có thể đã FAILED hoặc không ở trạng thái PENDING).');
  END IF;

  -- Trả về thông tin thanh toán vừa cập nhật
  RETURN jsonb_build_object(
    'success', TRUE,
    'payment', jsonb_strip_nulls(row_to_json(updated_payment)::jsonb)
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Lỗi: Vé này đã có một thanh toán SUCCESS khác.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION api.fn_confirm_payment_json(p_payment_id integer) OWNER TO postgres;

--
-- TOC entry 289 (class 1255 OID 32501)
-- Name: fn_create_payment_json(integer, text, numeric); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_create_payment_json(p_ticket_id integer, p_method text, p_amount numeric) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_payment RECORD;
BEGIN
  -- Tạo bản ghi thanh toán mới
  INSERT INTO payments (ticket_id, method, amount, status)
  VALUES (p_ticket_id, p_method, p_amount, 'PENDING')
  RETURNING * INTO new_payment;

  -- Trả về thông tin thanh toán vừa tạo dưới dạng JSON
  RETURN jsonb_build_object(
    'success', TRUE,
    'payment', jsonb_strip_nulls(row_to_json(new_payment)::jsonb)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION api.fn_create_payment_json(p_ticket_id integer, p_method text, p_amount numeric) OWNER TO postgres;

--
-- TOC entry 315 (class 1255 OID 32498)
-- Name: fn_create_ticket_pass_json(uuid, text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_create_ticket_pass_json(user_id uuid, product_code text, promo_code text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_ticket_id INT;
  v_product RECORD;
  v_final_price NUMERIC;
BEGIN
  SELECT price, type, duration_hours INTO v_product
  FROM ticket_products
  WHERE code = product_code AND state = TRUE AND type != 'single_ride';

  IF v_product.price IS NULL THEN
    RAISE EXCEPTION 'Invalid or single_ride product code: %', product_code;
  END IF;

  -- Gọi hàm helper từ schema 'internal'
  SELECT final INTO v_final_price
  FROM internal.fn_apply_promotion(v_product.price, promo_code, NOW());

  INSERT INTO tickets (
    user_id, product_code, final_price, status
  ) VALUES (
    user_id, product_code, v_final_price, 'NEW'
  ) RETURNING ticket_id INTO new_ticket_id;

  
  RETURN json_build_object(
    'data', json_build_object(
      'ticket', (SELECT row_to_json(t) FROM tickets t WHERE t.ticket_id = new_ticket_id),
      'message', 'Pass ticket created successfully. Awaiting payment.'
    )
  );
END;
$$;


ALTER FUNCTION api.fn_create_ticket_pass_json(user_id uuid, product_code text, promo_code text) OWNER TO postgres;

--
-- TOC entry 314 (class 1255 OID 32497)
-- Name: fn_create_ticket_single_json(uuid, text, text, text, integer, numeric, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_create_ticket_single_json(user_id uuid, line_code text, from_station text, to_station text, stops integer, final_price numeric, promo_code text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_ticket_id INT;
  v_product_code TEXT := 'L1_SINGLE'; 
BEGIN
  INSERT INTO tickets (
    user_id, product_code, from_station, to_station, stops, final_price, status
  ) VALUES (
    user_id, v_product_code, from_station, to_station, stops, final_price, 'NEW'
  ) RETURNING ticket_id INTO new_ticket_id;
  
  INSERT INTO audit_log (actor_user, action, object_type, object_id, payload_json)
  VALUES (user_id, 'TICKET_CREATED_SINGLE', 'TICKET', new_ticket_id::TEXT,
    json_build_object('final_price', final_price, 'promo_code', promo_code, 'from', from_station, 'to', to_station));

  RETURN json_build_object(
    'data', json_build_object(
      'ticket', (SELECT row_to_json(t) FROM tickets t WHERE t.ticket_id = new_ticket_id),
      'message', 'Single ride ticket created successfully. Awaiting payment.'
    )
  );
END;
$$;


ALTER FUNCTION api.fn_create_ticket_single_json(user_id uuid, line_code text, from_station text, to_station text, stops integer, final_price numeric, promo_code text) OWNER TO postgres;

--
-- TOC entry 292 (class 1255 OID 32490)
-- Name: fn_get_announcements_json(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_get_announcements_json() RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_items JSON;
BEGIN
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'ann_id',       ann_id,
        'title',        title,
        'content_md',   content_md,
        'visible_from', visible_from,
        'visible_to',   visible_to,
        'is_active',    is_active,
        'created_at',   created_at
      )
      ORDER BY visible_from DESC
    ),
    '[]'::JSON
  )
  INTO v_items
  FROM announcements
  WHERE is_active = TRUE
    AND visible_from <= NOW()
    AND (visible_to IS NULL OR visible_to >= NOW());

  RETURN json_build_object(
    'success',        TRUE,
    'announcements',  v_items
  );
END;
$$;


ALTER FUNCTION api.fn_get_announcements_json() OWNER TO postgres;

--
-- TOC entry 311 (class 1255 OID 32494)
-- Name: fn_get_lines_json(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_get_lines_json() RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN json_build_object(
    'data', json_build_object(
      'lines', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'code', code,
            'name', name,
            'color_hex', color_hex,
            'status', status
          )
        ), '[]'::JSON)
        FROM lines
        WHERE status = 'active'
      )
    )
  );
END;
$$;


ALTER FUNCTION api.fn_get_lines_json() OWNER TO postgres;

--
-- TOC entry 312 (class 1255 OID 32495)
-- Name: fn_get_stations_json(text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_get_stations_json(p_line_code text) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN json_build_object(
    'data', json_build_object(
      'line_code', p_line_code,
      'stations', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'code', code,
            'name', name,
            'order_index', order_index,
            'lat', lat,
            'lon', lon
          )
        ORDER BY order_index ASC), '[]'::JSON)
        FROM stations
        WHERE line_code = p_line_code
      )
    )
  );
END;
$$;


ALTER FUNCTION api.fn_get_stations_json(p_line_code text) OWNER TO postgres;

--
-- TOC entry 316 (class 1255 OID 32499)
-- Name: fn_get_ticket_json(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_get_ticket_json(ticket_id integer) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
  v_ticket_data JSON;
BEGIN
  SELECT json_build_object(
    'ticket_id', t.ticket_id,
    'user_id', t.user_id,
    'product_code', t.product_code,
    'type', tp.type,
    'product_name', tp.name_vi,
    'from_station', t.from_station,
    'to_station', t.to_station,
    'stops', t.stops,
    'final_price', t.final_price,
    'qr_code', t.qr_code,
    'status', t.status,
    'valid_from', t.valid_from,
    'valid_to', t.valid_to,
    'created_at', t.created_at,
    'used_at', t.used_at
  ) INTO v_ticket_data
  FROM tickets t
  JOIN ticket_products tp ON t.product_code = tp.code
  WHERE t.ticket_id = $1;

  IF v_ticket_data IS NULL THEN
    RETURN json_build_object('error', 'Ticket not found.');
  END IF;

  RETURN json_build_object('data', v_ticket_data);
END;
$_$;


ALTER FUNCTION api.fn_get_ticket_json(ticket_id integer) OWNER TO postgres;

--
-- TOC entry 282 (class 1255 OID 32500)
-- Name: fn_get_user_tickets_json(uuid, public.ticket_status); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_get_user_tickets_json(user_id uuid, status_filter public.ticket_status DEFAULT NULL::public.ticket_status) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $_$
BEGIN
  RETURN json_build_object(
    'data', json_build_object(
      'tickets', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'ticket_id', t.ticket_id,
            'product_name', tp.name_vi,
            'type', tp.type,
            'final_price', t.final_price,
            'status', t.status,
            'valid_from', t.valid_from,
            'valid_to', t.valid_to
          ) ORDER BY t.created_at DESC
        ), '[]'::JSON)
        FROM tickets t
        JOIN ticket_products tp ON t.product_code = tp.code
        WHERE t.user_id = $1 AND (status_filter IS NULL OR t.status = status_filter)
      )
    )
  );
END;
$_$;


ALTER FUNCTION api.fn_get_user_tickets_json(user_id uuid, status_filter public.ticket_status) OWNER TO postgres;

--
-- TOC entry 313 (class 1255 OID 32496)
-- Name: fn_quote_single_json(text, text, text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_quote_single_json(line_code text, from_station text, to_station text, promo_code text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_stops INT;
  v_base_price NUMERIC(12,2);
  v_promotion_result RECORD;
BEGIN
  -- Gọi hàm helper từ schema 'internal'
  v_stops := internal.fn_calc_stops(line_code, from_station, to_station);
  
  -- Gọi hàm helper từ schema 'internal'
  v_base_price := internal.calc_single_ride_fare_simple(line_code, v_stops);

  -- Gọi hàm helper từ schema 'internal'
  SELECT base, discount, final
  INTO v_promotion_result
  FROM internal.fn_apply_promotion(v_base_price, promo_code, NOW());

  RETURN json_build_object(
    'data', json_build_object(
      'line_code', line_code,
      'from_station', from_station,
      'to_station', to_station,
      'stops', v_stops,
      'base_price', v_base_price,
      'promo_code', promo_code,
      'discount', v_promotion_result.discount,
      'final_price', v_promotion_result.final,
      'currency', 'VND'
    )
  );
END;
$$;


ALTER FUNCTION api.fn_quote_single_json(line_code text, from_station text, to_station text, promo_code text) OWNER TO postgres;

--
-- TOC entry 337 (class 1255 OID 32520)
-- Name: fn_report_sales_json(date, date); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_report_sales_json(p_from_date date, p_to_date date) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_rows JSON;
BEGIN
  -- ĐÃ SỬA: Logic này đã bị sai (trước đó SUM gộp tất cả)
  -- Sửa lại để GROUP BY theo ngày, giống fn_report_traffic_json
  SELECT COALESCE(json_agg(
    json_build_object(
      'date', report_date,
      'amount', total_amount,
      'count', total_count
    ) ORDER BY report_date ASC
  ), '[]'::JSON)
  INTO v_rows
  FROM (
    SELECT
      created_at::DATE AS report_date,
      SUM(amount) AS total_amount,
      COUNT(*) AS total_count
    FROM payments
    WHERE status = 'SUCCESS'
      AND created_at >= p_from_date
      AND created_at < (p_to_date + 1) -- p_to_date + 1 để bao gồm cả ngày cuối
    GROUP BY created_at::DATE
  ) AS daily_sales;

  RETURN json_build_object(
    'ok', TRUE,
    'data', json_build_object('rows', v_rows)
  );
END;
$$;


ALTER FUNCTION api.fn_report_sales_json(p_from_date date, p_to_date date) OWNER TO postgres;

--
-- TOC entry 327 (class 1255 OID 32524)
-- Name: fn_report_ticket_types_json(date, date); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_report_ticket_types_json(p_from_date date, p_to_date date) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_rows JSON;
BEGIN
  SELECT COALESCE(json_agg(
    json_build_object(
      'name', type_name,
      'value', ticket_count
    )
  ), '[]'::JSON)
  INTO v_rows
  FROM (
    SELECT 
      CASE 
        WHEN tp.type = 'single_ride' THEN 'Vé lượt'
        WHEN tp.type = 'day_pass' THEN 'Vé ngày'
        WHEN tp.type = 'monthly_pass' THEN 'Vé tháng'
        ELSE 'Khác'
      END AS type_name,
      COUNT(t.ticket_id) AS ticket_count
    FROM tickets t
    JOIN ticket_products tp ON t.product_code = tp.code
    -- 👇 BỔ SUNG: Join bảng payments để kiểm tra
    JOIN payments p ON t.ticket_id = p.ticket_id
    WHERE t.created_at::DATE BETWEEN p_from_date AND p_to_date
      AND p.status = 'SUCCESS' -- 👈 CHỈ ĐẾM VÉ ĐÃ THANH TOÁN THÀNH CÔNG
    GROUP BY tp.type
  ) AS t;

  RETURN json_build_object('ok', TRUE, 'data', v_rows);
END;
$$;


ALTER FUNCTION api.fn_report_ticket_types_json(p_from_date date, p_to_date date) OWNER TO postgres;

--
-- TOC entry 338 (class 1255 OID 32521)
-- Name: fn_report_traffic_json(date); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.fn_report_traffic_json(p_on_date date) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_rows JSON;
BEGIN
  -- Validate input
  IF p_on_date IS NULL THEN
    RETURN json_build_object('ok',FALSE,
      'error', json_build_object('code','INVALID_DATE','message','p_on_date is required'));
  END IF;

  -- Logic này đã đúng: aggregate trong subquery
  SELECT COALESCE(json_agg(
    json_build_object(
      'station_code', station_code,
      'validations_count', validations_count
    ) ORDER BY validations_count DESC
  ), '[]'::JSON)
  INTO v_rows
  FROM (
    SELECT station_code, COUNT(*) AS validations_count
    FROM validations
    WHERE validated_at::DATE = p_on_date
    GROUP BY station_code
  ) AS t;

  RETURN json_build_object('ok',TRUE,
    'data', json_build_object('rows', COALESCE(v_rows,'[]'::JSON)));
END;
$$;


ALTER FUNCTION api.fn_report_traffic_json(p_on_date date) OWNER TO postgres;

-- Completed on 2025-11-23 09:42:32 +07

--
-- PostgreSQL database dump complete
--

\unrestrict HLaMyqJw9NxJFqkIchWU05aPggjNUbkuprDeMNYXpVSPqT1O0hueqjLpLce8IiI

