export function convertToISO(datetime: string): string {
  const date = new Date(datetime);
  return date.toISOString().slice(0, 19); 
}
