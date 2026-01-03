import jwt from "jsonwebtoken";

export const createTokens = (user: any) => {
  const access_token = jwt.sign(
    {
      user_id: user._id,
      email: user.email,
      role: user.role_id?.code,
    },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "15m" }
  );

  const refresh_token = jwt.sign(
    {
      user_id: user._id,
    },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" }
  );

  return { access_token, refresh_token };
};
