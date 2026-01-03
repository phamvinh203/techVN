import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendError, sendSuccess } from "~/helpers/responese";
import Auth from "~/models/user.model";
import { createTokens } from "~/utils/token_manager";
import Role from "~/models/role.model";
import { generateOTP } from "../helpers/generate";
import { sendMail } from "../helpers/sendMail";
import ForgotPassword from "~/models/forgot-password.model";
import { supabase } from "~/config/db";


export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { full_name, email, password} = req.body;

        if (!full_name || !email || !password) {
            sendError(res, 400, "Thiếu thông tin bắt buộc");
            return;
        }

        // Kiểm tra email đã tồn tại
        const emailExit = await Auth.findOne({ email });
        if (emailExit) {
            sendError(res, 400, "Email đã tồn tại");
            return;
        }

        // role_id hợp lệ
        const userRole = await Role.findOne({ code: "USER" });
        if (!userRole) {
            sendError(res, 400, "Vai trò người dùng không hợp lệ");
            return;
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo người dùng mới
        const newUser = await Auth.create({
            full_name,
            email,
            password: hashedPassword,
            role_id: userRole._id,
        })

        // Trả về phản hồi thành công
        sendSuccess(res, {
            success: true,
            message: "Đăng ký thành công",
            data: {
                user_id: newUser._id,
                full_name: newUser.full_name,
                email: newUser.email,
                role_id: newUser.role_id,
            },
        });
        
    } catch (error) {
        console.error("Registration error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Kiểm tra thông tin đăng nhập
        if (!email || !password) {
            sendError(res, 400, "Thiếu thông tin đăng nhập");
            return
        }
        // Tìm user
        const user = await Auth.findOne({ email })
        .select("+password +refresh_token")
        .populate("role_id");
        if (!user) {
            sendError(res, 400, "Email hoặc mật khẩu không đúng");
            return;
        }

        // Kiểm tra role
        const role = user.role_id as any;
        if (!role || !["ADMIN", "USER"].includes(role.code)) {
            sendError(res, 403, "Tài khoản không có quyền truy cập");
            return;
        }

        // Kiểm tra trạng thái
        if (user.status === "BLOCKED") {
            sendError(res, 403, "Tài khoản đã bị khóa");
            return;
        }

        // kiểm tra mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            sendError(res, 400, "Email hoặc mật khẩu không đúng");
            return;
        }

        // Tạo token
        const { access_token, refresh_token } = createTokens(user);

        // lưu refresh token vào db
        user.refresh_token = refresh_token;
        await user.save();

        // Trả về phản hồi thành công
        sendSuccess(res, {
            success: true,
            message: "Đăng nhập thành công",
            data: {
                user_id: user._id,
                email: user.email,
                role_id: user.role_id,
                access_token,
                refresh_token,
            },
        });

    } catch (error) {
        console.error("Login error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        sendError(res, 400, "Thiếu refresh token");
        return;
    }

    try {
        // xác minh refresh token
        const decodes = jwt.verify(
            refresh_token, 
            process.env.REFRESH_TOKEN_SECRET!
        ) as { user_id: string };

        // Kiểm tra refresh token có tồn tại trong DB không
        const user = await Auth.findOne({ 
            _id: decodes.user_id, 
            refresh_token: refresh_token 
        });

        if (!user) {
            sendError(res, 401, "Refresh token không hợp lệ hoặc đã hết hạn");
            return;
        }

        // tạo mới access token
        const access_token = jwt.sign(
            {
                user_id: decodes.user_id,
                email: user.email,
                role: (user.role_id as any)?.code,
            },
            process.env.ACCESS_TOKEN_SECRET!,
            { expiresIn: "15m" }
        );

        sendSuccess(res, {
            success: true,
            data: { access_token },
        });

    } catch (error: any) {
        console.error("Refresh token error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const logout = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      sendError(res, 401, "Unauthorized");
      return;
    }

    await Auth.findByIdAndUpdate(userId, {
      refresh_token: null,
    });

    sendSuccess(res, {
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    console.error("Logout error:", error);
    sendError(res, 500, "Lỗi server");
  }
};


export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            sendError(res, 400, "Vui lòng nhập email");
            return;
        }

        const user = await Auth.findOne({ email, deleted: false });

        if (!user) {
            // Bảo mật: không tiết lộ email có tồn tại hay không
            sendSuccess(res, {
                success: true,
                message: "Nếu email tồn tại, bạn sẽ nhận được mã OTP",
            });
            return;
        }

        if (user.status === "BLOCKED") {
            sendError(res, 403, "Tài khoản đã bị khóa");
            return;
        }

        const otp: string = generateOTP();
        const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

        // Xóa OTP cũ nếu có
        await ForgotPassword.deleteMany({ email });

        // Tạo document mới từ Model
        await ForgotPassword.create({
            email,
            otp,
            expireAt,
        });

        // Template email
        const subject = "Mã OTP đặt lại mật khẩu - Your Shop";
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Đặt lại mật khẩu</h2>
                <p>Xin chào <strong>${user.full_name}</strong>,</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu. Đây là mã OTP của bạn:</p>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            padding: 20px; 
                            text-align: center; 
                            border-radius: 10px; 
                            margin: 20px 0;">
                    <span style="font-size: 36px; 
                                 font-weight: bold; 
                                 letter-spacing: 8px; 
                                 color: white;">
                        ${otp}
                    </span>
                </div>
                <p style="color: #e74c3c;"><strong>⏰ Mã này sẽ hết hạn sau 15 phút.</strong></p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                    © 2024 Your Shop. Email này được gửi tự động.
                </p>
            </div>
        `;

        await sendMail(email, subject, html);

        sendSuccess(res, {
            success: true,
            message: "Đã gửi mã OTP đến email của bạn",
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            sendError(res, 400, "Thiếu email hoặc mã OTP");
            return;
        }

        // Tìm OTP trong database
        const forgotRecord = await ForgotPassword.findOne({ email, otp });

        if (!forgotRecord) {
            sendError(res, 400, "Mã OTP không đúng hoặc đã hết hạn");
            return;
        }

        // Kiểm tra hết hạn
       if (!forgotRecord.expireAt || forgotRecord.expireAt < new Date()) {
            await ForgotPassword.deleteOne({ _id: forgotRecord._id });
            sendError(res, 400, "Mã OTP đã hết hạn");
            return;
        }

        sendSuccess(res, {
            success: true,
            message: "Xác thực OTP thành công",
            data: {
                email,
                verified: true,
            },
        });

    } catch (error) {
        console.error("Verify OTP error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp, new_password, confirm_password } = req.body;

        // Validate
        if (!email || !otp || !new_password || !confirm_password) {
            sendError(res, 400, "Thiếu thông tin bắt buộc");
            return;
        }

        if (new_password !== confirm_password) {
            sendError(res, 400, "Mật khẩu xác nhận không khớp");
            return;
        }

        if (new_password.length < 6) {
            sendError(res, 400, "Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }

        // Kiểm tra OTP
        const forgotRecord = await ForgotPassword.findOne({ email, otp });

        if (!forgotRecord) {
            sendError(res, 400, "Mã OTP không đúng hoặc đã hết hạn");
            return;
        }

        if (!forgotRecord.expireAt || forgotRecord.expireAt < new Date()) {
            await ForgotPassword.deleteOne({ _id: forgotRecord._id });
            sendError(res, 400, "Mã OTP đã hết hạn");
            return;
        }


        // Tìm user và cập nhật mật khẩu
        const user = await Auth.findOne({ email, deleted: false });

        if (!user) {
            sendError(res, 400, "Người dùng không tồn tại");
            return;
        }

        // Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Cập nhật mật khẩu
        user.password = hashedPassword;
        user.refresh_token = undefined;  // Logout tất cả phiên
        await user.save();

        // Xóa OTP đã sử dụng
        await ForgotPassword.deleteMany({ email });

        sendSuccess(res, {
            success: true,
            message: "Đặt lại mật khẩu thành công",
        });

    } catch (error) {
        console.error("Reset password error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            sendError(res, 400, "Vui lòng nhập email");
            return;
        }

        const user = await Auth.findOne({ email, deleted: false });

        if (!user) {
            sendSuccess(res, {
                success: true,
                message: "Nếu email tồn tại, bạn sẽ nhận được mã OTP mới",
            });
            return;
        }

        // Xóa OTP cũ
        await ForgotPassword.deleteMany({ email });

        // Tạo OTP mới
        const otp: string = generateOTP();
        const expireAt = new Date(Date.now() + 15 * 60 * 1000);

        await ForgotPassword.create({
            email,
            otp,
            expireAt,
        });

        const subject = "Mã OTP mới - Your Shop";
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Mã OTP mới</h2>
                <p>Xin chào <strong>${user.full_name}</strong>,</p>
                <p>Đây là mã OTP mới của bạn:</p>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            padding: 20px; 
                            text-align: center; 
                            border-radius: 10px; 
                            margin: 20px 0;">
                    <span style="font-size: 36px; 
                                 font-weight: bold; 
                                 letter-spacing: 8px; 
                                 color: white;">
                        ${otp}
                    </span>
                </div>
                <p style="color: #e74c3c;"><strong>⏰ Mã này sẽ hết hạn sau 15 phút.</strong></p>
            </div>
        `;

        await sendMail(email, subject, html);

        sendSuccess(res, {
            success: true,
            message: "Đã gửi mã OTP mới đến email của bạn",
        });

    } catch (error) {
        console.error("Resend OTP error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const getMe = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            sendError(res, 401, "Unauthorized");
            return;
        }

        const user = await Auth.findOne({ _id: userId, deleted: false })
            .select("-__v")
            .populate("role_id", "name code");

        if (!user) {
            sendError(res, 404, "Người dùng không tồn tại");
            return;
        }

        if (user.status === "BLOCKED") {
            sendError(res, 403, "Tài khoản đã bị khóa");
            return;
        }

        sendSuccess(res, {
            success: true,
            data: {
                user_id: user._id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role_id,
                status: user.status,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });

    } catch (error) {
        console.error("Get me error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const updateMe = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            sendError(res, 401, "Unauthorized");
            return;
        }

        const { full_name, phone } = req.body;

        // Validate
        if (!full_name && !phone) {
            sendError(res, 400, "Vui lòng cung cấp thông tin cần cập nhật");
            return;
        }

        const user = await Auth.findOne({ _id: userId, deleted: false });

        if (!user) {
            sendError(res, 404, "Người dùng không tồn tại");
            return;
        }

        if (user.status === "BLOCKED") {
            sendError(res, 403, "Tài khoản đã bị khóa");
            return;
        }

        // Cập nhật thông tin
        if (full_name) user.full_name = full_name.trim();
        if (phone) user.phone = phone.trim();

        await user.save();

        sendSuccess(res, {
            success: true,
            message: "Cập nhật thông tin thành công",
            data: {
                user_id: user._id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
            },
        });

    } catch (error) {
        console.error("Update me error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const updateAvatar = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const userId = req.user?.user_id;
        const userEmail = req.user?.email;

        if (!userId) {
            sendError(res, 401, "Unauthorized");
            return;
        }

        if (!req.file) {
            sendError(res, 400, "Vui lòng tải lên tệp avatar");
            return;
        }

        // Tìm user
        const user = await Auth.findOne({ _id: userId, deleted: false });
        if (!user) {
            sendError(res, 404, "Người dùng không tồn tại");
            return;
        }

        if (user.status === "BLOCKED") {
            sendError(res, 403, "Tài khoản đã bị khóa");
            return;
        }

        const file = req.file as Express.Multer.File;

        // Tạo tên file unique với timestamp
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `avatars/${userId}/${fileName}`;

        // Xóa avatar cũ nếu có (trước khi upload mới)
        if (user.avatar && user.avatar.includes("supabase")) {
            try {
                // Extract old file path from URL
                const urlParts = user.avatar.split("/avatars/");
                if (urlParts.length > 1) {
                    const oldFilePath = urlParts[1];
                    await supabase.storage.from("avatars").remove([oldFilePath]);
                }
            } catch (deleteError) {
                console.log("Could not delete old avatar:", deleteError);
            }
        }

        // Tải tệp lên Supabase Storage
        const { data, error } = await supabase.storage
            .from("avatars")
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true, // Cho phép ghi đè nếu file đã tồn tại
            });

        if (error) {
            console.error("Supabase upload error:", error);
            sendError(res, 500, "Lỗi khi tải lên avatar");
            return;
        }

        // Lấy URL công khai của file
        const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        // Cập nhật avatar URL cho user
        user.avatar = publicUrlData.publicUrl;
        await user.save();

        sendSuccess(res, {
            success: true,
            message: "Cập nhật avatar thành công",
            data: {
                avatarUrl: publicUrlData.publicUrl,
                filePath: data.path,
            },
        });

    } catch (error) {
        console.error("Update avatar error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

export const updatePassword = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            sendError(res, 401, "Unauthorized");
            return;
        }

        const { current_password, new_password, confirm_password } = req.body;

        // Validate
        if (!current_password || !new_password || !confirm_password) {
            sendError(res, 400, "Vui lòng nhập đầy đủ thông tin");
            return;
        }

        if (new_password !== confirm_password) {
            sendError(res, 400, "Mật khẩu xác nhận không khớp");
            return;
        }

        if (new_password.length < 6) {
            sendError(res, 400, "Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }

        if (current_password === new_password) {
            sendError(res, 400, "Mật khẩu mới phải khác mật khẩu hiện tại");
            return;
        }

        // Tìm user với password
        const user = await Auth.findOne({ _id: userId, deleted: false }).select("+password");

        if (!user) {
            sendError(res, 404, "Người dùng không tồn tại");
            return;
        }

        if (user.status === "BLOCKED") {
            sendError(res, 403, "Tài khoản đã bị khóa");
            return;
        }

        // Kiểm tra mật khẩu hiện tại
        const isPasswordValid = await bcrypt.compare(current_password, user.password);
        if (!isPasswordValid) {
            sendError(res, 400, "Mật khẩu hiện tại không đúng");
            return;
        }

        // Hash và cập nhật mật khẩu mới
        const hashedPassword = await bcrypt.hash(new_password, 10);
        user.password = hashedPassword;
        user.refresh_token = undefined; // Logout tất cả phiên khác
        await user.save();

        sendSuccess(res, {
            success: true,
            message: "Đổi mật khẩu thành công",
        });

    } catch (error) {
        console.error("Update password error:", error);
        sendError(res, 500, "Lỗi server");
    }
};
