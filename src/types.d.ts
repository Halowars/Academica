declare module '*.csl?raw' { const content:string; export default content; }
declare module '*.xml?raw' { const content:string; export default content; }
declare module 'citeproc' { const CSL:any; export default CSL; }
declare module 'pagedjs' { export const Previewer:any; }
