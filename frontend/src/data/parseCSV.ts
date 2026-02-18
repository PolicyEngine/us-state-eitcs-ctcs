export function parseCSV<T>(text: string): T[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  const data: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string | number> = {};
    headers.forEach((header, idx) => {
      const val = values[idx];
      row[header] = isNaN(Number(val)) ? val : parseFloat(val);
    });
    data.push(row as T);
  }
  return data;
}
