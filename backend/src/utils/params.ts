/** Express req.params values may be string | string[] — normalize to string */
export function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
