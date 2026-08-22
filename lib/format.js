export function formatAction(action) {
  return (action || "").replaceAll("_", " ");
}

export function formatMoney(value) {
  return `$${Number(value).toFixed(0)}`;
}
