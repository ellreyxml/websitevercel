import { scrapeTikWM } from "../src/tiktok.js";
const AUTHOR = "ellreyxml";
const LOG_API_KEY = "ellreyxml-log-2026-rahasia";
const headers = {"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"no-store"};
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers});}
async function sendLog(req,data){try{await fetch(new URL("/api/log",req.url),{method:"POST",headers:{"Content-Type":"application/json","x-api-key":LOG_API_KEY},body:JSON.stringify(data)});}catch(e){console.error("TikTok Log Error:",e?.message||e);}}
export default async function handler(req){
 const started=Date.now();
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
 if(req.method!=="GET"){const response={status:false,message:"Method not allowed"};await sendLog(req,{endpoint:"/api/tiktok",method:req.method,status:405,responseTime:Date.now()-started,message:response.message,response});return json(response,405);}
 try{
  const u=new URL(req.url), url=u.searchParams.get("url"), query=Object.fromEntries(u.searchParams);
  if(!url){const response={status:false,message:"Parameter url wajib diisi",example:"/api/tiktok?url=https://www.tiktok.com/@user/video/123"};await sendLog(req,{endpoint:"/api/tiktok",method:"GET",status:400,responseTime:Date.now()-started,query,message:response.message,response});return json(response,400);}
  if(!url.includes("tiktok.com")&&!url.includes("vt.tiktok.com")){const response={status:false,message:"URL TikTok tidak valid"};await sendLog(req,{endpoint:"/api/tiktok",method:"GET",status:400,responseTime:Date.now()-started,query,message:response.message,response});return json(response,400);}
  const result=await scrapeTikWM(url);
  const response={status:true,author:AUTHOR,result:{id:result.id,region:result.region,title:result.title,cover:result.cover,aiDynamicCover:result.aiDynamicCover,originCover:result.originCover,play:result.play,wmplay:result.wmplay,hdplay:result.hdplay,music:result.music,musicInfo:result.musicInfo,images:result.images,author:result.author,authorId:result.authorId,username:result.username,nickname:result.nickname,avatar:result.avatar,duration:result.duration,size:result.size,wmSize:result.wmSize,playCount:result.playCount,diggCount:result.diggCount,commentCount:result.commentCount,shareCount:result.shareCount,downloadCount:result.downloadCount,collectCount:result.collectCount,createTime:result.createTime},timestamp:new Date().toISOString()};
  await sendLog(req,{endpoint:"/api/tiktok",method:"GET",status:200,responseTime:Date.now()-started,query,message:"TikTok berhasil diproses",response});return json(response);
 }catch(error){console.error("TikTok API Error:",error);const response={status:false,author:AUTHOR,message:error?.message||"Gagal memproses TikTok"};await sendLog(req,{endpoint:"/api/tiktok",method:"GET",status:500,responseTime:Date.now()-started,message:response.message,response});return json(response,500);}
}
