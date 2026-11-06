export function dictionaryWords(value:unknown):string[]{
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter((word):word is string=>typeof word==='string'&&/^[A-Za-z]+(?:[’'-][A-Za-z]+)*$/.test(word)&&word.length<=55))].slice(0,5000);
}

function distance(a:string,b:string,limit:number){
  if(Math.abs(a.length-b.length)>limit)return limit+1;
  let previous=Array.from({length:b.length+1},(_,index)=>index),beforePrevious=previous;
  for(let i=1;i<=a.length;i++){
    const next=[i];
    for(let j=1;j<=b.length;j++){
      next[j]=Math.min(previous[j]+1,next[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])next[j]=Math.min(next[j],beforePrevious[j-2]+1);
    }
    beforePrevious=previous;previous=next;
  }
  return previous[b.length];
}

/** Only a unique close specialist term may be corrected automatically. */
export function personalWordCorrection(word:string,terms:Iterable<string>):string|undefined{
  if(word.length<5)return;
  const lower=word.toLowerCase(),limit=word.length>=10?2:1;
  let best:number=limit+1,result:string|undefined,ambiguous=false;
  for(const term of terms){const score=distance(lower,term.toLowerCase(),limit);if(score===0)return;if(score<best){best=score;result=term;ambiguous=false;}else if(score===best&&term.toLowerCase()!==result?.toLowerCase())ambiguous=true;}
  if(!result||best>limit||ambiguous)return;
  if(word===word.toUpperCase())return result.toUpperCase();
  return word[0]===word[0].toUpperCase()?result[0].toUpperCase()+result.slice(1):result;
}
