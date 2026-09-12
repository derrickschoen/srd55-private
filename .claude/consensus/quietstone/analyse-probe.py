import json,sys,collections
def load(p): return [json.loads(l) for l in open(p) if l.strip()]
base,cand=load(sys.argv[1]),load(sys.argv[2])
def summarise(rows,label):
    print(f'--- {label}: {len(rows)} rows')
    for m in sorted({r['model'] for r in rows}):
        sub=[r for r in rows if r['model']==m]
        oc=collections.Counter(r['outcome'] for r in sub)
        sc=[r['score'] for r in sub if isinstance(r.get('score'),(int,float))]
        print(f'    {m}: {dict(oc)} scored={len(sc)} mean={round(sum(sc)/len(sc),4) if sc else None}')
summarise(base,'baseline 85168bc5 (shipped art)'); summarise(cand,'candidate dc217f23 (Quietstone)')
def index(rows):
    d={}
    for r in rows:
        if r['outcome']!='answered' or not isinstance(r.get('score'),(int,float)): continue
        d[(r['model'],r['question'],r['stateId'])]=r['score']
    return d
bi,ci=index(base),index(cand)
print('\n=== per model x question class (answered on BOTH sides, same board) ===')
print(f"{'model':16}{'class':7}{'n':>5}{'baseline':>10}{'candidate':>11}{'delta':>8}  decision")
verdict=[]
for m in sorted({k[0] for k in bi}|{k[0] for k in ci}):
    classes=sorted({k[1] for k in bi if k[0]==m}|{k[1] for k in ci if k[0]==m}, key=lambda q:(len(q),q))
    for q in classes:
        keys=[k for k in bi if k[0]==m and k[1]==q and k in ci]
        if not keys: print(f'{m:16}{q:7}{0:>5}{"-":>10}{"-":>11}{"-":>8}  no paired rows'); continue
        b=sum(bi[k] for k in keys)/len(keys); c=sum(ci[k] for k in keys)/len(keys); d=c-b
        ok = d >= -0.05
        strict = ('baseline>=0.9 kept' if b>=0.9 and c>=0.9 else ('baseline>=0.9 LOST' if b>=0.9 else 'n/a'))
        verdict.append((m,q,ok,b,c,strict))
        print(f'{m:16}{q:7}{len(keys):>5}{b:>10.3f}{c:>11.3f}{d:>+8.3f}  {"pass" if ok else "REGRESSION"} ({strict})')
print('\n=== decision ===')
bad=[v for v in verdict if not v[2]] ; lost=[v for v in verdict if v[5]=='baseline>=0.9 LOST']
print('classes breaching candidate >= baseline - 0.05:', [(v[0],v[1],round(v[4]-v[3],3)) for v in bad] or 'none')
print('classes that met the strict >=0.9 gate at baseline and lost it:', [(v[0],v[1]) for v in lost] or 'none')
for m in sorted({v[0] for v in verdict}):
    sub=[v for v in verdict if v[0]==m]
    print(f'  {m}: overall baseline {sum(v[3] for v in sub)/len(sub):.3f} -> candidate {sum(v[4] for v in sub)/len(sub):.3f} ({sum(v[4] for v in sub)/len(sub)-sum(v[3] for v in sub)/len(sub):+.3f}) over {len(sub)} classes')
