/* Debu emas melayang (kerlip) mengikuti warna tema */
window.Efek={
  debu(cv,warna){
    const cx=cv.getContext("2d");let P=[],W=0,H=0,t=0;
    const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reset=()=>{W=cv.width=innerWidth;H=cv.height=innerHeight;
      const n=Math.max(26,Math.min(80,Math.round(W*H/20000)));P=[];
      for(let i=0;i<n;i++)P.push(mk(true))};
    const mk=first=>({x:Math.random()*W,y:first?Math.random()*H:H+10,r:.7+Math.random()*2.2,vy:.12+Math.random()*.42,
      sw:Math.random()*6.28,sp:.004+Math.random()*.012,ph:Math.random()*6.28,tw:.02+Math.random()*.04,
      star:Math.random()<.16,c:null});
    function star(x,y,s,a,c){cx.globalAlpha=a;cx.fillStyle=c;cx.beginPath();
      cx.moveTo(x,y-s*2.4);cx.quadraticCurveTo(x,y,x+s*2.4,y);cx.quadraticCurveTo(x,y,x,y+s*2.4);
      cx.quadraticCurveTo(x,y,x-s*2.4,y);cx.quadraticCurveTo(x,y,x,y-s*2.4);cx.fill()}
    function frame(){
      if(!document.hidden){t++;cx.clearRect(0,0,W,H);cx.globalCompositeOperation="lighter";
        for(const p of P){p.y-=p.vy;p.sw+=p.sp;p.x+=Math.sin(p.sw)*.35;p.ph+=p.tw;
          if(p.y<-12){Object.assign(p,mk(false));p.x=Math.random()*W}
          if(!p.c)p.c=warna();
          const a=.25+.6*Math.abs(Math.sin(p.ph));
          if(p.star)star(p.x,p.y,p.r*1.3,a,p.c);
          else{cx.globalAlpha=a*.28;cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,p.r*3.2,0,6.3);cx.fill();
            cx.globalAlpha=a;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.3);cx.fill()}}
        cx.globalCompositeOperation="source-over";cx.globalAlpha=1}
      if(!reduce)requestAnimationFrame(frame)}
    addEventListener("resize",reset);reset();frame();
    return {recolor:()=>P.forEach(p=>p.c=null)}}
};
