export function hangingIndent(value:unknown){const number=Number(value);return Number.isFinite(number)?Math.max(0,Math.min(1.5,number)):0;}
export function paragraphIndent(attrs:Record<string,any>={},defaultFirstLine=0){
  const hanging=hangingIndent(attrs.hangingIndent);
  const first=attrs.firstIndent===null||attrs.firstIndent===undefined?defaultFirstLine:Number(attrs.firstIndent);
  return hanging?{left:hanging,hanging,firstLine:0}:{left:0,hanging:0,firstLine:Number.isFinite(first)?Math.max(0,Math.min(1.5,first)):defaultFirstLine};
}
export function paragraphIndentCSS(attrs:Record<string,any>={},defaultFirstLine=0){const indent=paragraphIndent(attrs,defaultFirstLine);return `padding-left:${indent.left}in;text-indent:${indent.hanging?-indent.hanging:indent.firstLine}in`;}
