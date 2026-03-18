import { useState, useEffect } from "react";

const STORAGE_KEY = "job_note_v5";
const STATUS_OPTIONS = ["관심","지원 예정","지원 완료","서류 통과","면접 진행","최종 합격","불합격"];
const STATUS_META = {
  "관심":      { bg:"#e0e7ff", text:"#3730a3" },
  "지원 예정": { bg:"#fef9c3", text:"#854d0e" },
  "지원 완료": { bg:"#dbeafe", text:"#1e40af" },
  "서류 통과": { bg:"#d1fae5", text:"#065f46" },
  "면접 진행": { bg:"#fde68a", text:"#78350f" },
  "최종 합격": { bg:"#bbf7d0", text:"#14532d" },
  "불합격":    { bg:"#fee2e2", text:"#991b1b" },
};

const PROFILE = `지원자: 서윤
직무: 비즈니스 애널리스트 / BI 개발자 / CRM 분석
경력: 2024년 5월~현재 (약 2년), 노랑풍선 CRM/BI팀
스킬: Tableau, SQL, Supabase, JavaScript, CRM 분석, BI 대시보드, 데이터마트 설계, 마케팅 자동화, 경영기획
자격증: Tableau Desktop Specialist, 경영정보시각화, TOEIC 925, OPIc IH
희망: 서울/경기/해외, 외국계 BI/데이터 분석 이직 목표`;

const C = {
  mint:    "#0d9488",
  mintL:   "#ccfbf1",
  mintM:   "#5eead4",
  mintBg:  "#f0fdfa",
  green:   "#16a34a",
  greenL:  "#dcfce7",
  border:  "var(--color-border-tertiary)",
  bg:      "var(--color-background-primary)",
  bg2:     "var(--color-background-secondary)",
  txt:     "var(--color-text-primary)",
  txt2:    "var(--color-text-secondary)",
};

const inSt = {
  padding:"9px 11px", borderRadius:"8px",
  border:`0.5px solid var(--color-border-secondary)`,
  fontSize:"13px", background:C.bg, color:C.txt,
  width:"100%", boxSizing:"border-box", outline:"none",
};

function Tag({ label, bg="#e0e7ff", color="#3730a3", size=11 }) {
  return <span style={{ fontSize:size, background:bg, color, borderRadius:"20px", padding:"3px 9px", display:"inline-block", margin:"2px 2px 2px 0", whiteSpace:"nowrap" }}>{label}</span>;
}

function FreqBar({ label, count, max, color="#0d9488" }) {
  const pct = max ? Math.round((count/max)*100) : 0;
  return (
    <div style={{ marginBottom:"8px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
        <span style={{ fontSize:"12px", color:C.txt }}>{label}</span>
        <span style={{ fontSize:"11px", color:C.txt2 }}>{count}개 공고</span>
      </div>
      <div style={{ height:"6px", background:C.bg2, borderRadius:"4px", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:"4px", transition:"width 0.4s" }}/>
      </div>
    </div>
  );
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("list"); // list | insight
  const [urlInput, setUrlInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null); // parsed but not saved yet
  const [parseErr, setParseErr] = useState("");
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) { const d = JSON.parse(r); setJobs(d); if(d.length>0) setSelected(d[0]); } } catch {}
  }, []);

  function persist(list) {
    setJobs(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  }

  async function handleParse() {
    if (!urlInput.trim()) return;
    setParsing(true); setParseErr(""); setPreview(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          tools:[{ type:"web_search_20250305", name:"web_search" }],
          system:`채용 공고 URL을 읽고 JSON만 반환. 마크다운 없이 순수 JSON.
{"company":"","title":"","location":"","deadline":null,"tasks":[],"requirements":[],"preferred":[],"keywords":[]}`,
          messages:[{ role:"user", content:`파싱해줘: ${urlInput.trim()}` }]
        })
      });
      const data = await res.json();
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const clean = text.replace(/```json|```/g,"").trim();
      const s=clean.indexOf("{"), e=clean.lastIndexOf("}");
      if(s===-1) throw new Error();
      setPreview({ ...JSON.parse(clean.slice(s,e+1)), url:urlInput.trim() });
    } catch { setParseErr("공고를 불러오지 못했어요. URL을 확인해주세요."); }
    setParsing(false);
  }

  function handleSavePreview() {
    if (!preview) return;
    const newJob = { ...preview, id:Date.now(), status:"관심", memo:"", savedAt:new Date().toLocaleDateString("ko-KR") };
    const next = [newJob, ...jobs];
    persist(next);
    setSelected(newJob);
    setPreview(null); setUrlInput(""); setShowAdd(false); setView("list");
  }

  function updatePreview(field, val) { setPreview(p => ({ ...p, [field]: val })); }
  function updatePreviewArr(field, idx, val) {
    setPreview(p => { const arr = [...(p[field]||[])]; arr[idx]=val; return { ...p, [field]:arr }; });
  }
  function addPreviewArr(field) { setPreview(p => ({ ...p, [field]:[...(p[field]||[]),""] })); }
  function removePreviewArr(field, idx) { setPreview(p => ({ ...p, [field]:(p[field]||[]).filter((_,i)=>i!==idx) })); }

  function handleDelete(id) {
    const next = jobs.filter(j=>j.id!==id);
    persist(next);
    setSelected(next.length>0 ? next[0] : null);
  }
  function updateJob(id, patch) { persist(jobs.map(j=>j.id===id?{...j,...patch}:j)); setSelected(s=>s?.id===id?{...s,...patch}:s); }

  async function handleInsight() {
    if(jobs.length<1) return;
    setInsightLoading(true); setInsight(null);
    const summary = jobs.map(j=>`[${j.company}/${j.title}] 업무:${(j.tasks||[]).join(",")} 요건:${(j.requirements||[]).join(",")} 우대:${(j.preferred||[]).join(",")}`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`채용 공고 분석 전문가. JSON만 반환.`,
          messages:[{ role:"user", content:`프로필:\n${PROFILE}\n\n공고 ${jobs.length}개:\n${summary}\n\nJSON만:\n{"skill_freq":[{"skill":"SQL","count":3}],"common_tasks":[],"common_requirements":[],"my_strengths":[],"my_gaps":[],"action_items":[],"differences":[]}` }]
        })
      });
      const data = await res.json();
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const clean = text.replace(/```json|```/g,"").trim();
      const s=clean.indexOf("{"), e=clean.lastIndexOf("}");
      setInsight(JSON.parse(clean.slice(s,e+1)));
    } catch { setInsight({error:true}); }
    setInsightLoading(false);
  }

  const selJob = selected ? jobs.find(j=>j.id===selected.id) || selected : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:"var(--font-sans)", minHeight:"600px" }}>

      {/* 상단 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:`0.5px solid ${C.border}`, background:C.bg }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:C.mint }}/>
          <span style={{ fontSize:"15px", fontWeight:"500", color:C.txt }}>공고 노트</span>
          <span style={{ fontSize:"12px", color:C.txt2 }}>{jobs.length}개 저장</span>
        </div>
        <div style={{ display:"flex", gap:"6px" }}>
          <button onClick={()=>{setView("list"); setShowAdd(false);}}
            style={{ padding:"6px 14px", borderRadius:"20px", border:"0.5px solid", fontSize:"12px", cursor:"pointer",
              borderColor: view==="list"&&!showAdd ? C.mint : "var(--color-border-secondary)",
              background: view==="list"&&!showAdd ? C.mintBg : "transparent",
              color: view==="list"&&!showAdd ? C.mint : C.txt2 }}>목록</button>
          <button onClick={()=>{setView("insight"); setShowAdd(false); if(!insight&&jobs.length>0) handleInsight();}}
            style={{ padding:"6px 14px", borderRadius:"20px", border:"0.5px solid", fontSize:"12px", cursor:"pointer",
              borderColor: view==="insight" ? C.mint : "var(--color-border-secondary)",
              background: view==="insight" ? C.mintBg : "transparent",
              color: view==="insight" ? C.mint : C.txt2 }}>역량 분석</button>
          <button onClick={()=>{setShowAdd(v=>!v); setPreview(null); setParseErr(""); setUrlInput("");}}
            style={{ padding:"6px 16px", borderRadius:"20px", border:"none", fontSize:"12px", cursor:"pointer",
              background: showAdd ? C.bg2 : C.mint, color: showAdd ? C.txt2 : "#fff" }}>
            {showAdd ? "취소" : "+ 공고 추가"}
          </button>
        </div>
      </div>

      {/* 공고 추가 패널 */}
      {showAdd && (
        <div style={{ padding:"16px 20px", borderBottom:`0.5px solid ${C.border}`, background:C.mintBg }}>
          {!preview ? (
            <>
              <p style={{ fontSize:"13px", color:C.txt2, margin:"0 0 10px" }}>공고 URL을 붙여넣으면 내용을 자동으로 파싱해요. 파싱 후 수정도 가능해요.</p>
              <div style={{ display:"flex", gap:"8px" }}>
                <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleParse()}
                  placeholder="https://www.wanted.co.kr/..." style={{ ...inSt, flex:1 }}/>
                <button onClick={handleParse} disabled={parsing||!urlInput.trim()}
                  style={{ padding:"9px 20px", borderRadius:"8px", border:"none", fontSize:"13px", cursor: parsing||!urlInput.trim()?"default":"pointer",
                    background: parsing||!urlInput.trim() ? C.bg2 : C.mint, color: parsing||!urlInput.trim() ? C.txt2 : "#fff", whiteSpace:"nowrap" }}>
                  {parsing ? "파싱 중..." : "불러오기"}
                </button>
              </div>
              {parseErr && <p style={{ fontSize:"12px", color:"#dc2626", margin:"8px 0 0" }}>{parseErr}</p>}
            </>
          ) : (
            /* 미리보기 + 수정 */
            <div>
              <p style={{ fontSize:"13px", fontWeight:"500", color:C.mint, margin:"0 0 12px" }}>파싱 완료 — 내용을 확인하고 수정한 뒤 저장하세요.</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"10px" }}>
                {[["company","회사명"],["title","직무명"],["location","근무지"],["deadline","마감일"]].map(([f,ph])=>(
                  <input key={f} value={preview[f]||""} onChange={e=>updatePreview(f,e.target.value)} placeholder={ph} style={inSt}/>
                ))}
              </div>
              {[["tasks","주요 업무","#dcfce7","#166534"],["requirements","자격 요건","#dbeafe","#1e40af"],["preferred","우대 사항","#fef9c3","#854d0e"]].map(([field,label,bg,color])=>(
                <div key={field} style={{ marginBottom:"10px" }}>
                  <p style={{ fontSize:"12px", fontWeight:"500", color:C.txt2, margin:"0 0 5px" }}>{label}</p>
                  {(preview[field]||[]).map((v,i)=>(
                    <div key={i} style={{ display:"flex", gap:"6px", marginBottom:"4px" }}>
                      <input value={v} onChange={e=>updatePreviewArr(field,i,e.target.value)} style={{ ...inSt, flex:1, fontSize:"12px", padding:"6px 10px" }}/>
                      <button onClick={()=>removePreviewArr(field,i)} style={{ padding:"4px 10px", borderRadius:"6px", border:`0.5px solid var(--color-border-secondary)`, background:"transparent", color:C.txt2, fontSize:"12px", cursor:"pointer" }}>−</button>
                    </div>
                  ))}
                  <button onClick={()=>addPreviewArr(field)} style={{ fontSize:"12px", color:color, background:bg, border:"none", borderRadius:"6px", padding:"4px 10px", cursor:"pointer" }}>+ 추가</button>
                </div>
              ))}
              <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
                <button onClick={handleSavePreview}
                  style={{ padding:"9px 24px", borderRadius:"8px", border:"none", background:C.mint, color:"#fff", fontSize:"13px", cursor:"pointer" }}>저장</button>
                <button onClick={()=>setPreview(null)}
                  style={{ padding:"9px 16px", borderRadius:"8px", border:`0.5px solid var(--color-border-secondary)`, background:"transparent", color:C.txt2, fontSize:"13px", cursor:"pointer" }}>다시 입력</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 메인 영역 */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", minHeight:"500px" }}>

        {/* 사이드바 - 공고 목록 */}
        {view==="list" && (
          <>
            <div style={{ width:"280px", flexShrink:0, borderRight:`0.5px solid ${C.border}`, overflowY:"auto", background:C.bg }}>
              {jobs.length===0 && (
                <div style={{ padding:"32px 16px", textAlign:"center" }}>
                  <p style={{ fontSize:"13px", color:C.txt2, margin:0 }}>공고를 추가해보세요.</p>
                </div>
              )}
              {jobs.map(job=>(
                <div key={job.id} onClick={()=>setSelected(job)}
                  style={{ padding:"14px 16px", borderBottom:`0.5px solid ${C.border}`, cursor:"pointer",
                    background: selJob?.id===job.id ? C.mintBg : C.bg,
                    borderLeft: selJob?.id===job.id ? `3px solid ${C.mint}` : "3px solid transparent" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"4px" }}>
                    <p style={{ fontSize:"13px", fontWeight:"500", margin:0, color:C.txt, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:"8px" }}>{job.title}</p>
                    <Tag label={job.status} bg={STATUS_META[job.status]?.bg} color={STATUS_META[job.status]?.text} size={10}/>
                  </div>
                  <p style={{ fontSize:"12px", color:C.txt2, margin:"0 0 6px" }}>{job.company} · {job.location||""}</p>
                  <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                    {(job.keywords||[]).slice(0,3).map((k,i)=><Tag key={i} label={k} bg={C.mintL} color={C.mint} size={10}/>)}
                  </div>
                  {job.deadline && <p style={{ fontSize:"11px", color:"#dc2626", margin:"5px 0 0" }}>마감 {job.deadline}</p>}
                </div>
              ))}
            </div>

            {/* 상세 패널 */}
            <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", background:C.bg }}>
              {!selJob ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"200px" }}>
                  <p style={{ fontSize:"14px", color:C.txt2 }}>공고를 선택하면 상세 내용이 표시돼요.</p>
                </div>
              ) : (
                <>
                  {/* 공고 헤더 */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
                    <div>
                      <h2 style={{ fontSize:"18px", fontWeight:"500", margin:"0 0 6px", color:C.txt }}>{selJob.title}</h2>
                      <p style={{ fontSize:"13px", color:C.txt2, margin:0 }}>{selJob.company} · {selJob.location||""}{selJob.deadline ? ` · 마감 ${selJob.deadline}` : ""} · {selJob.savedAt}</p>
                    </div>
                    <div style={{ display:"flex", gap:"8px" }}>
                      {selJob.url && <a href={selJob.url} target="_blank" rel="noreferrer" style={{ fontSize:"12px", padding:"6px 14px", borderRadius:"20px", border:`0.5px solid ${C.mint}`, color:C.mint, textDecoration:"none" }}>공고 원문 →</a>}
                      <button onClick={()=>handleDelete(selJob.id)} style={{ fontSize:"12px", padding:"6px 14px", borderRadius:"20px", border:"0.5px solid var(--color-border-secondary)", background:"transparent", color:C.txt2, cursor:"pointer" }}>삭제</button>
                    </div>
                  </div>

                  {/* 상태 변경 */}
                  <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"16px" }}>
                    {STATUS_OPTIONS.map(s=>(
                      <button key={s} onClick={()=>updateJob(selJob.id,{status:s})}
                        style={{ padding:"5px 12px", borderRadius:"20px", border:"0.5px solid transparent", fontSize:"12px", cursor:"pointer",
                          background: selJob.status===s ? STATUS_META[s].bg : C.bg2,
                          color: selJob.status===s ? STATUS_META[s].text : C.txt2 }}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* 키워드 */}
                  {(selJob.keywords||[]).length>0 && (
                    <div style={{ marginBottom:"16px" }}>
                      {selJob.keywords.map((k,i)=><Tag key={i} label={k} bg={C.mintL} color={C.mint}/>)}
                    </div>
                  )}

                  {/* 3단 내용 */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"16px" }}>
                    {[
                      ["주요 업무","tasks","#dcfce7","#166534"],
                      ["자격 요건","requirements","#dbeafe","#1e40af"],
                      ["우대 사항","preferred","#fef9c3","#854d0e"],
                    ].map(([label,field,bg,color])=>(
                      <div key={field} style={{ background:bg, borderRadius:"10px", padding:"12px" }}>
                        <p style={{ fontSize:"11px", fontWeight:"500", color, margin:"0 0 8px" }}>{label}</p>
                        {(selJob[field]||[]).map((r,i)=><p key={i} style={{ fontSize:"12px", color, margin:"3px 0", lineHeight:"1.5" }}>• {r}</p>)}
                        {(selJob[field]||[]).length===0 && <p style={{ fontSize:"12px", color, opacity:0.5, margin:0 }}>없음</p>}
                      </div>
                    ))}
                  </div>

                  {/* 메모 */}
                  <div>
                    <p style={{ fontSize:"12px", fontWeight:"500", color:C.txt2, margin:"0 0 6px" }}>메모</p>
                    <textarea value={selJob.memo||""} onChange={e=>updateJob(selJob.id,{memo:e.target.value})}
                      placeholder="면접 일정, 느낌, 특이사항 등..."
                      rows={3}
                      style={{ ...inSt, resize:"vertical", lineHeight:"1.6" }}/>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* 역량 분석 뷰 */}
        {view==="insight" && (
          <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
              <div>
                <p style={{ fontSize:"16px", fontWeight:"500", margin:"0 0 3px", color:C.txt }}>역량 분석</p>
                <p style={{ fontSize:"12px", color:C.txt2, margin:0 }}>저장된 공고 {jobs.length}개 기준</p>
              </div>
              <button onClick={handleInsight} disabled={insightLoading||jobs.length===0}
                style={{ padding:"7px 16px", borderRadius:"20px", border:`0.5px solid ${C.mint}`, background:"transparent", color:C.mint, fontSize:"12px", cursor: insightLoading||jobs.length===0 ? "default":"pointer" }}>
                {insightLoading ? "분석 중..." : "다시 분석"}
              </button>
            </div>

            {jobs.length===0 && <p style={{ fontSize:"14px", color:C.txt2 }}>공고를 먼저 추가해주세요.</p>}
            {insightLoading && <p style={{ fontSize:"13px", color:C.txt2 }}>공고들을 비교 분석하고 있어요...</p>}

            {insight && !insight.error && (
              <div style={{ display:"grid", gap:"14px" }}>

                {/* 스킬 빈도 */}
                {(insight.skill_freq||[]).length>0 && (
                  <div style={{ background:C.bg, border:`0.5px solid ${C.border}`, borderRadius:"12px", padding:"18px" }}>
                    <p style={{ fontSize:"13px", fontWeight:"500", margin:"0 0 14px", color:C.txt }}>공고에서 요구한 역량 빈도</p>
                    {(() => {
                      const max = Math.max(...(insight.skill_freq||[]).map(s=>s.count));
                      return (insight.skill_freq||[]).sort((a,b)=>b.count-a.count).map((s,i)=>(
                        <FreqBar key={i} label={s.skill} count={s.count} max={max} color={C.mint}/>
                      ));
                    })()}
                  </div>
                )}

                {/* 강점 / 갭 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                  <div style={{ background:"#f0fdf4", border:"0.5px solid #bbf7d0", borderRadius:"12px", padding:"16px" }}>
                    <p style={{ fontSize:"13px", fontWeight:"500", color:"#166534", margin:"0 0 12px" }}>이미 갖춘 강점</p>
                    {(insight.my_strengths||[]).map((s,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"8px", marginBottom:"6px" }}>
                        <span style={{ width:"16px", height:"16px", borderRadius:"50%", background:C.green, color:"#fff", fontSize:"10px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>✓</span>
                        <p style={{ fontSize:"12px", color:"#166534", margin:0, lineHeight:"1.5" }}>{s}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:"#fff7ed", border:"0.5px solid #fed7aa", borderRadius:"12px", padding:"16px" }}>
                    <p style={{ fontSize:"13px", fontWeight:"500", color:"#9a3412", margin:"0 0 12px" }}>부족한 역량</p>
                    {(insight.my_gaps||[]).map((g,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"8px", marginBottom:"6px" }}>
                        <span style={{ width:"16px", height:"16px", borderRadius:"50%", background:"#f97316", color:"#fff", fontSize:"10px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>△</span>
                        <p style={{ fontSize:"12px", color:"#9a3412", margin:0, lineHeight:"1.5" }}>{g}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 공통 패턴 */}
                <div style={{ background:C.bg, border:`0.5px solid ${C.border}`, borderRadius:"12px", padding:"18px" }}>
                  <p style={{ fontSize:"13px", fontWeight:"500", margin:"0 0 12px", color:C.txt }}>공고 공통 패턴</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
                    {[["공통 업무","common_tasks","#dcfce7","#166534"],["공통 요건","common_requirements","#dbeafe","#1e40af"],["공통 우대","common_preferred","#fef9c3","#854d0e"]].map(([label,field,bg,color])=>(
                      <div key={field} style={{ background:bg, borderRadius:"8px", padding:"12px" }}>
                        <p style={{ fontSize:"11px", fontWeight:"500", color, margin:"0 0 6px" }}>{label}</p>
                        {(insight[field]||[]).map((r,i)=><p key={i} style={{ fontSize:"12px", color, margin:"3px 0" }}>• {r}</p>)}
                      </div>
                    ))}
                  </div>
                  {(insight.differences||[]).length>0 && (
                    <div style={{ marginTop:"12px", paddingTop:"12px", borderTop:`0.5px solid ${C.border}` }}>
                      <p style={{ fontSize:"11px", fontWeight:"500", color:C.txt2, margin:"0 0 6px" }}>공고 간 차이점</p>
                      {insight.differences.map((d,i)=><p key={i} style={{ fontSize:"12px", color:C.txt, margin:"3px 0" }}>• {d}</p>)}
                    </div>
                  )}
                </div>

                {/* 액션 아이템 */}
                <div style={{ background:C.mintBg, border:`0.5px solid ${C.mintL}`, borderRadius:"12px", padding:"18px" }}>
                  <p style={{ fontSize:"13px", fontWeight:"500", color:C.mint, margin:"0 0 12px" }}>지금 당장 준비할 것들</p>
                  {(insight.action_items||[]).map((a,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:"8px" }}>
                      <span style={{ width:"20px", height:"20px", borderRadius:"50%", background:C.mint, color:"#fff", fontSize:"11px", fontWeight:"500", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</span>
                      <p style={{ fontSize:"13px", color:C.mint, margin:0, lineHeight:"1.6" }}>{a}</p>
                    </div>
                  ))}
                </div>

              </div>
            )}
            {insight?.error && <p style={{ fontSize:"13px", color:"#dc2626" }}>분석 중 오류가 발생했어요. 다시 시도해주세요.</p>}
          </div>
        )}
      </div>
    </div>
  );
}