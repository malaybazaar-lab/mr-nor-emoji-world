# Original chiptune loop "Workshop Groove" (generated, no samples): python3 tools/make_music.py -> public/audio/workshop-groove.mp3
import numpy as np, subprocess, os
SR=44100; BPM=128; BEAT=60/BPM; S16=BEAT/4
BARS=16; N=int(round(BARS*4*BEAT*SR))
out=np.zeros(N+SR*2)
def f(m): return 440*2**((m-69)/12)
def env(n,a=0.004,d=0.08,s=0.6,r=0.03):
    t=np.arange(n)/SR; e=np.ones(n)*s
    ai=int(a*SR); e[:ai]=np.linspace(0,1,ai) if ai else 1
    di=int(d*SR); e[ai:ai+di]=np.linspace(1,s,len(e[ai:ai+di]))
    ri=int(r*SR); 
    if ri< n: e[-ri:]*=np.linspace(1,0,ri)
    return e
def sq(fr,n,duty=0.5):
    t=np.arange(n)/SR; return np.where((t*fr)%1<duty,1.0,-1.0)
def tri(fr,n):
    t=np.arange(n)/SR; p=(t*fr)%1; return 4*np.abs(p-0.5)-1
def add(start,sig,vol):
    i=int(round(start*SR)); out[i:i+len(sig)]+=sig*vol
# progression C G Am F | C G F G  (roots midi)
prog=[(48,[60,64,67]),(43,[59,62,67]),(45,[60,64,69]),(41,[60,65,69]),(48,[60,64,67]),(43,[59,62,67]),(41,[60,65,69]),(43,[59,62,67])]
# melody (16th-step, None=rest) per 2 bars, original
A=[76,None,79,None,76,74,72,None,74,None,76,None,79,None,81,None, 79,None,None,74,None,None,71,None,72,74,76,None,74,None,None,None]
B=[72,None,76,None,81,None,79,76, 77,None,76,None,74,None,72,None, 74,None,77,None,76,None,74,None,71,None,72,None,74,None,79,None]
C=[84,None,83,None,81,None,79,None,81,None,79,None,77,None,76,None, 77,76,74,None,72,None,74,None,76,None,74,None,79,None,None,None]
mel=A+B+A+C
for bar in range(BARS):
    root,ch=prog[bar%8]; t0=bar*4*BEAT
    # bass: octave bounce 8ths, triangle
    for i in range(8):
        n=root+(12 if i%2 else 0); L=int(S16*2*SR*0.9)
        add(t0+i*S16*2, tri(f(n),L)*env(L,d=0.05,s=0.8), 0.32)
    # arp: 16ths, 12.5% square, quiet
    for i in range(16):
        n=ch[i%3]+(12 if (i//3)%2 else 0); L=int(S16*SR*0.8)
        add(t0+i*S16, sq(f(n),L,0.125)*env(L,d=0.04,s=0.3), 0.045)
    # drums: kick 1,3 ; snare 2,4 ; hats 8ths
    for b in range(4):
        tb=t0+b*BEAT
        L=int(0.12*SR); tt=np.arange(L)/SR
        if b%2==0:
            k=np.sin(2*np.pi*np.cumsum(np.linspace(150,45,L))/SR)*np.exp(-tt*28); add(tb,k,0.5)
        else:
            sn=np.random.RandomState(bar*4+b).uniform(-1,1,L)*np.exp(-tt*22); add(tb,sn,0.17)
        for h in (0,0.5):
            Lh=int(0.03*SR); hh=np.random.RandomState(bar*8+b*2+int(h*2)+99).uniform(-1,1,Lh)*np.exp(-np.arange(Lh)/SR*120)
            add(tb+h*BEAT,hh,0.06 if h else 0.04)
    # melody: 50% square w/ slight vibrato-free, 2 bars per 32 steps
for i,n in enumerate(mel*1):
    if n is None: continue
    # length until next note
    j=i+1
    while j<len(mel) and mel[j] is None and j-i<4: j+=1
    L=int((j-i)*S16*SR*0.92)
    s=sq(f(n),L,0.5)*0.7+sq(f(n)*1.003,L,0.25)*0.3
    add(i*S16, s*env(L,d=0.1,s=0.55), 0.10)
# seamless loop: fold tail into start
tail=out[N:]; out=out[:N]; out[:len(tail)]+=tail
out=out/np.max(np.abs(out))*0.89
pcm=(out*32767).astype('<i2')
os.makedirs('public/audio',exist_ok=True)
p=subprocess.run(['ffmpeg','-y','-loglevel','error','-f','s16le','-ar',str(SR),'-ac','1','-i','-','-b:a','96k','-metadata','title=Workshop Groove','-metadata','artist=Mr Nor DnT (original chiptune)','public/audio/workshop-groove.mp3'],input=pcm.tobytes())
print('ok', N/SR, 's')
