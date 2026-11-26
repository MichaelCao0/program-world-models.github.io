#!/usr/bin/env python3
"""Sync structured paper data from FreedomIntelligence/Awesome-Code-World-Model into survey/data.js."""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_AWESOME = ROOT.parent / 'Awesome-Code-World-Model' / 'data'
REMOTE_BASE = 'https://raw.githubusercontent.com/FreedomIntelligence/Awesome-Code-World-Model/main/data'
DEPTHS = {'targeted_fulltext': 'FT', 'abstract': 'A', 'metadata': 'M'}

FEEDBACK_NOTES = {
    '2610.01614': {
        'paradigm': 'L3',
        'regime': 'III · State Writeback',
        'note_en': 'Observations register newly appearing objects back into persistent agent-managed world state.',
        'note_zh': '生成视频中新出现的实体会被写回编码智能体维护的持久世界状态表（L3 共享动力学）。',
    },
    '2611.19247': {
        'paradigm': 'L2-L3',
        'regime': 'I / L3 Candidate',
        'note_en': 'Pairs an authoritative rule engine with an interactive video model; L3 status depends on whether VM mutates engine state.',
        'note_zh': '规则引擎与交互视频模型配对；是否归入 L3 取决于视频侧是否反向修改引擎持久状态。',
    },
    '2609.26458': {
        'paradigm': 'L2',
        'regime': 'III · Appearance Feedback',
        'note_en': 'Three.js whitebox owns structure and dynamics (L2), while rendered surface colors feed back into visual memory.',
        'note_zh': 'Three.js 白模掌握几何与状态演化（L2），扩散渲染的表面颜色回写至外观记忆。',
    },
    '2610.26811': {
        'paradigm': 'L2',
        'regime': 'I · Rule-Checked Visual Anchor',
        'note_en': 'Typed runtime executes rules authoritatively (L2) before a frozen video renderer; visual feedback serves as checked frame anchoring.',
        'note_zh': '类型化运行时权威执行状态规则（L2），冻结视频模型负责渲染并通过规则兼容性检查锚定外观。',
    },
    '2608.25927': {
        'paradigm': 'L2',
        'regime': 'I · One-Way Proxy Rendering',
        'note_en': 'Coding world brain maintains state and emits spatiotemporal proxies to a video engine (L2).',
        'note_zh': '编码智能体维护持久状态并导出时空 proxy 驱动视频渲染引擎（单向状态权威 L2）。',
    },
    '2609.10540': {
        'paradigm': 'L2',
        'regime': 'I · One-Way 3D OBB Projection',
        'note_en': 'Engine owns persistent 3D OBBs and nonvisual facts; video generator completes motion and appearance (L2).',
        'note_zh': '引擎持有持久 3D 包围盒与非视觉事实，投影后交由视频模型补全运动与外观（L2）。',
    },
    '2610.12374': {
        'paradigm': 'L2',
        'regime': 'I · Action-Mediated Loop',
        'note_en': 'Simulator owns state and exports depth/normals to a 36.5 fps renderer; rendering errors cannot accumulate in state (L2).',
        'note_zh': '仿真器持有权威状态并导出深度/法线驱动实时渲染器，渲染误差不会反向污染状态（L2）。',
    },
    '2610.36371': {
        'paradigm': 'L2',
        'regime': 'I · Async Engine + State Renderer',
        'note_en': 'Coding agent builds an asynchronous Box World Engine exposing persistent variables to a video state renderer (L2).',
        'note_zh': '编码智能体构建异步 Box World 引擎维护持久属性，状态渲染器将其转为交互视频（L2）。',
    },
    '2611.22925': {
        'paradigm': 'L2',
        'regime': 'I · Multi-Scale Structural Proxy',
        'note_en': 'Upstream engine fixes camera and entity motion in a structural proxy streamed by Invoker-Render (L2).',
        'note_zh': '上游引擎在结构化 proxy 中锁定相机与实体运动，由 Invoker-Render 流式渲染外观（L2）。',
    },
    '2611.24869': {
        'paradigm': 'L3',
        'regime': 'III · State Writeback',
        'note_en': 'Executable 3D rule graph coordinates configurable rules and entity states in a closed loop with video generation and perceptual feedback (L3).',
        'note_zh': '可执行三维规则图在闭环中协调自定义规则、持久实体状态、视频生成与感知反馈（L3 共享动力学）。',
    },
    '2609.34221': {
        'paradigm': 'L2',
        'regime': 'I · Read-Only Geometric Memory',
        'note_en': 'Agent-compiled expandable 3D geometry answers read-only depth queries for video synthesis without writeback (L2).',
        'note_zh': '智能体编译可扩展持久三维几何，以只读深度查询驱动视频生成且禁止渲染反向写回（L2）。',
    },
    '2607.18703': {
        'paradigm': 'L2',
        'regime': 'I · Real-Time G-Buffer Stream',
        'note_en': 'Physics engine owns world dynamics and exports structured G-buffers to a 30+ FPS few-step streaming renderer (L2).',
        'note_zh': '物理引擎持有动力学并导出 G-buffer，交由逾 30 FPS 的少步因果流式渲染器生成画面（L2）。',
    },
    '2611.25838': {
        'paradigm': 'L2',
        'regime': 'I · Dynamic-Context Proxy Stream',
        'note_en': 'Game engine evolves world state while ContextRenderer compresses visual history to follow dynamic proxy updates (L2).',
        'note_zh': '游戏引擎推进权威状态，ContextRenderer 压缩视觉历史以持续跟随动态代理变化（L2）。',
    },
    'streaming-cwm': {
        'paradigm': 'L2',
        'regime': 'I · Causal Chunk Proxy Stream',
        'note_en': 'CARLA / CWM code state emits depth and semantic proxies rendered causally in four-step streaming chunks (L2).',
        'note_zh': 'CARLA / CWM 代码状态导出深度与语义代理，以四步因果分块方式流式渲染视频（L2）。',
    },
}


def fetch_json(filename, prefer_remote=False):
    if prefer_remote:
        try:
            with urllib.request.urlopen(f'{REMOTE_BASE}/{filename}', timeout=15) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception:
            pass
    local_file = LOCAL_AWESOME / filename
    if local_file.exists():
        return json.loads(local_file.read_text(encoding='utf-8'))
    with urllib.request.urlopen(f'{REMOTE_BASE}/{filename}', timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


def record_date(p):
    return p.get('first_public_date') or p['available_by']


def display_date(p):
    return p['first_public_date'] if p.get('first_public_date') else 'by ' + p['available_by']


def bib_escape(value):
    replacements = {
        '\\': r'\textbackslash{}',
        '&': r'\&',
        '%': r'\%',
        '_': r'\_',
        '#': r'\#',
        '$': r'\$',
        '{': r'\{',
        '}': r'\}',
    }
    return ''.join(replacements.get(c, c) for c in value)


def single_bibtex(p):
    authors = ['{' + bib_escape(a) + '}' if a.lower().endswith(' team') else bib_escape(a) for a in p['authors']]
    fields = [
        ('title', '{' + bib_escape(p['title']) + '}'),
        ('author', ' and '.join(authors)),
        ('year', str(p['year'])),
    ]
    if 'arxiv_id' in p:
        fields += [('eprint', p['arxiv_id']), ('archivePrefix', 'arXiv')]
    if 'doi' in p:
        fields.append(('doi', p['doi']))
    fields.append(('url', p['source_url']))
    if p.get('source_type') == 'project':
        note = (
            'Project resource; verified available by ' + p['available_by'] + '; first release date unverified'
            if not p.get('first_public_date')
            else 'Project resource; date follows the cited author announcement'
        )
        fields.append(('note', note))
    lines = ['@misc{' + p['citation_key'] + ',']
    lines.extend(f'  {k} = {{{v}}},' for k, v in fields)
    lines.append('}')
    return '\n'.join(lines)


def infer_paradigm(p, ugroup, btarget):
    pid = p['id']
    if pid in FEEDBACK_NOTES:
        return FEEDBACK_NOTES[pid]['paradigm']
    if p['section'] in ('worldcoder', 'code_as_world', 'vibeworlding'):
        return 'L2'
    if ugroup == 'benchmark':
        return 'Eval-L4' if btarget == 'video_wm' else 'Eval-L2'
    if ugroup == 'gui':
        return 'GUI'
    if ugroup == 'survey':
        return 'Survey'
    return 'Other'


def main():
    prefer_remote = '--remote' in sys.argv
    try:
        papers_data = fetch_json('papers.json', prefer_remote=prefer_remote)
        class_data = fetch_json('classification.json', prefer_remote=prefer_remote)
        zh_data = fetch_json('readme.zh-CN.json', prefer_remote=prefer_remote)
    except Exception as exc:
        existing = ROOT / 'survey/data.js'
        if existing.exists():
            print(f'Warning: data fetch skipped ({exc}); keeping existing survey/data.js')
            return
        raise

    unassigned = {r['id']: r['unassigned_group'] for r in class_data['records'] if r.get('unassigned_group')}
    btargets = {r['id']: r['benchmark_target'] for r in class_data['records'] if r.get('benchmark_target')}
    comparisons = {r['id']: (r['comparison'], r['comparison_zh']) for r in class_data['records'] if r.get('comparison')}

    records = sorted(papers_data['papers'], key=lambda p: (record_date(p), p['id']), reverse=True)
    items = []
    for p in records:
        pid = p['id']
        ug = unassigned.get(pid)
        bt = btargets.get(pid)
        comp = comparisons.get(pid)
        fb = FEEDBACK_NOTES.get(pid)
        items.append({
            'id': pid,
            'citation_key': p['citation_key'],
            'title': p['title'],
            'alias': p.get('alias'),
            'authors': p['authors'],
            'year': p['year'],
            'date_sort': record_date(p),
            'date_display': display_date(p),
            'source_url': p['source_url'],
            'arxiv_id': p.get('arxiv_id'),
            'doi': p.get('doi'),
            'source_type': p.get('source_type', 'paper'),
            'section': p['section'],
            'unassigned_group': ug,
            'benchmark_target': bt,
            'scope': p['scope'],
            'code_roles': p['code_roles'],
            'tags': p['tags'],
            'review_depth': p['review_depth'],
            'review_badge': DEPTHS[p['review_depth']],
            'summary_en': p['summary'],
            'summary_zh': zh_data['summaries'][pid],
            'evidence_notes': p.get('evidence_notes'),
            'comparison_en': comp[0] if comp else None,
            'comparison_zh': comp[1] if comp else None,
            'related_ids': p.get('related_ids', []),
            'paradigm': infer_paradigm(p, ug, bt),
            'feedback_regime': fb['regime'] if fb else None,
            'feedback_note_en': fb['note_en'] if fb else None,
            'feedback_note_zh': fb['note_zh'] if fb else None,
            'bibtex': single_bibtex(p),
        })

    section_counts = {s['id']: sum(1 for p in items if p['section'] == s['id']) for s in papers_data['sections']}
    group_counts = {g: sum(1 for p in items if p['unassigned_group'] == g) for g in ('gui', 'benchmark', 'survey')}

    payload = {
        'updated_on': papers_data['updated_on'],
        'literature_cutoff': papers_data['literature_cutoff'],
        'total_sources': len(items),
        'section_counts': section_counts,
        'group_counts': group_counts,
        'sections': [
            {
                'id': s['id'],
                'title_en': s['title'],
                'description_en': s['description'],
                'title_zh': zh_data['sections'][s['id']]['title'],
                'description_zh': zh_data['sections'][s['id']]['description'],
                'count': section_counts[s['id']],
            }
            for s in papers_data['sections']
        ],
        'papers': items,
    }

    out_dir = ROOT / 'survey'
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / 'data.js').write_text(
        '// Auto-generated from FreedomIntelligence/Awesome-Code-World-Model by scripts/sync_survey_data.py\n'
        'window.CWM_DATA = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n',
        encoding='utf-8',
    )
    print(f'Synced {len(items)} sources into survey/data.js (cutoff {papers_data["literature_cutoff"]}).')


if __name__ == '__main__':
    main()
