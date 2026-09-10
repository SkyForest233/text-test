import { canonical, type MergeEntry } from './analyzer';
export interface MergeRequest { names: string[]; target: string; }

export function groupSuggestions(pairs: [string, string][]): string[][] {
  const groups: Set<string>[] = [];
  for (const [a, b] of pairs) {
    const connected = groups.filter(group => group.has(a) || group.has(b));
    const combined = new Set([a, b, ...connected.flatMap(group => [...group])]);
    connected.forEach(group => groups.splice(groups.indexOf(group), 1));
    groups.push(combined);
  }
  return groups.map(group => [...group]);
}

export function prepareMerges(current: Record<string, string>, requests: MergeRequest[], available: string[]) {
  let aliases: Record<string, string> = Object.assign(Object.create(null), current);
  const entries: MergeEntry[] = [];
  const active = new Set(available);
  for (const request of requests) {
    const names = [...new Set(request.names.map(name => canonical(name, aliases)))];
    const target = request.target.trim().replace(/^@/, '');
    if (names.length < 2 || !target || /[,，\n]/.test(target)) throw new Error('请至少选择两个用户名，并填写一个统一名称。');
    if (names.some(name => !active.has(name))) throw new Error('所选用户已变化，请重新选择。');
    const existingTarget = canonical(target, aliases);
    if (active.has(existingTarget) && !names.includes(existingTarget)) throw new Error('这个名称或别名已存在，请将对应用户也加入本次合并。');
    const previous = { ...aliases };
    // Flatten affected aliases before promoting an existing alias to the main name.
    for (const name of Object.keys(aliases)) {
      if (names.includes(canonical(name, previous))) aliases[name] = target;
    }
    delete aliases[target];
    names.forEach(name => { if (name !== target) aliases[name] = target; });
    entries.push({ id: crypto.randomUUID(), names, target, at: new Date().toISOString(), previous });
    names.forEach(name => active.delete(name)); active.add(target);
  }
  return { aliases, entries };
}
