export const ANIMAL_BREAK_MS=4000;
export const animalBreaks={
  puppy:{sound:'bark.mp3',volume:.3,photos:[
    {file:'terrier.jpg',alt:'A little border terrier puppy looking up'},
    {file:'sleepy.jpg',alt:'A tiny black puppy resting in the sunshine'},
    {file:'running.jpg',alt:'A happy puppy running through the grass'},
  ]},
  duck:{sound:'meme-three-quacks-v4.mp3',volume:1,photos:[
    {file:'duckling.jpg',alt:'A little duckling swimming across sunlit water'},
    {file:'family.jpg',alt:'A mother duck swimming with her little ducklings'},
    {file:'ducklings.jpg',alt:'Two little brown and yellow ducklings together'},
  ]},
  cat:{sound:'meow.mp3',volume:.6,photos:[
    {file:'looking.jpg',alt:'A little kitten looking up with bright curious eyes'},
    {file:'sleeping.jpg',alt:'A tiny kitten curled up asleep on a soft bed'},
    {file:'siblings.jpg',alt:'Two little kitten siblings resting together'},
  ]},
  jigsaw:{sound:'game-quote.mp3',volume:.5,photos:[
    {file:'spotlight.jpg',alt:'Billy the Jigsaw puppet under a spotlight'},
    {file:'portrait.jpg',alt:'Billy the Jigsaw puppet with a red bow tie'},
    {file:'tiny.jpg',alt:'A tiny Billy puppet wrapped in a little blanket'},
    {file:'strawberries.jpg',alt:'A little Billy puppet sitting among strawberries'},
  ]},
} as const;
export type AnimalKind=keyof typeof animalBreaks;
export function randomAnimalPhoto(count:number,previous=-1,random=Math.random){
  if(count<=1)return 0;
  const hasPrevious=previous>=0&&previous<count;
  const choice=Math.floor(random()*(hasPrevious?count-1:count));
  return hasPrevious?(previous+1+choice)%count:choice;
}
