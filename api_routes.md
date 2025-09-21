# 📂 API Routes (Category-Wise)

**Base URL:** `http://localhost:4000/api/v1`

---

## 🔑 **Auth & Session**

| Method | Endpoint               | Controller            | Notes                              |
| ------ | ---------------------- | --------------------- | ---------------------------------- |
| POST   | `/auth/register`       | `createUser`          | Register normal user               |
| POST   | `/auth/register/admin` | `createAdmin`         | Register admin user                |
| POST   | `/auth/login`          | `login`               | Login with device restriction      |
| POST   | `/auth/logout`         | `logout`              | Logout current session             |
| POST   | `/auth/logout/all`     | `logoutAllDevices`    | Logout from all devices            |
| POST   | `/auth/logout/one`     | `logoutFromOneDevice` | Logout from single device          |
| POST   | `/auth/update-device`  | `updateDevice`        | Reset device array (debug/testing) |

---

## 👤 **User Profile**

| Method | Endpoint                      | Controller             | Notes                            |
| ------ | ----------------------------- | ---------------------- | -------------------------------- |
| GET    | `/user/me`                    | `getMyProfile`         | Get logged-in user               |
| GET    | `/user/all`                   | `getAllUsers`          | Admin: get all users             |
| POST   | `/user/profile-picture`       | `uploadProfilePicture` | Upload new picture (S3)          |
| PUT    | `/user/profile-picture`       | `updateProfilePicture` | Update picture (delete + upload) |
| PUT    | `/user/change-password`       | `changePassword`       | Change password                  |
| POST   | `/user/forgot-password`       | `forgetPassword`       | Request reset token              |
| PUT    | `/user/reset-password/:token` | `resetPassword`        | Reset password with token        |
| PUT    | `/user/deactivate`            | `deactivateProfile`    | Deactivate account               |
| DELETE | `/user/:id`                   | `deleteUser`           | Admin delete user                |
| DELETE | `/user/self`                  | `selfDeleteUser`       | Self delete account              |

---

## 🎬 **Content & Subscription**

| Method | Endpoint                          | Controller                    | Notes                                      |
| ------ | --------------------------------- | ----------------------------- | ------------------------------------------ |
| GET    | `/user/content/subscription-plan` | `getContentOnsubcriptionPlan` | Fetch content trailers for subscribed plan |
| PUT    | `/user/subscription/upgrade`      | `upgradeSubscription`         | Upgrade subscription                       |
| POST   | `/user/subscription/cancel`       | ❌ Not implemented yet        | Cancel subscription                        |

---

## 📌 **Future / To-Do APIs (mentioned in comments)**

- `GET /user/watch-history/:contentId` → Resume watching
- `GET /user/recommendations` → Recommendations
- `POST /user/watchlist/add` → Add to watchlist
- `DELETE /user/watchlist/remove/:contentId` → Remove from watchlist
- `POST /user/likes` → Like/Dislike content
- `POST /user/reviews` → Ratings & reviews
- `GET /user/notifications` → Notify users about new releases
- `GET /auth/oauth/callback` → OAuth login
