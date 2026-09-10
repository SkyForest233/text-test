export type ParseStatus = 'parsed' | 'review' | 'unparsed';
export interface FileRecord {
  id: string;
  filename: string;
  users: string[];
  status: ParseStatus;
  reason: string;
  kind: string;
  contentId: string;
  corrected: boolean;
}
export interface Settings { knownNames: string; dedupePosts: boolean; }
export interface UserStat { name: string; count: number; collaborations: number; pending: number; files: FileRecord[]; aliases: string[]; }
export interface MergeEntry { id: string; names: string[]; target: string; at: string; previous: Record<string, string>; }
export const DEFAULT_SETTINGS: Settings = { knownNames: '', dedupePosts: false };
const mediaExtension = /\.(mp4|mov|mkv|avi|webm|m4v|ts|jpg|jpeg|png|gif|webp|heic|mp3|wav|flac|zip|pdf)$/i;
// Example-derived segmentation hints, not verified identities or automatic merges.
const usernameHints = ['higher_animal', 'g_mguy', 'S_men2024', 'qiuming_ss', 'KamuiHY_X', 'lp_puppy'];

export function tokenize(text: string): string[] {
  const output: string[] = [];
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n|[,，;；]/)) {
    const line = raw.trim();
    if (!line) continue;
    const matches = [...line.matchAll(/[^\s"']+(?:[ \t]+[（(]\d+[）)][^\s"']*)?\.(?:mp4|mov|mkv|avi|webm|m4v|ts|jpg|jpeg|png|gif|webp|heic|mp3|wav|flac|zip|pdf)(?=\s|["']|$)/gi)];
    if (matches.length > 1) {
      let end = 0;
      for (const match of matches) {
        const remainder = line.slice(end, match.index).replace(/["']/g, '').trim();
        if (remainder) output.push(remainder);
        output.push(match[0]);
        end = (match.index ?? 0) + match[0].length;
      }
      const remainder = line.slice(end).replace(/["']/g, '').trim();
      if (remainder) output.push(remainder);
    } else output.push(line.replace(/^["']|["']$/g, ''));
  }
  return output;
}

function extract(filename: string) {
  const base = filename.split(/[\\/]/).pop() || filename;
  if (!mediaExtension.test(base)) return { prefix: '', contentId: '', kind: '未知格式', missing: false };
  const stem = base.replace(mediaExtension, '').replace(/_+$/, '');
  const numeric = stem.match(/^(.+?)_(\d{14,22})(?:_(?:\d+|NA))?(?:_.*)?$/i);
  if (numeric) return { prefix: numeric[1], contentId: numeric[2], kind: '数字作品 ID', missing: false };
  const timestamp = stem.match(/^(.+?)_(\d{13})(?:_(?:\d+|NA))?$/i);
  if (timestamp) return { prefix: timestamp[1], contentId: timestamp[2], kind: '13 位数字标识', missing: false };
  const numbered = stem.match(/^(.+)_\d{1,6}\s*[（(]\d{1,6}[）)]$/);
  if (numbered) return { prefix: numbered[1], contentId: '', kind: '序号 + 重名编号', missing: false };
  const uuid = stem.match(/^(.+)_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
  if (uuid) return { prefix: uuid[1], contentId: uuid[2], kind: 'UUID 标识', missing: false };
  const quality = stem.match(/^(.+)_([a-zA-Z0-9-]{6,32})_{3,}(?:\d{3,4}p|[248]k)$/i);
  if (quality) return { prefix: quality[1], contentId: quality[2], kind: '下载标识 + 清晰度', missing: false };
  const random = stem.match(/^(.+)_([a-zA-Z0-9_-]{16})$/) || stem.match(/^(.+)_([a-zA-Z0-9_-]{15})$/);
  if (random && /[A-Z0-9-]/.test(random[2]) && !/_{3,}/.test(random[2])) return { prefix: random[1], contentId: random[2], kind: '随机下载标识', missing: false };
  return { prefix: '', contentId: '', kind: '未知格式', missing: false, stem };
}

export function analyze(text: string, settings: Settings, overrides: Record<string, string[]> = {}): FileRecord[] {
  const filenames = tokenize(text);
  const extracted = filenames.map(extract);
  const known = settings.knownNames.split(/[,，\n]/).map(x => x.trim().replace(/^@/, '')).filter(Boolean);
  const prefixFrequency = new Map<string, number>();
  extracted.forEach(x => { if (x.prefix) prefixFrequency.set(x.prefix, (prefixFrequency.get(x.prefix) || 0) + 1); });
  const inferredNames = [...prefixFrequency.entries()].filter(([name, count]) => count >= 2 && /^[a-z]+_[a-z]+$/.test(name)).map(([name]) => name);
  const standalone = [...prefixFrequency.keys()].filter(x => !x.includes('_'));
  const intactNames = [...new Set([...known, ...usernameHints, ...inferredNames])].sort((a, b) => b.length - a.length);
  const dictionary = [...new Set([...intactNames, ...standalone])].sort((a, b) => b.length - a.length);
  return filenames.map((filename, index) => {
    const id = `${index}:${filename}`;
    let item = extracted[index];
    if (!item.prefix && item.stem) {
      const joined = intactNames.find(name => item.stem!.startsWith(name) && /^[A-Za-z0-9_-]{16,17}$/.test(item.stem!.slice(name.length)));
      if (joined) item = { prefix: joined, contentId: item.stem.slice(joined.length), kind: '缺失分隔符', missing: true };
    }
    const result: FileRecord = { id, filename, users: [], status: 'unparsed', reason: '未找到可识别的作品 ID 或下载标识，请手动填写用户名。', kind: item.kind, contentId: item.contentId, corrected: false };
    if (item.prefix) {
      const prefix = item.prefix;
      let users: string[] = [];
      if (intactNames.includes(prefix) || !prefix.includes('_')) users = [prefix];
      else {
        let remaining = prefix;
        while (remaining) {
          const match = dictionary.find(name => remaining === name || remaining.startsWith(name + '_'));
          if (match) { users.push(match); remaining = remaining.slice(match.length).replace(/^_/, ''); continue; }
          const parts = remaining.split('_');
          if (parts.length >= 2 && parts[0].length === 1) {
            const name = parts.slice(0, 2).join('_'); users.push(name); remaining = parts.slice(2).join('_');
          } else if (parts.length >= 3 && /^[a-z]{2,}$/.test(parts[0]) && /^[a-z]{2,}$/.test(parts[1]) && /[A-Z0-9]/.test(parts[2])) {
            users.push(parts.slice(0, 2).join('_')); remaining = parts.slice(2).join('_');
          } else { users.push(parts[0]); remaining = parts.slice(1).join('_'); }
        }
      }
      users = [...new Set(users.filter(Boolean))];
      result.users = users;
      const ambiguous = prefix.includes('_') && !known.includes(prefix) && !users.every(name => known.includes(name));
      const numbered = item.kind === '序号 + 重名编号';
      result.status = ambiguous || item.missing || numbered ? 'review' : 'parsed';
      result.reason = item.missing ? '用户名和下载标识之间缺少下划线；根据完整名称候选或重复前缀推测，请确认归属。' : numbered ? '已去除序号与括号编号；用户归属需要确认。此格式没有可靠作品 ID，按文件条目计数，不按编号去重。' : ambiguous ? '下划线可能属于用户名，也可能分隔合作用户；当前拆分仅为推测。' : '已匹配文件命名规则。';
    }
    if (overrides[id]?.length) { result.users = [...new Set(overrides[id])]; result.status = 'parsed'; result.reason = '已由你手动确认。'; result.corrected = true; }
    return result;
  });
}

export function getAttributionCandidates(record: FileRecord, knownNames: string[] = []): string[] {
  const extracted = extract(record.filename);
  const prefix = extracted.prefix || record.users.join('_') || record.filename.split(/[\\/]/).pop()!.replace(mediaExtension, '').replace(/_+$/, '');
  const parts = prefix.split('_').filter(Boolean);
  const adjacent = parts.slice(0, -1).map((part, index) => `${part}_${parts[index + 1]}`);
  const known = [...knownNames, ...usernameHints].filter(name => prefix === name || prefix.startsWith(name + '_') || prefix.endsWith('_' + name) || prefix.includes('_' + name + '_'));
  return [...new Set([...record.users, ...known, ...parts, ...adjacent, prefix])].filter(name => name.length > 0 && name.length <= 100).slice(0, 40);
}

export function canonical(name: string, aliases: Record<string, string>) {
  const visited = new Set<string>();
  let current = name;
  while (Object.hasOwn(aliases, current) && aliases[current] && !visited.has(current)) { visited.add(current); current = aliases[current]; }
  return current;
}

export function summarize(records: FileRecord[], aliases: Record<string, string>, settings: Settings): UserStat[] {
  const stats = new Map<string, UserStat>();
  const seen = new Map<string, Set<string>>();
  const collaborationKeys = new Map<string, Set<string>>();
  const pendingKeys = new Map<string, Set<string>>();
  records.forEach(record => {
    const users = [...new Set(record.users.map(name => canonical(name, aliases)))];
    users.forEach(name => {
      if (!stats.has(name)) stats.set(name, { name, count: 0, collaborations: 0, pending: 0, files: [], aliases: Object.keys(aliases).filter(a => a !== name && canonical(a, aliases) === name) });
      const stat = stats.get(name)!;
      const contentKey = settings.dedupePosts && record.contentId ? record.contentId : record.id;
      if (!seen.has(name)) seen.set(name, new Set());
      stat.files.push(record);
      if (!seen.get(name)!.has(contentKey)) { seen.get(name)!.add(contentKey); stat.count++; }
      if (!collaborationKeys.has(name)) collaborationKeys.set(name, new Set());
      if (!pendingKeys.has(name)) pendingKeys.set(name, new Set());
      if (users.length > 1 && !collaborationKeys.get(name)!.has(contentKey)) { collaborationKeys.get(name)!.add(contentKey); stat.collaborations++; }
      if (record.status !== 'parsed' && !pendingKeys.get(name)!.has(contentKey)) { pendingKeys.get(name)!.add(contentKey); stat.pending++; }
    });
  });
  return [...stats.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = old;
    }
  }
  return row[b.length];
}
export function getSuggestions(users: UserStat[]): [string, string][] {
  const pairs: [string, string][] = [];
  const list = users.slice(0, 350);
  const normalize = (s: string) => s.toLowerCase().replace(/[_\-.]/g, '');
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = normalize(list[i].name), b = normalize(list[j].name);
      if (a === b || (Math.min(a.length, b.length) >= 6 && Math.abs(a.length - b.length) <= 2 && distance(a, b) <= 1)) pairs.push([list[i].name, list[j].name]);
      if (pairs.length >= 12) return pairs;
    }
  }
  return pairs;
}
export function toCsv(rows: (string | number)[][]) {
  return '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell).replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
export function downloadFile(content: string, filename: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}
