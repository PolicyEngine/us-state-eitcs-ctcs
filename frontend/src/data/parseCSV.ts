export function parseCSV<T>(text: string): T[] {
  // Split on ?
 and strip stray : CSVs checked out on Windows can
  // carry CRLF endings, and a trailing  on the last header would
  // otherwise silently rename that column (child_population -> zeroed
  // child stats on the live site).
  const lines = text.trim().split(/?
/);
  const headers = lines[0].split(",").map((h) => h.trim());
  const data: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string | number> = {};
    headers.forEach((header, idx) => {
      const val = (values[idx] ?? "").trim();
      row[header] = val === "" || isNaN(Number(val)) ? val : parseFloat(val);
    });
    data.push(row as T);
  }
  return data;
}
