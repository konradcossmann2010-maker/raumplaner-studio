import {it,expect} from 'vitest';
import {api,owner,type Env} from '../server/index';
it('rejects anonymous requests before reading storage',async()=>{const r=await api(new Request('https://example.org/api/projects'),{} as Env);expect(r.status).toBe(401)});
it('does not enable local authentication on hosted origins',()=>expect(owner(new Request('https://example.org/api/projects'),{LOCAL_DEV:'true'} as Env)).toBeNull());
it('rejects cross origin writes',async()=>{const r=await api(new Request('https://example.org/api/projects',{method:'POST',headers:{'oai-authenticated-user-id':'test','origin':'https://evil.org'}}),{} as Env);expect(r.status).toBe(403)});
it('rejects access to another owners asset',async()=>{const env={DB:{prepare:()=>({bind:()=>({first:async()=>null})})}} as unknown as Env;const r=await api(new Request('https://example.org/api/assets/private',{headers:{'oai-authenticated-user-id':'other'}}),env);expect(r.status).toBe(404)});
