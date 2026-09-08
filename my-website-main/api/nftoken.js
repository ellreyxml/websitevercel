import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from '@sparticuz/chromium';
import http from 'http';
import tls from 'tls';

puppeteer.use(StealthPlugin());

const BASE = 'https://nftools.aroshi.my.id';
const TARGET_HOST = 'nftools.aroshi.my.id';
const AUTHOR = 'ellreyxml';

const COUNTRY_NAMES = {
  US:'UNITED STATES',GB:'UNITED KINGDOM',DE:'GERMANY',FR:'FRANCE',JP:'JAPAN',
  KR:'SOUTH KOREA',IN:'INDIA',BR:'BRAZIL',CA:'CANADA',AU:'AUSTRALIA',
  IT:'ITALY',ES:'SPAIN',MX:'MEXICO',PH:'PHILIPPINES',ID:'INDONESIA',
  MY:'MALAYSIA',TH:'THAILAND',SG:'SINGAPORE',TR:'TURKEY',PL:'POLAND',
  NL:'NETHERLANDS',SE:'SWEDEN',NO:'NORWAY',DK:'DENMARK',FI:'FINLAND',
  PT:'PORTUGAL',AR:'ARGENTINA',CL:'CHILE',CO:'COLOMBIA',PK:'PAKISTAN',
  BD:'BANGLADESH',NG:'NIGERIA',EG:'EGYPT',ZA:'SOUTH AFRICA',VN:'VIETNAM',
  RU:'RUSSIA',UA:'UKRAINE',
};

const countryName = code => {
  if (!code || code === 'Unknown' || code === 'NA') {
    return code || 'Unknown';
  }

  return `${code} (${COUNTRY_NAMES[code] || code})`;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


// ─────────────────────────────────────────────────────────────
// HTTP PROXY LIST
// ─────────────────────────────────────────────────────────────

async function fetchHttpProxies() {
  const urls = [
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt'
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) continue;

      const text = await response.text();

      const proxies = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes(':'));

      if (proxies.length > 0) {
        return proxies;
      }
    } catch {}
  }

  return [];
}


// ─────────────────────────────────────────────────────────────
// TEST PROXY
// ─────────────────────────────────────────────────────────────

function testProxy(proxy) {
  return new Promise(resolve => {
    try {
      const [host, port] = proxy.split(':');

      if (!host || !port) {
        return resolve(null);
      }

      const request = http.request({
        host,
        port: parseInt(port),
        method: 'CONNECT',
        path: `${TARGET_HOST}:443`,
        timeout: 4000
      });

      request.on('connect', (response, socket) => {
        if (response.statusCode !== 200) {
          socket.destroy();
          return resolve(null);
        }

        const tlsSocket = tls.connect({
          socket,
          servername: TARGET_HOST,
          rejectUnauthorized: false
        });

        let finished = false;

        const done = value => {
          if (finished) return;
          finished = true;

          try {
            tlsSocket.destroy();
          } catch {}

          resolve(value);
        };

        tlsSocket.on('secureConnect', () => {
          done(proxy);
        });

        tlsSocket.on('error', () => {
          done(null);
        });

        setTimeout(() => {
          done(null);
        }, 3000);
      });

      request.on('error', () => resolve(null));

      request.on('timeout', () => {
        request.destroy();
        resolve(null);
      });

      request.end();

    } catch {
      resolve(null);
    }
  });
}


// ─────────────────────────────────────────────────────────────
// FIND WORKING PROXIES
// ─────────────────────────────────────────────────────────────

async function findWorkingProxies(proxyList) {
  const shuffled = [...proxyList]
    .sort(() => Math.random() - 0.5)
    .slice(0, 100);

  const results = await Promise.allSettled(
    shuffled.map(proxy => testProxy(proxy))
  );

  return results
    .filter(result =>
      result.status === 'fulfilled' &&
      result.value
    )
    .map(result => result.value);
}


// ─────────────────────────────────────────────────────────────
// LAUNCH CHROMIUM - VERCEL
// ─────────────────────────────────────────────────────────────

async function launchBrowser(proxy = null) {

  const args = [
    ...chromium.args,

    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-features=Translate,BackForwardCache',
    '--ignore-certificate-errors',
    '--window-size=360,640'
  ];

  if (proxy) {
    args.push(`--proxy-server=http://${proxy}`);
  }

  const executablePath = await chromium.executablePath();

  return puppeteer.launch({
    headless: chromium.headless,
    executablePath,
    args,
    defaultViewport: {
      width: 360,
      height: 640,
      deviceScaleFactor: 1
    },
    ignoreHTTPSErrors: true
  });
}


// ─────────────────────────────────────────────────────────────
// SINGLE GENERATE
// ─────────────────────────────────────────────────────────────

async function generateViaBrowser(plan, proxy = null) {

  let browser = null;

  try {

    browser = await launchBrowser(proxy);

    const pages = await browser.pages();

    const page =
      pages[0] ||
      await browser.newPage();

    await page.setViewport({
      width: 360,
      height: 640
    });

    await page.goto(
      BASE + '/nftoken',
      {
        waitUntil: 'load',
        timeout: 25000
      }
    );

    await sleep(2000);

    const title = await page.title();

    if (
      title.includes('Just a moment') ||
      title.includes('Attention Required')
    ) {

      await sleep(10000);

      await page.waitForFunction(
        () => !document.title.includes('Just a moment'),
        {
          timeout: 15000
        }
      ).catch(() => {});
    }

    await sleep(1500);

    const result = await page.evaluate(async plan => {

      function headers(token) {

        return {
          'Content-Type': 'application/json',

          ...(token
            ? {
                'X-NFToken-Session': token
              }
            : {})
        };
      }


      // ─────────────────────────────────────────────
      // POW
      // ─────────────────────────────────────────────

      async function solvePow(challenge) {

        const encoder = new TextEncoder();

        for (
          let nonce = 0;
          nonce < 2000000;
          nonce++
        ) {

          const hash =
            await crypto.subtle.digest(
              'SHA-256',
              encoder.encode(
                challenge + nonce
              )
            );

          const hex =
            Array
              .from(new Uint8Array(hash))
              .map(
                byte =>
                  byte
                    .toString(16)
                    .padStart(2, '0')
              )
              .join('');

          if (hex.startsWith('0000')) {
            return `${challenge}:${nonce}`;
          }
        }

        return null;
      }


      // ─────────────────────────────────────────────
      // RANDOM TOKEN
      // ─────────────────────────────────────────────

      async function getToken(sessionToken) {

        const response =
          await fetch(
            '/api/random',
            {
              method: 'POST',

              headers:
                headers(sessionToken),

              body:
                JSON.stringify({
                  plan
                })
            }
          );

        const data =
          await response.json();


        if (data.powChallenge) {

          const proof =
            await solvePow(
              data.powChallenge
            );

          if (!proof) {
            return {
              success: false,
              error: 'pow_failed'
            };
          }


          const requestHeaders =
            headers(sessionToken);

          requestHeaders['X-PoW-Proof'] =
            proof;


          const secondResponse =
            await fetch(
              '/api/random',
              {
                method: 'POST',

                headers:
                  requestHeaders,

                body:
                  JSON.stringify({
                    plan
                  })
              }
            );

          return await secondResponse.json();
        }


        return data;
      }


      // ─────────────────────────────────────────────
      // SESSION
      // ─────────────────────────────────────────────

      const sessionResponse =
        await fetch(
          '/api/session',
          {
            method: 'POST',
            headers: headers()
          }
        );


      const sessionData =
        await sessionResponse.json();


      if (!sessionData.success) {

        return {
          success: false,
          error:
            sessionData.error ||
            'session_failed'
        };
      }


      const sessionToken =
        sessionData.token;


      // ─────────────────────────────────────────────
      // GENERATE
      // ─────────────────────────────────────────────

      let data =
        await getToken(
          sessionToken
        );


      // ─────────────────────────────────────────────
      // SESSION RETRY
      // ─────────────────────────────────────────────

      if (
        data.error &&
        String(data.error)
          .toLowerCase()
          .includes('session')
      ) {

        const retrySession =
          await fetch(
            '/api/session',
            {
              method: 'POST',
              headers: headers()
            }
          );


        const retryData =
          await retrySession.json();


        if (retryData.success) {

          data =
            await getToken(
              retryData.token
            );
        }
      }


      // ─────────────────────────────────────────────
      // RESULT
      // ─────────────────────────────────────────────

      if (
        data.success &&
        data.url
      ) {

        return {

          success: true,

          plan:
            data.plan ||
            plan,

          quality:
            data.quality ||
            '—',

          country:
            data.country ||
            'Unknown',

          url:
            data.url,

          expires:
            data.expires ||
            null,

          pool:
            data.pool ||
            null
        };
      }


      return {

        success: false,

        error:
          data.error ||
          'unknown'
      };

    }, plan);


    return result;

  } catch (error) {

    return {
      success: false,
      error: error.message,
      errorName: error.name
    };

  } finally {

    if (browser) {
      await browser
        .close()
        .catch(() => {});
    }
  }
}

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});}

export default async function handler(req){
 const started=Date.now();
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
 if(req.method!=="GET") return json({success:false,author:AUTHOR,error:"Method not allowed"},405);
 try{
  const params=new URL(req.url).searchParams; const plan=String(params.get("plan")||"premium").toLowerCase();
  if(!["premium","standard","basic"].includes(plan)) return json({success:false,author:AUTHOR,error:"Invalid plan",available:["premium","standard","basic"]},400);
  let count=parseInt(params.get("count")||"1",10); if(Number.isNaN(count)||count<1) count=1; count=Math.min(count,5);
  const useProxy=params.get("proxy")==="true"||params.get("proxy")==="1"; let workingProxies=[]; if(useProxy){workingProxies=await findWorkingProxies(await fetchHttpProxies());}
  const results=[],errors=[],exhaustedProxies=new Set(); let proxyIndex=0;
  const nextProxy=()=>{if(!workingProxies.length)return null;for(let i=0;i<workingProxies.length;i++){const proxy=workingProxies[proxyIndex%workingProxies.length];proxyIndex++;if(!exhaustedProxies.has(proxy))return proxy;}return null;};
  const maxAttempts=useProxy?count*3:count; let attempt=0;
  while(results.length<count&&attempt<maxAttempts){attempt++;const proxy=useProxy?nextProxy():null;if(useProxy&&!proxy){errors.push({attempt,stage:"proxy",error:"No working proxy available"});break;}const result=await generateViaBrowser(plan,proxy);
   if(result.success) results.push({success:true,plan:result.plan||plan,quality:result.quality||"—",country:result.country||"Unknown",country_name:countryName(result.country),url:result.url,expires:result.expires||null,pool:result.pool||null,proxy:proxy||null});
   else{errors.push({attempt,stage:"generate",error:result.error||"unknown",proxy:proxy||null});const e=String(result.error||"").toLowerCase();if(proxy&&(e.includes("limit")||e.includes("terlalu")))exhaustedProxies.add(proxy);if(!useProxy&&e.includes("limit"))break;}
   if(results.length<count) await sleep(1200+Math.random()*1500);
  }
  const response={success:results.length>0,author:AUTHOR,plan,requested:count,total:results.length,failed:count-results.length,results,meta:{attempts:attempt,execution_ms:Date.now()-started,proxy:useProxy,max_count:5}}; if(errors.length)response.errors=errors; return json(response,results.length?200:502);
 }catch(error){return json({success:false,author:AUTHOR,error:error?.message||String(error),error_name:error?.name,execution_ms:Date.now()-started},500);}
}
