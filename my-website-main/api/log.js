const LOG_API_KEY="ellreyxml-log-2026-rahasia"
const TTL_MS=3*60*1000
const MAX_LOGS=200
const logs=globalThis.__ELLREYXML_API_LOGS__??=[]

function json(data,status=200){
  return new Response(JSON.stringify(data,null,2),{
    status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store,no-cache,must-revalidate"
    }
  })
}

function authorized(req){
  const key=req.headers.get("x-api-key")||req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")
  return key===LOG_API_KEY
}

function getClientIP(req){
  return req.headers.get("x-nf-client-connection-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||req.headers.get("x-real-ip")||"unknown"
}

function cleanupLogs(){
  const now=Date.now()
  for(let i=logs.length-1;i>=0;i--){
    if(!logs[i]?._expiresAt||now>=logs[i]._expiresAt) logs.splice(i,1)
  }
}

function generateID(){
  return `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`
}

function cleanLog(log){
  const {_expiresAt,...data}=log
  return data
}

export default async function handler(req){
  cleanupLogs()

  if(!authorized(req)){
    return json({
      success:false,
      message:"Unauthorized",
      author:"ellreyxml"
    },401)
  }

  if(req.method==="POST"){
    let body

    try{
      body=await req.json()
    }catch{
      return json({
        success:false,
        message:"Invalid JSON body",
        author:"ellreyxml"
      },400)
    }

    if(!body||typeof body!=="object"||Array.isArray(body)){
      return json({
        success:false,
        message:"Body must be an object",
        author:"ellreyxml"
      },400)
    }

    const now=Date.now()
    const response=body.response!==undefined?body.response:body.data!==undefined?body.data:null

    const log={
      id:generateID(),
      endpoint:body.endpoint||"unknown",
      method:body.method||"GET",
      ip:body.ip||getClientIP(req),
      userAgent:body.userAgent||req.headers.get("user-agent")||"unknown",
      referer:body.referer||req.headers.get("referer")||null,
      status:body.status!==undefined?Number(body.status):null,
      responseTime:body.responseTime!==undefined?Number(body.responseTime):null,
      query:body.query!==undefined?body.query:null,
      message:body.message!==undefined?String(body.message):null,
      response,
      createdAt:new Date(now).toISOString(),
      expiresAt:new Date(now+TTL_MS).toISOString(),
      _expiresAt:now+TTL_MS
    }

    logs.push(log)

    if(logs.length>MAX_LOGS){
      logs.splice(0,logs.length-MAX_LOGS)
    }

    return json({
      success:true,
      message:"Log received",
      id:log.id,
      expiresAt:log.expiresAt,
      author:"ellreyxml"
    },201)
  }

  if(req.method==="GET"){
    const url=new URL(req.url)
    let limit=Number(url.searchParams.get("limit"))||100

    if(!Number.isFinite(limit)) limit=100
    limit=Math.min(Math.max(Math.floor(limit),1),100)

    const consume=url.searchParams.get("consume")==="1"

    const result=logs.slice(0,limit).map(cleanLog)

    if(consume){
      logs.splice(0,result.length)
    }

    return json({
      success:true,
      count:result.length,
      logs:result,
      author:"ellreyxml"
    })
  }

  if(req.method==="DELETE"){
    const url=new URL(req.url)
    const idsParam=url.searchParams.get("ids")

    if(idsParam){
      const ids=new Set(
        idsParam
          .split(",")
          .map(x=>x.trim())
          .filter(Boolean)
      )

      let deleted=0

      for(let i=logs.length-1;i>=0;i--){
        if(ids.has(logs[i]?.id)){
          logs.splice(i,1)
          deleted++
        }
      }

      return json({
        success:true,
        message:"Logs acknowledged",
        deleted,
        author:"ellreyxml"
      })
    }

    const deleted=logs.length
    logs.length=0

    return json({
      success:true,
      message:"Logs cleared",
      deleted,
      author:"ellreyxml"
    })
  }

  return json({
    success:false,
    message:"Method not allowed",
    author:"ellreyxml"
  },405)
}
