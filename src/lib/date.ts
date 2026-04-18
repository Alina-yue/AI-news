export function formatPublishTime(isoString: string, originalPublished?: string): string {
  if (originalPublished && originalPublished.trim()) {
    const parsedDate = parseOriginalDate(originalPublished);
    if (parsedDate) {
      return parsedDate;
    }
  }
  
  const date = new Date(isoString);
  
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function parseOriginalDate(dateStr: string): string | null {
  const patterns = [
    /(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::\d{2})?/,
    /(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})/,
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const year = match[1];
      const month = String(parseInt(match[2])).padStart(2, "0");
      const day = String(parseInt(match[3])).padStart(2, "0");
      if (match[4] && match[5]) {
        const hour = String(parseInt(match[4])).padStart(2, "0");
        const minute = match[5];
        return `${year}-${month}-${day} ${hour}:${minute}`;
      }
      return `${year}-${month}-${day} 00:00`;
    }
  }
  
  const rfcPattern = /(\d{2})\s+(\w+)\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/;
  const rfcMatch = dateStr.match(rfcPattern);
  if (rfcMatch) {
    const months: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const day = rfcMatch[1];
    const month = months[rfcMatch[2]] || '01';
    const year = rfcMatch[3];
    const hour = rfcMatch[4];
    const minute = rfcMatch[5];
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  
  return null;
}
