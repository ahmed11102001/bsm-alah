let warnedDeprecatedSecret = false;

export function warnDeprecatedSecretOnce(prefix: string) {
  if (warnedDeprecatedSecret) return;
  warnedDeprecatedSecret = true;
  console.warn(`${prefix} Using deprecated WHATSAPP_APP_SECRET — please rename to META_APP_SECRET`);
}
