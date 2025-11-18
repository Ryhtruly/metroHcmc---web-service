import { pool } from '../config/db.js';


export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const query = 'SELECT * FROM api.fn_auth_get_me_json($1)';
      const { rows } = await pool.query(query, [token]);

      const dbResponse = rows[0].fn_auth_get_me_json;

      if (dbResponse.success) {
        req.user = dbResponse.user;
        next();
      } else {
        res.status(401).json({ success: false, message: dbResponse.message });
      }
    } catch (err) {
      console.error('Lỗi Auth Middleware:', err.message);
      res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Chưa cung cấp Token' });
  }
};


export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next(); 
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Forbidden: Yêu cầu quyền Admin' 
    });
  }
};

export const inspectorOnly = (req, res, next) => {
  if (req.user && req.user.role === 'INSPECTOR') {
    next(); 
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Forbidden: Yêu cầu quyền Inspector' 
    });
  }
};


export const customerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    next(); 
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Forbidden: Yêu cầu quyền Customer' 
    });
  }
};