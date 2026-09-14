function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to accept M-Pesa payments.`);
  }
  return value;
}

function darajaBaseUrl(): string {
  return process.env["DARAJA_ENV"] === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

async function getAccessToken(): Promise<string> {
  const key = requireEnv("DARAJA_CONSUMER_KEY");
  const secret = requireEnv("DARAJA_CONSUMER_SECRET");
  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");

  const response = await fetch(
    `${darajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } },
  );

  if (!response.ok) {
    throw new Error("Failed to obtain a Daraja access token.");
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/**
 * Sends an STK push prompt to the given phone number for the exact
 * price of a single resource. amount is rounded to the nearest whole
 * shilling since Daraja doesn't accept decimals.
 */
export async function initiateStkPush(params: {
  phoneNumber: string; // 2547XXXXXXXX / 2541XXXXXXXX format
  amount: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<StkPushResult> {
  const shortcode = requireEnv("DARAJA_SHORTCODE");
  const passkey = requireEnv("DARAJA_PASSKEY");
  const callbackUrl = requireEnv("DARAJA_CALLBACK_URL");

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64",
  );
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${darajaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(params.amount),
        PartyA: params.phoneNumber,
        PartyB: shortcode,
        PhoneNumber: params.phoneNumber,
        CallBackURL: callbackUrl,
        AccountReference: params.accountReference,
        TransactionDesc: params.transactionDesc,
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const message =
      (data as { errorMessage?: string })?.errorMessage ??
      "Failed to initiate M-Pesa payment.";
    throw new Error(message);
  }

  return data as StkPushResult;
}
