import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
// SigV4 signing using Web Crypto API (no Node.js required)
async function sha256(data) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
}
function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
async function hmacSha256(key, data) {
    const keyBuffer = typeof key === "string"
        ? new TextEncoder().encode(key)
        : key;
    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}
async function cognitoAdminCreateUser(region, userPoolId, email, accessKeyId, secretAccessKey) {
    const host = `cognito-idp.${region}.amazonaws.com`;
    const body = JSON.stringify({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
        ],
        DesiredDeliveryMediums: ["EMAIL"],
    });
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
    const amzDate = dateStamp + "T" + now.toISOString().replace(/[-:]/g, "").slice(9, 15) + "Z";
    const service = "cognito-idp";
    const target = "AWSCognitoIdentityProviderService.AdminCreateUser";
    const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
    const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
    const payloadHash = toHex(await sha256(body));
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = toHex(await sha256(canonicalRequest));
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
    const kDate = await hmacSha256("AWS4" + secretAccessKey, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const signingKey = await hmacSha256(kService, "aws4_request");
    const signature = toHex(await hmacSha256(signingKey, stringToSign));
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const res = await fetch(`https://${host}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Date": amzDate,
            "X-Amz-Target": target,
            Authorization: authorization,
            Host: host,
        },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cognito AdminCreateUser failed: ${res.status} ${text}`);
    }
    return (await res.json());
}
export const invite = action({
    args: {
        cognitoSub: v.string(),
        email: v.string(),
        isSuperAdmin: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const isSuperAdmin = await ctx.runQuery(internal.admin.users.verifySuperAdmin, { cognitoSub: args.cognitoSub });
        if (!isSuperAdmin)
            throw new Error("Forbidden: superAdmin required");
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const region = process.env.AWS_REGION ?? "us-east-1";
        if (!userPoolId || !accessKeyId || !secretAccessKey) {
            throw new Error("Missing AWS/Cognito environment variables");
        }
        const result = await cognitoAdminCreateUser(region, userPoolId, args.email, accessKeyId, secretAccessKey);
        const newCognitoSub = result.User?.Attributes?.find((a) => a.Name === "sub")?.Value;
        if (!newCognitoSub)
            throw new Error("Failed to get Cognito sub from invite");
        await ctx.runMutation(internal.admin.users.insertUser, {
            email: args.email,
            cognitoSub: newCognitoSub,
            isSuperAdmin: args.isSuperAdmin ?? false,
        });
        return { success: true };
    },
});
