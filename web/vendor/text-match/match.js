// SPDX-License-Identifier: MIT
// Adapted buildNorm from zhang-brook/web-teleprompter src/utils/match.ts
// revision 42982afd04fd297b6075e0c8539cb93ed4e143ef; see adjacent LICENSE.
// Adaptation: map UTF-16 offsets across code points and lowercase expansions.
const PUNCT_RE=/[\s\p{P}\p{S}]/u;
export function buildNorm(text){
 const normToOrig=[],origToNorm=new Array(text.length).fill(-1);let norm='',i=0;
 for(const ch of text){
  if(!PUNCT_RE.test(ch)){origToNorm[i]=norm.length;const lower=ch.toLowerCase();for(let j=0;j<lower.length;j++)normToOrig.push(i);norm+=lower;}
  i+=ch.length;
 }
 return {norm,normToOrig,origToNorm};
}
