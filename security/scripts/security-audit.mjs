import fs from "node:fs";
import path from "node:path";
const tokenRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const suspicious = [/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/, /(?:mnemonic|seed phrase|recovery phrase)\s*[:=]\s*["'][^"']+/i, /TRITON_RPC_TOKEN\s*=\s*\S+/, /HELIUS_API_KEY\s*=\s*\S+/];
const errors=[]; const stack=[tokenRoot];
while(stack.length){ const p=stack.pop(); const st=fs.statSync(p); if(st.isDirectory()){ for(const n of fs.readdirSync(p)) stack.push(path.join(p,n)); continue; } if(/\.(?:png|jpg|jpeg)$/.test(p)) continue; const text=fs.readFileSync(p,'utf8'); for(const re of suspicious) if(re.test(text)) errors.push(path.relative(tokenRoot,p)); }
if(errors.length){ console.error(`Potential secret material found in token files: ${[...new Set(errors)].join(', ')}`); process.exit(1); }
console.log('JARVIS token security audit passed');
