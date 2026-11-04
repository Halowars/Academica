export function appURL(path=''){return new URL(path,new URL(import.meta.env.BASE_URL,window.location.href)).href;}
