import { SignJWT, jwtVerify } from "jose";

export interface TokenPayload {
  scope: "site" | "admin";
  iat?: number;
  exp?: number;
}

const enc = new TextEncoder();

export async function signToken(
  payload: TokenPayload,
  secret: string,
  ttlSeconds = 60 * 60 * 24 * 30, // 30 days
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(enc.encode(secret));
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, enc.encode(secret));
    if (payload.scope !== "site" && payload.scope !== "admin") return null;
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "vv_session";
export const ADMIN_COOKIE_NAME = "vv_admin";
