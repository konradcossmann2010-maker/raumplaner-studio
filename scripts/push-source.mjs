// Credential is read from hidden stdin, used in process memory, never persisted.
import {spawnSync} from 'node:child_process';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for credential JSON on stdin (input hidden).');
let input='';for await(const chunk of process.stdin){input+=chunk.toString();if(input.includes('\n'))break;}
if(process.stdin.isTTY)process.stdin.setRawMode(false);
const credential=JSON.parse(input.trim());
const env={...process.env};if(credential.auth_mode!=='work_proxy'){env.GIT_CONFIG_COUNT='1';env.GIT_CONFIG_KEY_0='http.'+credential.remote_url+'.extraheader';env.GIT_CONFIG_VALUE_0='Authorization: Bearer '+credential.token;}
const run=(args)=>{const r=spawnSync('git',args,{env,encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stderr);process.exit(r.status??1)}return r.stdout.trim()};
run(['push',credential.remote_url,'HEAD:refs/heads/'+credential.branch]);console.log(JSON.stringify({commit_sha:run(['rev-parse','HEAD'])}));process.exit(0);
