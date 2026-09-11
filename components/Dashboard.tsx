"use client";
import { useEffect, useState } from "react";
import { LayoutDashboard, Bot, Users, Search, Megaphone, Inbox, Flame, Mail, BarChart3, Workflow, Plug, KeyRound, ShieldBan, ScrollText, Settings, Sparkles, Send, Radar, CheckCircle2 } from "lucide-react";

const nav = [
  ["Workspace",[[LayoutDashboard,"Overview",true],[Bot,"AI Agent"]]],
  ["Research",[[Users,"Leads"],[Search,"Research"]]],
  ["Outreach",[[Megaphone,"Campaigns"],[Inbox,"Inbox"],[Flame,"Hot Leads"],[Mail,"Mailboxes"]]],
  ["System",[[BarChart3,"Analytics"],[Workflow,"Automations"],[Plug,"Integrations"],[KeyRound,"API & MCP"],[ShieldBan,"Suppression"],[ScrollText,"Audit Logs"],[Settings,"Settings"]]]
] as const;

const leads = [
  { initials:"SJ",name:"Sarah Johnson",company:"eXp Realty",location:"Miami, FL",score:92,status:"Interested",class:"hot" },
  { initials:"MC",name:"Michael Chen",company:"Real Broker",location:"Austin, TX",score:87,status:"Contacted",class:"" },
  { initials:"EP",name:"Emily Parker",company:"Compass",location:"Tampa, FL",score:84,status:"Replied",class:"reply" },
  { initials:"DR",name:"Daniel Rivera",company:"eXp Realty",location:"Orlando, FL",score:81,status:"Qualified",class:"" }
];

export default function Dashboard(){
  const [active,setActive]=useState("Overview");
  const [command,setCommand]=useState("Find 50 high-fit real estate agents in Florida and prepare a personalized campaign");
  const [settings,setSettings]=useState<Record<string,string>>({OPENAI_MODEL:"gpt-5.6"});
  const [settingStatus,setSettingStatus]=useState<Record<string,{configured:boolean;source:string;value?:string}>>({});
  const [saveState,setSaveState]=useState("Ready");
  useEffect(()=>{ if(active==="Settings" || active==="Integrations") loadSettings(); },[active]);
  async function loadSettings(){
    try{const r=await fetch('/api/settings');const j=await r.json();setSettingStatus(j.settings||{});if(j.settings?.OPENAI_MODEL?.value)setSettings(v=>({...v,OPENAI_MODEL:j.settings.OPENAI_MODEL.value}));}catch{}
  }
  function updateSetting(key:string,value:string){setSettings(v=>({...v,[key]:value}));}
  async function saveSettings(){
    setSaveState("Saving…");
    try{
      const values=Object.fromEntries(Object.entries(settings).filter(([,v])=>v!==""));
      const r=await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({values})});
      if(!r.ok) throw new Error('Save failed');
      const j=await r.json();setSettingStatus(j.settings||{});
      setSettings({OPENAI_MODEL:j.settings?.OPENAI_MODEL?.value||"gpt-5.6"});setSaveState("Saved locally & encrypted");
    }catch{setSaveState("Could not save settings");}
  }
  async function clearSetting(key:string){
    setSaveState("Updating…");
    const r=await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({values:{[key]:"__CLEAR__"}})});
    const j=await r.json();setSettingStatus(j.settings||{});setSettings(v=>({...v,[key]:key==="OPENAI_MODEL"?"gpt-5.6":""}));setSaveState("Removed");
  }
  const settingGroups=[
    {title:"Hostinger Mail",desc:"Mail sending, mailbox access and inbound webhook verification.",fields:[["HOSTINGER_MAIL_TOKEN","Mail API token",true],["HOSTINGER_MAILBOX_RESOURCE_ID","Mailbox resource ID",false],["HOSTINGER_WEBHOOK_SECRET","Webhook secret",true]]},
    {title:"OpenAI",desc:"AI planning, reply classification and future research agents.",fields:[["OPENAI_API_KEY","OpenAI API key",true],["OPENAI_MODEL","Model",false]]},
    {title:"Telegram",desc:"Receive hot-lead and interested-reply notifications.",fields:[["TELEGRAM_BOT_TOKEN","Bot token",true],["TELEGRAM_CHAT_ID","Chat ID",false]]},
    {title:"Agent API",desc:"Protect REST/OpenClaw access to the LeadPilot agent endpoints.",fields:[["AGENT_API_KEY","Agent API key",true]]}
  ] as const;
  const [result,setResult]=useState("Ready");
  async function run(){
    setResult("Planning…");
    try{const r=await fetch('/api/agent/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command})});const j=await r.json();setResult(j.summary||j.error||'Command received');}catch{setResult('Demo command accepted — configure the backend API key for agent execution.');}
  }
  return <div className="app">
    <aside className="sidebar"><div className="brand"><div className="brandMark"><Radar size={18}/></div><span>LeadPilot AI</span></div>
      {nav.map(([group,items])=><div key={group}><div className="navLabel">{group}</div>{items.map(([Icon,label])=><button className={`navItem navButton ${active===label?'active':''}`} key={label} onClick={()=>setActive(label)}><Icon size={16}/><span>{label}</span></button>)}</div>)}
    </aside>
    <main className="main">
      {active==="Settings" || active==="Integrations" ? <>
        <div className="top"><div><div className="eyebrow">Local configuration</div><h1 className="title">Integrations & Secrets</h1><div className="sub">Credentials are encrypted and stored on this server. Existing secrets are never returned to the browser.</div></div><div className="pill"><span className="dot"/>Local encrypted store</div></div>
        <div className="settingsNotice"><ShieldBan size={17}/><div><b>Secrets stay local to this LeadPilot installation.</b><div>They are stored in <span className="code">data/settings.enc.json</span> using a locally generated AES-256-GCM key. Environment variables remain fallback values.</div></div></div>
        <div className="settingsGrid">{settingGroups.map(group=><section className="card settingsCard" key={group.title}><div className="panelHead"><div><div className="panelTitle">{group.title}</div><div className="panelMeta settingsDesc">{group.desc}</div></div></div>{group.fields.map(([key,label,secret])=>{const st=settingStatus[key];return <div className="settingRow" key={key}><div className="settingLabel"><label>{label}</label><span className={`configState ${st?.configured?'configured':''}`}>{st?.configured?`Configured · ${st.source}`:'Not configured'}</span></div><div className="settingInputRow"><input className="settingInput" type={secret?'password':'text'} value={settings[key]||''} placeholder={st?.configured&&secret?'••••••••••••••••':key==='OPENAI_MODEL'?'gpt-5.6':`Enter ${label.toLowerCase()}`} onChange={e=>updateSetting(key,e.target.value)}/>{st?.configured&&<button className="button ghost" onClick={()=>clearSetting(key)}>Remove</button>}</div><div className="fieldKey">{key}</div></div>})}</section>)}</div>
        <div className="settingsActions"><div className="saveState">{saveState}</div><button className="button saveButton" onClick={saveSettings}>Save settings locally</button></div>
      </> : <>
      <div className="top"><div><div className="eyebrow">AI sales operating system</div><h1 className="title">Outreach Command Center</h1><div className="sub">Research prospects, personalize outreach, track replies and surface buying intent.</div></div><div className="pill"><span className="dot"/>System operational</div></div>

      <section className="grid stats">
        {[['1,482','Leads','+142 this week'],['326','Contacted','22.0% of leads'],['84','Replies','25.8% reply rate'],['29','Positive','34.5% of replies'],['12','Opportunities','41.3% qualified'],['4','Won','$2.4k pipeline']].map(([v,l,f],i)=><div className="card stat" key={l}><div className="statLabel">{l}</div><div className="statValue">{v}</div><div className={`statFoot ${i>2?'positive':''}`}>{f}</div></div>)}
      </section>

      <section className="card command"><div className="panelHead"><div><div className="panelTitle"><Sparkles size={15} style={{verticalAlign:'-3px',marginRight:7}}/>AI Agent Command</div><div className="panelMeta" style={{marginTop:5}}>OpenAI / OpenClaw can use the same REST + MCP tools.</div></div><span className="badge reply">ASSISTED MODE</span></div><div className="commandBox"><input className="commandInput" value={command} onChange={e=>setCommand(e.target.value)}/><button className="button" onClick={run}><Send size={13} style={{verticalAlign:'-2px',marginRight:6}}/>Run Agent</button></div><div className="footerNote">{result}</div></section>

      <section className="grid contentGrid">
        <div className="card panel"><div className="panelHead"><div className="panelTitle">Top qualified leads</div><div className="panelMeta">AI-ranked by opportunity</div></div><table className="table"><thead><tr><th>Lead</th><th>Location</th><th>Score</th><th>Status</th></tr></thead><tbody>{leads.map(l=><tr key={l.name}><td><div className="person"><div className="avatar">{l.initials}</div><div><div className="name">{l.name}</div><div className="small">{l.company}</div></div></div></td><td>{l.location}</td><td><div className="score"><b>{l.score}</b><span className="scoreBar"><span className="scoreFill" style={{width:`${l.score}%`,display:'block'}}/></span></div></td><td><span className={`badge ${l.class}`}>{l.status}</span></td></tr>)}</tbody></table></div>
        <div className="card panel"><div className="panelHead"><div className="panelTitle">Live AI activity</div><div className="panelMeta">Last 15 minutes</div></div><div className="activity">
          <div className="activityItem"><div className="time">02:14</div><div className="activityText"><b>Researching 48 Florida agents</b><br/>Company pages + public business profiles</div></div>
          <div className="activityItem"><div className="time">02:13</div><div className="activityText"><b>Sarah Johnson qualified — 92</b><br/>Strong personal-branding opportunity</div></div>
          <div className="activityItem"><div className="time">02:12</div><div className="activityText"><b>Follow-up eligibility checked</b><br/>No reply, no suppression, campaign active</div></div>
          <div className="activityItem"><div className="time">02:11</div><div className="activityText"><b>🔥 New buying signal detected</b><br/>Emily asked for portfolio examples</div></div>
        </div></div>
      </section>

      <section className="grid contentGrid">
        <div className="card panel"><div className="panelHead"><div className="panelTitle">Pipeline funnel</div><div className="panelMeta">Realtor campaign</div></div><div className="funnel">{[['Discovered','1,482'],['Qualified','718'],['Contacted','326'],['Replied','84'],['Positive','29']].map(([l,n])=><div className="funnelStep" key={l}><div className="funnelNum">{n}</div><div className="funnelLab">{l}</div></div>)}</div><div className="apiBox"><CheckCircle2 size={13} style={{verticalAlign:'-2px',marginRight:6}}/><b>Policy layer active.</b> Agent send requests pass through suppression, reply-stop, campaign-state and mailbox-limit checks before Hostinger is called.</div></div>
        <div className="card panel"><div className="panelHead"><div className="panelTitle">Campaigns</div><button className="button secondary">New campaign</button></div><div className="campaign"><div><div className="campaignName">US Realtors — Signature Design</div><div className="campaignStats"><span>326 leads</span><span>84 replies</span><span>29 positive</span></div></div><span className="badge hot">ACTIVE</span></div><div className="campaign"><div><div className="campaignName">Texas Brokerages</div><div className="campaignStats"><span>118 leads</span><span>22 replies</span><span>9 positive</span></div></div><span className="badge">PAUSED</span></div><div className="apiBox"><span className="code">MCP:</span> plan_outreach · list_leads · send_email<br/><span className="code">REST:</span> /api/agent/command · /api/mail/send · /api/webhooks/hostinger</div></div>
      </section>
      </>}
    </main>
  </div>
}
