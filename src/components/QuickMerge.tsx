import { useMemo, useState } from 'react';
import { ArrowRight, Check, GitMerge, Info, Plus, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import { Dialog } from './Dialog';
import { type UserStat } from '../lib/analyzer';
import { groupSuggestions, type MergeRequest } from '../lib/merging';

export function QuickMerge({ users, suggestions, initialNames, canUndo, onMerge, onUndo, onClose }: {
  users: UserStat[]; suggestions: [string, string][]; initialNames: string[]; canUndo: boolean;
  onMerge: (requests: MergeRequest[], keepOpen: boolean) => boolean; onUndo: () => void; onClose: () => void;
}) {
  const [names, setNames] = useState(initialNames);
  const [target, setTarget] = useState(initialNames[0] || '');
  const [search, setSearch] = useState('');
  const [chosenGroups, setChosenGroups] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupSuggestions(suggestions).map(group => users.filter(user => group.includes(user.name)).map(user => user.name)), [users, suggestions]);
  const keyOf = (group: string[]) => JSON.stringify([...group].sort());
  const selectedGroups = groups.filter(group => chosenGroups.has(keyOf(group)));
  const available = new Set(users.map(user => user.name));
  const selected = names.filter(name => available.has(name));
  const filtered = users.filter(user => [user.name, ...user.aliases].some(name => name.toLowerCase().includes(search.toLowerCase())));
  function updateNames(next: string[]) {
    setNames(next);
    if (!target || (names.includes(target) && !next.includes(target))) setTarget(next[0] || '');
  }
  function toggleName(name: string) { updateNames(selected.includes(name) ? selected.filter(item => item !== name) : [...selected, name]); }
  function submitGroups(chosen: string[][]) {
    if (!chosen.length) return;
    if (onMerge(chosen.map(group => ({ names: group, target: group[0] })), true)) { setChosenGroups(new Set()); setNames([]); setTarget(''); }
  }
  return <Dialog title="把不同的名字，归集到一起" subtitle="点一次确认相似名字，也可以多选分组批量合并。" onClose={onClose}>
    <div className="notice warning"><Info size={16} /><span>相似不代表同一人。点「确认合并」即确认身份，默认保留该组内容最多的名字；不同组分别合并。</span></div>
    <section className="quick-merge-section">
      <div className="quick-section-head"><span><Sparkles size={15} />相似名称 <small>{groups.length} 组</small></span>{canUndo && <button className="text-button" onClick={onUndo}><RotateCcw size={13} />撤销上次</button>}</div>
      {groups.length > 0 ? <><div className="quick-group-list">{groups.map(group => <div className="quick-group" key={keyOf(group)}>
        <label className="quick-group-pick"><input type="checkbox" aria-label={`选择相似组 ${group.join('、')}`} checked={chosenGroups.has(keyOf(group))} onChange={() => setChosenGroups(previous => { const next = new Set(previous); if (next.has(keyOf(group))) next.delete(keyOf(group)); else next.add(keyOf(group)); return next; })} /><span><strong>{group[0]}</strong><span className="quick-aliases">{group.slice(1).map(name => <span key={name}>{name}</span>)}</span><small>归集为 {group[0]}</small></span></label>
        <div className="quick-group-actions"><button className="button button-primary button-small" aria-label={`确认合并相似组 ${group.join('、')}`} onClick={() => submitGroups([group])}><Check size={13} />确认合并</button><button className="text-button" onClick={() => { updateNames([...new Set([...selected, ...group])]); if (!target) setTarget(group[0]); }}>加入多选<Plus size={12} /></button></div>
      </div>)}</div><div className="quick-batch-bar"><button className="text-button" onClick={() => setChosenGroups(selectedGroups.length === groups.length ? new Set() : new Set(groups.map(keyOf)))}>{selectedGroups.length === groups.length ? '取消全选' : '全选相似组'}</button><button className="button button-primary button-small" disabled={!selectedGroups.length} onClick={() => submitGroups(selectedGroups)}>合并所选 {selectedGroups.length} 组<GitMerge size={13} /></button></div></> : <p className="quick-empty">暂无相似名称建议，可在下方搜索并多选任意用户。</p>}
    </section>
    <label className="field-label" htmlFor="merge-search">手动多选 · 合并为同一用户 <span>已选 {selected.length} 位</span></label>
    <label className="search-input merge-search"><Search size={15} /><input id="merge-search" placeholder="搜索用户名或别名，自动匹配…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="清空合并搜索" onClick={() => setSearch('')}><X size={14} /></button>}</label>
    {selected.length > 0 && <div className="pick-chips selected-merge-chips">{selected.map(name => <button key={name} aria-label={`取消选择 ${name}`} className="picked" onClick={() => toggleName(name)}>{name}<X size={12} /></button>)}</div>}
    <div className="quick-selection-tools"><button className="text-button" disabled={!filtered.length} onClick={() => updateNames([...new Set([...selected, ...filtered.map(user => user.name)])])}>选择搜索结果 ({filtered.length})</button>{selected.length > 0 && <button className="text-button" onClick={() => { updateNames([]); setTarget(''); }}>清空选择</button>}</div>
    <div className="merge-user-list">{filtered.map(user => <label key={user.name}><input type="checkbox" checked={selected.includes(user.name)} onChange={() => toggleName(user.name)} /><span className="avatar green small-avatar">{user.name.slice(0, 2).toUpperCase()}</span><span>{user.name}</span><small>{user.count} 份内容</small></label>)}{!filtered.length && <p className="no-users">没有匹配的用户，试试其他关键词。</p>}</div>
    <label className="field-label" htmlFor="merge-name">合并后的统一用户名 <span>选择后自动填入</span></label>
    <input id="merge-name" className="text-input" value={target} onChange={event => setTarget(event.target.value)} placeholder="自动填入首个所选名字，也可自定义" />
    {selected.length > 0 && <div className="pick-chips target-options">{selected.map(name => <button className={target === name ? 'picked' : ''} aria-pressed={target === name} key={name} onClick={() => setTarget(name)}>{target === name ? <Check size={12} /> : <ArrowRight size={12} />}{name}</button>)}</div>}
    <div className="dialog-bottom"><span className="input-helper">全部操作可在合并记录中逐次撤销</span><button className="button button-primary" disabled={selected.length < 2 || !target.trim()} onClick={() => onMerge([{ names: selected, target }], false)}><GitMerge size={15} />确认合并 {selected.length > 0 ? `(${selected.length})` : ''}</button></div>
  </Dialog>;
}
