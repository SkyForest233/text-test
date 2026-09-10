import assert from 'node:assert/strict';
import { analyze, summarize, canonical, getSuggestions, getAttributionCandidates, toCsv, DEFAULT_SETTINGS } from '../src/lib/analyzer';
import { groupSuggestions, prepareMerges } from '../src/lib/merging';
import { SAMPLE_TEXT } from '../src/lib/sample';
const sample = analyze(SAMPLE_TEXT, DEFAULT_SETTINGS);
assert.equal(sample.length, 42);
assert.equal(analyze(SAMPLE_TEXT.replaceAll('\n', ' '), DEFAULT_SETTINGS).length, 42);
const expectedSampleUsers = [
  ['JoelMaud70028', 'Pap0927', 'NIUNIU6910'],
  ['higher_animal', 'Sisisiye123'],
  ['higher_animal', 'Sisisiye123'],
  ['taichungyellow'],
  ['chiluo666', 'g_mguy', 'urano007'],
  ['g_mguy', 'urano007', 'S_men2024'],
  ['g_mguy', 'urano007', 'S_men2024'],
  ['GqL40382'], ['gzpenpen'], ['gzpenpen'], ['xiaofangqingtia'],
  ['Fantasy93815579'], ['Asternminate'], ['Asternminate'], ['Asternminate'],
  ['SlagCat0948', 'xiaofangqingtia', 'Beamsling1122'],
  ['xiaofangqingtia'], ['1S4678295981650'], ['omi011525'], ['zhouzhe41920465'],
  ['GUGULI2474'], ['ljack0231'], ['ShunXiao5996'], ['jnyyun440730'],
  ['qiuming_ss'], ['qiuming_ss'], ['tutu9990'], ['lwdsdick'],
  ['qiuming_ss'], ['qiuming_ss'], ['qiuming_ss'],
  ['yngyng2529121'], ['yngyng2529121'], ['Ymmmmm03'], ['Ymmmmm03'], ['Ymmmmm03'],
  ['CadureM'], ['chengdu000mmm', 'iw4ooo'], ['gzpenpen'], ['gzpenpen'], ['gzpenpen'],
  ['laadcz', 'luerduo'],
];
assert.equal(expectedSampleUsers.length, sample.length);
sample.forEach((record, index) => {
  assert.deepEqual(record.users, expectedSampleUsers[index], record.filename);
  assert.notEqual(record.status, 'unparsed', record.filename);
  assert.ok(record.contentId.length > 0, record.filename);
  const isolated = analyze(record.filename, DEFAULT_SETTINGS)[0];
  assert.deepEqual(isolated.users, expectedSampleUsers[index], `Single-file import: ${record.filename}`);
  assert.equal(isolated.contentId, record.contentId);
  if (record.users.length > 1 || record.users.some(name => name.includes('_'))) {
    assert.equal(record.status, 'review', `Unverified attribution must remain flagged: ${record.filename}`);
    assert.equal(isolated.status, 'review');
  }
});
const reversed = analyze(SAMPLE_TEXT.split('\n').reverse().join(' '), DEFAULT_SETTINGS);
assert.deepEqual(reversed.map(record => record.users), [...expectedSampleUsers].reverse());
assert.equal(sample[24].contentId, 'fiLNemMMvkYS3bMMs');
assert.equal(sample[25].contentId, 'fvQ79X2DblxLt7ilS');
assert.equal(sample[24].kind, '缺失分隔符');
assert.equal(sample[25].kind, '缺失分隔符');
assert.equal(sample[19].contentId, 'U7J0KuZ_gNYYiBvQ');
assert.equal(sample[21].contentId, 's0-6PgABBBRu0r6-');
assert.equal(sample[36].contentId, 'atwaHZ4ipsQjeI_R');
assert.equal(sample[37].contentId, '_klASTsiR3w-k-8w');
assert.equal(sample[4].contentId, '2051711481935474816');
assert.equal(sample[39].contentId, sample[40].contentId);
assert.equal(analyze('unknown_ssfiLNemMMvkYS3bMMs___.mp4', DEFAULT_SETTINGS)[0].status, 'unparsed');
assert.deepEqual(analyze(sample[1].filename, { ...DEFAULT_SETTINGS, knownNames: 'higher_animal_Sisisiye123' })[0].users, ['higher_animal_Sisisiye123']);
assert.deepEqual(analyze(sample[24].filename, DEFAULT_SETTINGS, { [sample[24].id.replace(/^24:/, '0:')]: ['manually_confirmed'] })[0].users, ['manually_confirmed']);
const stats = summarize(sample, {}, DEFAULT_SETTINGS);
assert.equal(stats.find(u => u.name === 'gzpenpen')?.count, 5);
assert.equal(stats.find(u => u.name === 'qiuming_ss')?.count, 5);
assert.ok(sample.filter(r => r.filename.startsWith('qiuming')).every(r => r.status === 'review'));
assert.deepEqual(sample[1].users, ['higher_animal', 'Sisisiye123']);
assert.deepEqual(sample[5].users, ['g_mguy', 'urano007', 'S_men2024']);
assert.equal(sample[28].kind, 'UUID 标识');
assert.deepEqual(sample[20].users, ['GUGULI2474']);
assert.deepEqual(sample[19].users, ['zhouzhe41920465']);
assert.equal(analyze('unknown-file\n\n', DEFAULT_SETTINGS)[0].status, 'unparsed');
assert.equal(analyze('alice_bob_2089930283558801756_1___.mp4', DEFAULT_SETTINGS)[0].status, 'review');
assert.deepEqual(analyze('alice_bob_2089930283558801756_1___.mp4', { ...DEFAULT_SETTINGS, knownNames: 'alice_bob' })[0].users, ['alice_bob']);
assert.equal(analyze('alice_bob_2089930283558801756_1___.mp4', { ...DEFAULT_SETTINGS, knownNames: 'alice_bob' })[0].status, 'parsed');
const unknown = analyze('unknown-file', DEFAULT_SETTINGS);
const fixed = analyze('unknown-file', DEFAULT_SETTINGS, { [unknown[0].id]: ['user_with_underscores'] });
assert.deepEqual(fixed[0].users, ['user_with_underscores']); assert.equal(fixed[0].status, 'parsed');
const dedupe = summarize(sample, {}, { ...DEFAULT_SETTINGS, dedupePosts: true });
assert.equal(dedupe.find(u => u.name === 'gzpenpen')?.count, 4);
const merged = summarize(sample, { g_mguy: 'urano007' }, DEFAULT_SETTINGS);
assert.equal(merged.find(u => u.name === 'urano007')?.count, 3);
assert.equal(merged.find(u => u.name === 'g_mguy'), undefined);
assert.equal(canonical('constructor', {}), 'constructor');
assert.equal(canonical('old', { old: 'new', new: 'current' }), 'current');
assert.equal(canonical('a', { a: 'b', b: 'a' }), 'a');
const similar = summarize(analyze('Alice123_2089930283558801756_1___.mp4\nalice123_2089930283558801757_1___.mp4', DEFAULT_SETTINGS), {}, DEFAULT_SETTINGS);
assert.equal(getSuggestions(similar).length, 1);
assert.ok(toCsv([['=malicious', '正常名字']]).includes("'=malicious"));
assert.deepEqual(analyze('', DEFAULT_SETTINGS), []);
const qualityFilename = 'chao188_uTcIyP6___720p.mp4';
const qualityRecord = analyze(qualityFilename, DEFAULT_SETTINGS)[0];
assert.equal(qualityRecord.filename, qualityFilename);
assert.deepEqual(qualityRecord.users, ['chao188']);
assert.equal(qualityRecord.contentId, 'uTcIyP6');
assert.equal(qualityRecord.status, 'parsed');
assert.equal(qualityRecord.kind, '下载标识 + 清晰度');
for (const quality of ['360p', '480p', '1080p', '2160P', '4K']) {
  const record = analyze(`chao188_uTcIyP6___${quality}.MOV`, DEFAULT_SETTINGS)[0];
  assert.deepEqual(record.users, ['chao188']);
  assert.equal(record.contentId, 'uTcIyP6');
  assert.equal(record.status, 'parsed');
}
assert.equal(analyze('chao188_uTcIyP678___720p.mp4', DEFAULT_SETTINGS)[0].contentId, 'uTcIyP678');
const qualityCollaborators = analyze('chao188_otherUser_uTcIyP6___720p.mp4', DEFAULT_SETTINGS)[0];
assert.deepEqual(qualityCollaborators.users, ['chao188', 'otherUser']);
assert.equal(qualityCollaborators.status, 'review');
const qualityUnderscore = analyze('chao_188_uTcIyP6___720p.mp4', { ...DEFAULT_SETTINGS, knownNames: 'chao_188' })[0];
assert.deepEqual(qualityUnderscore.users, ['chao_188']);
assert.equal(qualityUnderscore.status, 'parsed');
const qualityVersions = analyze(`${qualityFilename}\nchao188_uTcIyP6___1080p.mp4`, DEFAULT_SETTINGS);
assert.equal(summarize(qualityVersions, {}, DEFAULT_SETTINGS)[0].count, 2);
assert.equal(summarize(qualityVersions, {}, { ...DEFAULT_SETTINGS, dedupePosts: true })[0].count, 1);
assert.equal(analyze('chao188___720p.mp4', DEFAULT_SETTINGS)[0].status, 'unparsed');
assert.equal(analyze('chao188_uTcIyP6___notes.mp4', DEFAULT_SETTINGS)[0].status, 'unparsed');
const newFilenames = [
  'KamuiHY_X_Jann49224729_ZAKEmuscle_SIHCqBJwu1PENjS___.mp4',
  'lp_puppy_1783063467550___.mp4',
  'yangmoyum_K0cGCSlRIn9RhPv___.mp4',
  'mianjiaqishi_Mianqi520_xiangwangshijie_oFAjXNlp2CFjBDN___.mp4',
  'inbedwithrowie_make1ovenotfri_2 (83)___.mp4',
];
const newExpectedUsers = [
  ['KamuiHY_X', 'Jann49224729', 'ZAKEmuscle'], ['lp_puppy'], ['yangmoyum'],
  ['mianjiaqishi', 'Mianqi520', 'xiangwangshijie'], ['inbedwithrowie', 'make1ovenotfri'],
];
const newIds = ['SIHCqBJwu1PENjS', '1783063467550', 'K0cGCSlRIn9RhPv', 'oFAjXNlp2CFjBDN', ''];
for (const separator of ['\n', ' ', ', ', '，', '; ']) {
  const parsedNew = analyze(newFilenames.join(separator), DEFAULT_SETTINGS);
  assert.equal(parsedNew.length, 5, `Filename separator: ${separator}`);
  assert.deepEqual(parsedNew.map(record => record.filename), newFilenames);
  assert.deepEqual(parsedNew.map(record => record.users), newExpectedUsers);
  assert.deepEqual(parsedNew.map(record => record.contentId), newIds);
}
newFilenames.forEach((filename, index) => {
  const record = analyze(filename, DEFAULT_SETTINGS)[0];
  assert.deepEqual(record.users, newExpectedUsers[index]);
  assert.equal(record.status, index === 2 ? 'parsed' : 'review');
});
const numbered = analyze([newFilenames[4], newFilenames[4].replace('(83)', '(84)')].join('\n'), DEFAULT_SETTINGS);
assert.equal(numbered[0].kind, '序号 + 重名编号');
assert.equal(summarize(numbered, {}, { ...DEFAULT_SETTINGS, dedupePosts: true })[0].count, 2);
assert.equal(analyze('lp_puppy_1783063467550___.mp4', { ...DEFAULT_SETTINGS, knownNames: 'lp_puppy' })[0].status, 'parsed');
const candidates = getAttributionCandidates(analyze(newFilenames[0], DEFAULT_SETTINGS)[0]);
assert.ok(candidates.includes('KamuiHY_X') && candidates.includes('KamuiHY') && candidates.includes('X'));
assert.ok(!candidates.includes('SIHCqBJwu1PENjS'));
const numberedCandidates = getAttributionCandidates(numbered[0]);
assert.ok(numberedCandidates.includes('inbedwithrowie_make1ovenotfri'));
assert.ok(!numberedCandidates.includes('83') && !numberedCandidates.includes('2'));
assert.equal(analyze([...newFilenames, 'mystery-file'].join('\n'), DEFAULT_SETTINGS).filter(record => record.status === 'unparsed').length, 1);
assert.deepEqual(groupSuggestions([['alpha', 'Alpha'], ['other', 'Other'], ['Alpha', 'alpha_']]).map(group => [...group].sort()).sort(), [['alpha', 'Alpha', 'alpha_'].sort(), ['other', 'Other'].sort()].sort());
const batchMerge = prepareMerges({}, [{ names: ['Alice', 'alice'], target: 'Alice' }, { names: ['Bobby', 'bobby'], target: 'Bobby' }], ['Alice', 'alice', 'Bobby', 'bobby']);
assert.equal(batchMerge.entries.length, 2);
assert.equal(canonical('alice', batchMerge.aliases), 'Alice');
assert.equal(canonical('bobby', batchMerge.aliases), 'Bobby');
assert.equal(canonical('bobby', batchMerge.entries[1].previous), 'bobby');
assert.equal(canonical('alice', batchMerge.entries[1].previous), 'Alice');
assert.deepEqual(batchMerge.entries[0].previous, {});
assert.throws(() => prepareMerges({}, [{ names: ['Alice', 'alice'], target: 'Bobby' }], ['Alice', 'alice', 'Bobby']));
const promotedAlias = prepareMerges({ old: 'middle', middle: 'main' }, [{ names: ['main', 'other'], target: 'old' }], ['main', 'other']);
assert.equal(canonical('middle', promotedAlias.aliases), 'old');
assert.equal(canonical('main', promotedAlias.aliases), 'old');
console.log('PASS: all original formats, five new examples, comma/space imports, attribution candidates, ambiguity flags, independent batch merges, collision prevention and undo snapshots.');
