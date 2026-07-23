import crypto from "crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Sign in with Apple needs a client "secret" that is actually a short-lived
 * JWT signed with the private key from an Apple Developer account. Rather
 * than requiring a precomputed JWT that expires and needs manual rotation
 * (Apple caps it at 6 months), this signs a fresh one from
 * APPLE_TEAM_ID/APPLE_KEY_ID/APPLE_PRIVATE_KEY on every cold start.
 */
export function buildAppleClientSecret(): string | null {
  if (process.env.APPLE_CLIENT_SECRET) {
    return process.env.APPLE_CLIENT_SECRET;
  }

  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  const clientId = process.env.APPLE_ID;

  if (!teamId || !keyId || !privateKey || !clientId) {
    return null;
  }

  const header = { alg: "ES256", kid: keyId };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 60 * 24 * 30,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  try {
    const key = crypto.createPrivateKey(privateKey.replace(/\\n/g, "\n"));
    const signature = crypto.sign("sha256", Buffer.from(signingInput), {
      key,
      dsaEncoding: "ieee-p1363",
    });
    return `${signingInput}.${base64url(signature)}`;
  } catch {
    return null;
  }
}
