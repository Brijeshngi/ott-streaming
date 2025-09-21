import jwt from "jsonwebtoken";
import { User } from "../models/Users.js";
import ErrorHandle from "../utils/errorHandle.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";

// ====================== AUTH CHECK ======================
export const isAuthenticated = catchAsyncError(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ErrorHandle("Access token missing", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return next(new ErrorHandle("User not found", 404));

    req.user = user; // attach user to request
    next();
  } catch (err) {
    return next(new ErrorHandle("Invalid or expired access token", 401));
  }
});

// ====================== ADMIN CHECK ======================
export const isAdmin = catchAsyncError(async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandle("Authentication required", 401));
  }

  if (req.user.Role !== "Admin") {
    return next(new ErrorHandle("Access denied: Admins only", 403));
  }

  next();
});
