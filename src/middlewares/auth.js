import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import ErrorHandle from "../utils/errorHandle.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";

// ✅ Check if user is authenticated
export const isAuthenticated = catchAsyncError(async (req, res, next) => {
  const { token } = req.cookies || req.headers;

  if (!token) {
    return next(new ErrorHandle("Authentication required", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id);

  if (!req.user) {
    return next(new ErrorHandle("User not found", 404));
  }

  next();
});
