import { useMemo, useState } from 'react';
import { Check, Plus, RotateCcw, Search, X } from 'lucide-react';
import { getAttributionCandidates, type FileRecord } from '../lib/analyzer';

export function AttributionPicker({ record, value, onChange, knownNames }: { record: FileRecord; value: string; onChange: (value: string) => void; knownNames: string[] }) {
  const [query, setQuery] = useState('');
  const selected = [...new Set(value.split(/[,，\n]/).map(name => name.trim().replace(/^@/, '')).filter(Boolean))];
  const candidates = useMemo(() => getAttributionCandidates(record, knownNames), [record, knownNames]);
  const matches = query.trim() ? [...new Set([...candidates, ...knownNames])].filter(name => name.toLowerCase().includes(query.trim().toLowerCase()) && !selected.includes(name)).slice(0, 12) : [];
  const isPart = (part: string, name: string) => name === part || name.startsWith(part + '_') || name.endsWith('_' + part) || name.includes('_' + part + '_');
  function choose(name: string) {
    if (selected.includes(name)) onChange(selected.filter(item => item !== name).join(', '));
    else onChange([...selected.filter(item => !isPart(item, name) && !isPart(name, item)), name].join(', '));
  }
  function addQuery() {
    const additions = query.split(/[,，\n]/).map(name => name.trim().replace(/^@/, '')).filter(Boolean);
    if (!additions.length) return;
    onChange([...new Set([...selected, ...additions])].join(', ')); setQuery('');
  }
  return <section className="attribution-picker">
    <div className="quick-section-head"><span>这份内容属于谁？<small>已选 {selected.length} 位</small></span><button className="text-button" onClick={() => onChange(record.users.join(', '))}><RotateCcw size={12} />恢复推测</button></div>
    <div className="pick-chips chosen-authors" aria-label="已选归属用户">{selected.map(name => <button className="picked" key={name} aria-label={`移除归属 ${name}`} onClick={() => choose(name)}>{name}<X size={13} /></button>)}{!selected.length && <span className="input-helper">点击下方候选标签，或搜索并添加用户名。</span>}</div>
    <div className="quick-selection-tools"><button className="text-button" disabled={!selected.some(name => name.includes('_'))} onClick={() => onChange([...new Set(selected.flatMap(name => name.split('_').filter(Boolean)))].join(', '))}>按下划线拆开</button><button className="text-button" disabled={selected.length < 2} onClick={() => onChange(selected.join('_'))}>合成一个用户名</button><button className="text-button" disabled={!selected.length} onClick={() => onChange('')}>清空</button></div>
    <div className="field-label">文件名候选 · 点击选择</div>
    <div className="pick-chips candidate-authors">{candidates.map(name => <button key={name} aria-label={`候选归属 ${name}`} aria-pressed={selected.includes(name)} className={selected.includes(name) ? 'picked' : ''} onClick={() => choose(name)}>{selected.includes(name) ? <Check size={12} /> : <Plus size={12} />}{name}</button>)}</div>
    <p className="input-helper picker-explanation">选中组合名称会替换对应的拆分标签；候选仅供核对，不代表已确认归属。</p>
    <div className="attribution-search"><label className="search-input"><Search size={15} /><input aria-label="搜索或补充归属用户名" placeholder="搜索已有用户名，或输入新名字…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addQuery(); } }} /></label><button className="button button-small" disabled={!query.trim()} onClick={addQuery}><Plus size={14} />添加</button></div>
    {matches.length > 0 && <div className="pick-chips autocomplete-authors" aria-label="用户名自动补全">{matches.map(name => <button key={name} onClick={() => { choose(name); setQuery(''); }}><Plus size={12} />{name}</button>)}</div>}
    <details className="manual-attribution"><summary>手动编辑文本</summary><label className="field-label" htmlFor="review-names">这份内容属于谁？</label><textarea id="review-names" className="text-area review-names" value={value} onChange={event => onChange(event.target.value)} placeholder="完整用户名用逗号或换行区隔" /></details>
  </section>;
}
