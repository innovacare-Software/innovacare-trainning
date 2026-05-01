import crypto from "node:crypto";

export type MobileMoneyGateway = "centpay" | "cinetpay" | "flutterwave" | "campay";
export type MobileMoneyPaymentStatus = "pending" | "success" | "failed";

export type MobileMoneyGatewayConfig = {
  gateway: MobileMoneyGateway;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
};

export type CreateMobileMoneyChargeInput = {
  itemType?: "program" | "wallet_topup";
  amount: number;
  currency: string;
  reference: string;
  phone: string;
  provider: string;
  callbackUrl: string;
  successUrl?: string;
  cancelUrl?: string;
  customer: {
    id: string;
    email?: string;
    name?: string;
  };
  metadata: Record<string, string>;
};

export type CreateMobileMoneyChargeResult = {
  reference: string;
  status: MobileMoneyPaymentStatus;
  providerTransactionId?: string | null;
  checkoutUrl?: string | null;
  raw: Record<string, unknown>;
};

export type MobileMoneyWebhookEvent = {
  eventId: string;
  reference: string;
  providerTransactionId?: string | null;
  status: MobileMoneyPaymentStatus;
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sanitizeCinetPayToken(value: string, fallback: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9]/g, "").trim();
  return sanitized || fallback;
}

function sanitizeCinetPayDescription(value: string): string {
  return value.replace(/[^a-zA-Z0-9 .-]/g, " ").replace(/\s+/g, " ").trim();
}

function buildCinetPayCustomerProfile(name: string, phone: string) {
  const normalizedName = name.trim() || "Customer";
  const nameParts = normalizedName.split(/\s+/).filter(Boolean);
  const customerName = nameParts[0] || "Customer";
  const customerSurname = nameParts.slice(1).join(" ") || "Customer";
  const normalizedPhone = phone.replace(/\s+/g, "");

  return {
    customerName,
    customerSurname,
    customerPhone: normalizedPhone,
    customerAddress: "N/A",
    customerCity: "N/A",
    customerCountry: "CM",
    customerState: "CM",
    customerZipCode: "00000",
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function signPayload(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function inferCommonStatus(value: unknown): MobileMoneyPaymentStatus {
  const normalized = String(value || "").trim().toLowerCase();
  if (["success", "successful", "paid", "completed", "complete", "approved"].includes(normalized)) {
    return "success";
  }
  if (["failed", "error", "cancelled", "canceled", "declined", "rejected", "expired"].includes(normalized)) {
    return "failed";
  }
  return "pending";
}

function buildPaymentDescription(input: CreateMobileMoneyChargeInput): string {
  const label = input.itemType === "wallet_topup" ? "Wallet top-up" : "Program payment";
  return `${label} ${input.reference}`.trim();
}

async function postJson(
  url: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: Record<string, unknown> = {};

  try {
    json = text ? asRecord(JSON.parse(text)) : {};
  } catch {
    json = {rawText: text};
  }

  if (!response.ok) {
    const message = String(json.message || json.code || json.error || `Mobile Money provider returned ${response.status}`);
    console.error("[postJson] provider error", { status: response.status, responseBody: json });
    throw new Error(message);
  }

  return json;
}

async function createCentpayCharge(
  config: MobileMoneyGatewayConfig,
  input: CreateMobileMoneyChargeInput
): Promise<CreateMobileMoneyChargeResult> {
  const payload = {
    amount: input.amount,
    currency: input.currency,
    reference: input.reference,
    msisdn: input.phone,
    operator: input.provider,
    callbackUrl: input.callbackUrl,
    returnUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    customer: {
      id: input.customer.id,
      email: input.customer.email,
      name: input.customer.name,
    },
    metadata: input.metadata,
  };

  const body = JSON.stringify(payload);
  const raw = await postJson(
    `${normalizeBaseUrl(config.baseUrl)}/payments/mobile-money`,
    payload,
    {
      authorization: `Bearer ${config.apiKey}`,
      "x-signature": signPayload(config.apiSecret, body),
    }
  );

  return {
    reference: String(raw.reference || input.reference),
    status: inferCommonStatus(raw.status),
    providerTransactionId: String(raw.transactionId || raw.providerTransactionId || "").trim() || null,
    checkoutUrl: String(raw.checkoutUrl || raw.paymentUrl || "").trim() || null,
    raw,
  };
}

async function createCinetPayCharge(
  config: MobileMoneyGatewayConfig,
  input: CreateMobileMoneyChargeInput
): Promise<CreateMobileMoneyChargeResult> {
  // CinetPay v2 uses "MOBILE_MONEY" as the generic channel value.
  // Operator-specific channel names (MTN_MONEY etc.) are not valid for their API.
  const providerChannel = "MOBILE_MONEY";
  const providerReference = sanitizeCinetPayToken(input.reference, `PAY${Date.now()}`);
  const providerMetadata = JSON.stringify(input.metadata);
  const customerProfile = buildCinetPayCustomerProfile(
    input.customer.name || input.customer.id || "Customer",
    input.phone,
  );
  const payload = {
    apikey: config.apiKey,
    site_id: config.apiSecret,
    transaction_id: providerReference,
    amount: input.amount,
    currency: input.currency,
    channels: providerChannel,
    description: sanitizeCinetPayDescription(
      `${input.itemType === "wallet_topup" ? "Wallet top-up" : "Program payment"} ${input.reference}`
    ),
    customer_id: input.customer.id || "guest",
    customer_name: customerProfile.customerName,
    customer_surname: customerProfile.customerSurname,
    customer_email: input.customer.email || `${input.customer.id}@innovacarereview.com`,
    customer_phone_number: customerProfile.customerPhone,
    customer_contact: customerProfile.customerPhone,
    customer_address: customerProfile.customerAddress,
    customer_city: customerProfile.customerCity,
    customer_country: customerProfile.customerCountry,
    customer_state: customerProfile.customerState,
    customer_zip_code: customerProfile.customerZipCode,
    notify_url: input.callbackUrl,
    return_url: input.successUrl || "",
    metadata: providerMetadata,
  };

  console.info("[CinetPay] payload fields", {
    transaction_id: payload.transaction_id,
    amount: payload.amount,
    currency: payload.currency,
    channels: payload.channels,
    customer_id_present: !!payload.customer_id,
    customer_name_present: !!payload.customer_name,
    customer_surname_present: !!payload.customer_surname,
    customer_email_present: !!payload.customer_email,
    customer_phone_present: !!payload.customer_phone_number,
    customer_address_present: !!payload.customer_address,
    customer_city_present: !!payload.customer_city,
    customer_country_present: !!payload.customer_country,
    customer_state_present: !!payload.customer_state,
    customer_zip_code_present: !!payload.customer_zip_code,
    metadata_length: providerMetadata.length,
    notify_url: payload.notify_url,
    return_url: payload.return_url,
  });

  const raw = await postJson(`${normalizeBaseUrl(config.baseUrl)}/v2/payment`, payload, {});
  const data = asRecord(raw.data);

  return {
    reference: String(data.transaction_id || data.cpm_trans_id || raw.reference || input.reference),
    status: inferCommonStatus(data.status || data.payment_status || raw.code || raw.status),
    providerTransactionId: String(data.payment_token || data.operator_id || data.cpm_payid || "").trim() || null,
    checkoutUrl: String(data.payment_url || data.payment_link || data.payment_token || "").trim() || null,
    raw,
  };
}

async function createFlutterwaveCharge(
  config: MobileMoneyGatewayConfig,
  input: CreateMobileMoneyChargeInput
): Promise<CreateMobileMoneyChargeResult> {
  const payload = {
    tx_ref: input.reference,
    amount: input.amount,
    currency: input.currency,
    redirect_url: input.successUrl,
    payment_options: "mobilemoney",
    customer: {
      email: input.customer.email,
      phone_number: input.phone,
      name: input.customer.name,
    },
    customizations: {
      title: "Innovacare Review",
      description: `Program payment ${input.reference}`,
    },
    meta: input.metadata,
  };

  const raw = await postJson(
    `${normalizeBaseUrl(config.baseUrl)}/payments`,
    payload,
    {authorization: `Bearer ${config.apiKey}`}
  );
  const data = asRecord(raw.data);

  return {
    reference: String(data.tx_ref || raw.reference || input.reference),
    status: inferCommonStatus(data.status || raw.status),
    providerTransactionId: String(data.id || data.flw_ref || "").trim() || null,
    checkoutUrl: String(data.link || raw.link || "").trim() || null,
    raw,
  };
}

async function createCampayCharge(
  config: MobileMoneyGatewayConfig,
  input: CreateMobileMoneyChargeInput
): Promise<CreateMobileMoneyChargeResult> {
  const payload = {
    amount: input.amount,
    currency: input.currency,
    from: input.phone.replace(/\s+/g, ""),
    description: buildPaymentDescription(input),
    external_reference: input.reference,
    external_user: input.customer.id,
    callback_url: input.callbackUrl,
    return_url: input.successUrl,
    metadata: input.metadata,
  };

  const headers: Record<string, string> = {
    authorization: `Token ${config.apiKey}`,
  };

  if (config.apiSecret) {
    headers["x-application-id"] = config.apiSecret;
  }

  const raw = await postJson(
    `${normalizeBaseUrl(config.baseUrl)}/api/collect/`,
    payload,
    headers
  );

  const data = asRecord(raw.data);

  return {
    reference: String(data.external_reference || data.reference || raw.reference || input.reference),
    status: inferCommonStatus(data.status || raw.status || raw.message),
    providerTransactionId: String(
      data.reference || data.transaction_id || data.operator_reference || data.id || ""
    ).trim() || null,
    checkoutUrl: String(data.payment_url || data.checkout_url || data.redirect_url || "").trim() || null,
    raw,
  };
}

export async function createMobileMoneyCharge(
  config: MobileMoneyGatewayConfig,
  input: CreateMobileMoneyChargeInput
): Promise<CreateMobileMoneyChargeResult> {
  switch (config.gateway) {
  case "cinetpay":
    return createCinetPayCharge(config, input);
  case "flutterwave":
    return createFlutterwaveCharge(config, input);
  case "campay":
    return createCampayCharge(config, input);
  case "centpay":
  default:
    return createCentpayCharge(config, input);
  }
}

export function verifyMobileMoneyWebhookSignature(
  config: MobileMoneyGatewayConfig,
  rawBody: Buffer,
  signatureHeader: string | undefined
): boolean {
  if (config.gateway === "cinetpay" || config.gateway === "campay") {
    if (!config.webhookSecret) {
      return true;
    }

    if (!signatureHeader) {
      return false;
    }

    const provided = signatureHeader.trim();
    const stripped = provided.replace(/^(Token|Bearer)\s+/i, "").trim();
    const expected = config.webhookSecret.trim();
    return provided === expected || stripped === expected;
  }

  if (!signatureHeader) {
    return false;
  }

  const expected = signPayload(config.webhookSecret, rawBody.toString("utf8"));
  const provided = signatureHeader.trim();

  if (expected.length !== provided.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export function parseMobileMoneyWebhook(
  config: MobileMoneyGatewayConfig,
  body: unknown,
  headers: Record<string, string | string[] | undefined>
): MobileMoneyWebhookEvent {
  const raw = asRecord(body);
  const data = asRecord(raw.data);
  const topLevelReference = String(
    raw.reference || raw.external_reference || raw.tx_ref || raw.transaction_id || raw.cpm_trans_id || ""
  ).trim();
  const nestedReference = String(
    data.reference || data.external_reference || data.tx_ref || data.transaction_id || data.cpm_trans_id || ""
  ).trim();
  const reference = topLevelReference || nestedReference;
  const headerEventId = headers["x-event-id"];
  const firstHeaderEventId = Array.isArray(headerEventId) ? headerEventId[0] : headerEventId;
  const eventId =
    String(raw.eventId || raw.id || data.id || data.eventId || firstHeaderEventId || reference).trim() ||
    crypto.randomUUID();

  if (!reference) {
    throw new Error(`Missing payment reference in ${config.gateway} webhook payload.`);
  }

  return {
    eventId,
    reference,
    providerTransactionId: String(
      raw.providerTransactionId ||
      raw.transactionId ||
      raw.transaction_id ||
      raw.cpm_payid ||
      data.providerTransactionId ||
      data.transactionId ||
      data.transaction_id ||
      data.flw_ref ||
      data.cpm_payid ||
      data.operator_reference ||
      ""
    ).trim() || null,
    status: inferCommonStatus(raw.status || raw.event || raw.cpm_result || data.status || data.payment_status || data.cpm_result || data.code),
    raw,
  };
}