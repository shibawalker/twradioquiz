#!/usr/bin/env python3
"""Deterministic importer for the three verified NCC question banks; fail closed."""
import argparse, hashlib, json, re, subprocess
from pathlib import Path
CHAPTERS = ['無線電規章與相關法規','無線電通訊方法','無線電系統原理','無線電相關安全防護','電磁相容性技術','射頻干擾的預防與排除']
COUNTS = [214,133,184,26,28,21]
URL = 'https://api.ncc.gov.tw/chncc/app/data/doc?id=994&module=egov&detailNo=1554416768120786944&serno=1084&type=s'
PROFILES = {
 '3': {'pdf':'data/ncc3.pdf','output':'public/data/questions-3.json','counts':[229,132,145,36,10,18], 'last_page':117,
       'sha256':'23da2d0a45ca1804eb6678e64699018429ab2f606f4fd643959175740839b452',
       'url':'https://api.ncc.gov.tw/chncc/app/data/doc?id=994&module=egov&detailNo=1554416768263393280&serno=1084&type=s',
       'quotas':[13,13,6,1,1,1], 'pass':25, 'figures':{'T-1':93,'T-2':94,'T-3':95}},
 '1': {'pdf':'data/ncc1.pdf','output':'public/data/questions-1.json','counts':[213,180,364,37,41,39], 'last_page':173,
       'sha256':'f9ace591874e2e245f6ed77ae80584fd861bba082c3b9e622d9687bf9404a581',
       'url':'https://api.ncc.gov.tw/chncc/app/data/doc?id=994&module=egov&detailNo=1554416767940431872&serno=1084&type=s',
       'quotas':[13,15,15,3,2,2], 'pass':40,
       'figures':{'E5-2':94,'E6-2':97,'E6-3':100,'E6-5':102,'E7-1':114,'E7-2':115,'E7-3':120,'E7-4':128,'E9-1':135,'E9-2':136,'E9-3':149}},
 '2': {'pdf':'data/ncc.pdf','output':'public/data/questions.json','counts':COUNTS, 'last_page':123,
       'sha256':'27b1735a83990e48c8d7e9d75f71ac220c5b7b9c2172f5124e9b69b7e3e80122', 'url':URL,
       'quotas':[12,12,10,2,2,2], 'pass':32, 'figures':{'G7-1':93}},
}
def clean(s):
    s = re.sub(r'\s+', ' ', s).strip()
    return re.sub(r'(?<=[\u3400-\u9fff]) +(?=[\u3400-\u9fff])', '', s)
def main():
    p=argparse.ArgumentParser(); p.add_argument('pdf', nargs='?'); p.add_argument('--grade', choices=PROFILES, default='2'); p.add_argument('--output'); a=p.parse_args()
    profile=PROFILES[a.grade]; a.pdf=a.pdf or profile['pdf']; a.output=a.output or profile['output']
    report_path=Path('data/import-report.json' if a.grade=='2' else f'data/import-report-{a.grade}.json')
    raw=subprocess.check_output(['pdftotext','-layout',a.pdf,'-']).decode()
    digest=hashlib.sha256(Path(a.pdf).read_bytes()).hexdigest()
    questions=[]; issues=[]; current=None; chapter=None
    if digest != profile['sha256']:
        issues.append({'reason':'Unknown PDF revision: review page boundaries, diagram mapping and expected counts before updating importer'})
    def finish():
        nonlocal current
        if not current: return
        q=current; current=None
        if q.pop('labels') != [1,2,3,4] or not all(q['choices']) or not q['question']:
            issues.append({'reason':'Invalid question/options', 'question':q}); return
        q['question']=clean(q['question']); q['choices']=[clean(c) for c in q['choices']]; questions.append(q)
    for page,text in enumerate(raw.split('\f'),1):
        for line in text.splitlines():
            s=line.strip()
            # Source p.91 has a missing period after question 77.
            if a.grade=='2' and chapter == CHAPTERS[2]: s=re.sub(r'^\(2\)\s+77\s+', '(2) 77. ', s)
            if a.grade=='1' and chapter==CHAPTERS[4] and page==163:
                s=re.sub(r'^([（(]\s*[1-4]\s*[)）]\s*)(19|2[0-4])\s+', r'\1\2. ', s)
            if not s or re.fullmatch(r'\d+',s) or re.fullmatch(r'圖\s+[EG]\d-\d',s): continue
            if s in [c+'題庫' for c in CHAPTERS]:
                finish(); chapter=s[:-2]; continue
            if not chapter: continue
            if page>profile['last_page']: finish(); chapter=None; continue
            m=re.match(r'^[（(]\s*([1-4])\s*[)）]\s*(\d+)\.(?!\d)\s*(.*)',s)
            if m:
                finish(); ans,num,body=m.groups(); idx=CHAPTERS.index(chapter)
                current=dict(id=f'ncc{a.grade}-{idx+1}-{int(num):03}',original_number=int(num),chapter=chapter,question=body,choices=[],correct=int(ans)-1,source={'url':profile['url'],'page':page,'sha256':digest},enabled=True,labels=[])
            elif current:
                m=re.match(r'^[（(]\s*([1-4])\s*[)）]\s*(.*)',s)
                if m:
                    current['labels'].append(int(m[1])); current['choices'].append(m[2])
                elif current['choices']: current['choices'][-1]+=' '+s
                else: current['question']+=' '+s
            else: issues.append({'page':page,'unparsed':s})
    finish()
    for c,n in zip(CHAPTERS,profile['counts']):
        nums=[q['original_number'] for q in questions if q['chapter']==c]
        if nums!=list(range(1,n+1)): issues.append({'chapter':c,'expected':n,'actual':len(nums),'numbers':nums})
    report={'sha256':digest,'total':len(questions),'chapters':{c:sum(q['chapter']==c for q in questions) for c in CHAPTERS},'issues':issues}
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if issues: raise SystemExit(f'Import blocked: inspect {report_path}')
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    images=Path(a.output).parent/'images'; images.mkdir(exist_ok=True)
    for label,page in profile['figures'].items():
        prefix='g7' if a.grade=='2' else f'ncc{a.grade}-{label.lower()}'
        subprocess.run(['pdfimages','-f',str(page),'-l',str(page),'-png',a.pdf,str(images/prefix)],check=True)
        filename=f'{prefix}-000.png'
        if not (images/filename).exists(): raise SystemExit(f'Missing {label} diagram')
        for q in questions:
            if label in q['question']: q['image']={'url':f'data/images/{filename}','alt':f'圖 {label}：原始題庫附圖','source_page':page,'label':label}
    Path(a.output).write_text(json.dumps({'version':digest,'grade':a.grade,'exam':{'quotas':profile['quotas'],'passCount':profile['pass'],'minutes':40},'chapters':CHAPTERS,'questions':questions},ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__': main()
