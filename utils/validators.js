//
// ✅ Email Validator
//
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

//
// ✅ Password Validator
// Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
//
export const validatePassword = (password) => {
  const re =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return re.test(password);
};

//
// ✅ Contact Number Validator
// Supports +91..., 10-digit, international formats
//
export const validateContact = (contact) => {
  const re = /^\+?[0-9]{10,15}$/;
  return re.test(contact);
};

//
// ✅ Name Validator
//
export const validateName = (name) => {
  const re = /^[A-Za-z\s]{2,50}$/;
  return re.test(name);
};

//
// ✅ ObjectId Validator
//
export const validateObjectId = (id, mongoose) => {
  return mongoose.Types.ObjectId.isValid(id);
};
