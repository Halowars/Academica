import type {LocalLinter} from 'harper.js';
import type {GrammarBlock,GrammarIssue} from './grammar-analysis';

/** Use Harper's UTF-16 spans, including across bold/italic text, without rewriting prose. */
export async function checkGrammar(linter:LocalLinter,blocks:GrammarBlock[],cache=new Map<string,Omit<GrammarIssue,'id'>[]>()){
  const issues:GrammarIssue[]=[];
  for(const block of blocks){
    let found=cache.get(block.text);
    if(!found){
      found=[];const lints=await linter.lint(block.text,{language:'plaintext'});
      for(const lint of lints){
        const span=lint.span(),from=span.start,to=span.end,text=lint.get_problem_text();
        if(from>=0&&to>from&&to<=block.text.length&&block.text.slice(from,to)===text&&lint.lint_kind()!=='Spelling'){
          const replacements=lint.suggestions(),suggestions=replacements.map(s=>{const value=s.get_replacement_text();return s.kind()===2?text+value:value;});
          replacements.forEach(s=>s.free());
          found.push({from,to,text,message:lint.message(),kind:lint.lint_kind_pretty(),suggestions:[...new Set(suggestions)].slice(0,5)});
        }
        span.free();lint.free();
      }
      if(cache.size>=150)cache.delete(cache.keys().next().value!);cache.set(block.text,found);
    }
    for(const item of found){issues.push({...item,id:`${block.pos+item.from}:${block.pos+item.to}:${item.message}`,from:block.pos+item.from,to:block.pos+item.to});if(issues.length>=250)return issues;}
  }return issues;
}
