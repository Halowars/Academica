import type {EditorState} from '@tiptap/pm/state';

export const slashCommands=[
  {name:'cite',label:'Citation',description:'Cite a source or verify nearby quoted text'},
  {name:'link',label:'Link',description:'Add a web address with your own display text'},
  {name:'hanging',label:'Hanging indent',description:'Format this paragraph with a half-inch hanging indent'},
  {name:'evidence',label:'Evidence',description:'Connect this writing to a saved source passage'},
  {name:'note',label:'Passage note',description:'Attach a private note to this exact place'},
  {name:'todo',label:'Checklist',description:'Attach a small checklist to this exact place'},
  {name:'label',label:'Label',description:'Mark selected text as a thesis, topic, or claim'},
  {name:'heading',label:'Section',description:'Add a manuscript section'},
  {name:'ref',label:'Cross-reference',description:'Point to a section, figure, table, or equation'},
  {name:'break',label:'Page break',description:'Begin the next page here'},
  {name:'footnote',label:'Footnote',description:'Add a submission footnote'},
  {name:'figure',label:'Figure',description:'Insert an image with a caption'},
  {name:'table',label:'Table',description:'Insert a table with a caption'},
  {name:'equation',label:'Equation',description:'Insert a numbered equation'},
  {name:'puppy',label:'Puppy break',description:'A puppy, confetti, and a little woof for four seconds'},
  {name:'duck',label:'Duck break',description:'A duck, confetti, and a little quack for four seconds'},
] as const;

export type SlashCommandName=(typeof slashCommands)[number]['name'];
export type SlashCommand=(typeof slashCommands)[number];
export type SlashCommandMatch={from:number;to:number;query:string};

export function slashCommandMatch(state:EditorState):SlashCommandMatch|null{
  if(!state.selection.empty)return null;
  const head=state.selection.$from;
  if(!head.parent.isTextblock)return null;
  const before=head.parent.textBetween(0,head.parentOffset,'\n','\ufffc');
  const match=before.match(/(?:^|\s)(\/[a-z]*)$/i);
  if(!match)return null;
  return{from:state.selection.from-match[1].length,to:state.selection.from,query:match[1].slice(1).toLowerCase()};
}

export function filterSlashCommands(query:string):readonly SlashCommand[]{
  const term=query.trim().toLowerCase();
  if(!term)return slashCommands;
  return slashCommands.filter(command=>command.name.startsWith(term)||command.label.toLowerCase().includes(term));
}

export function exactSlashCommand(query:string):SlashCommand|undefined{
  return slashCommands.find(command=>command.name===query.toLowerCase());
}
