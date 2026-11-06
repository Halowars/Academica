export const ANIMAL_BREAK_MS=4000;
export const animalBreaks={
  puppy:{sound:'bark.mp3',photos:[
    {file:'terrier.jpg',alt:'A little border terrier puppy looking up'},
    {file:'sleepy.jpg',alt:'A tiny black puppy resting in the sunshine'},
    {file:'running.jpg',alt:'A happy puppy running through the grass'},
  ]},
  duck:{sound:'quack-distinct-v2.mp3',photos:[
    {file:'duckling.jpg',alt:'A little duckling swimming across sunlit water'},
    {file:'family.jpg',alt:'A mother duck swimming with her little ducklings'},
    {file:'ducklings.jpg',alt:'Two little brown and yellow ducklings together'},
  ]},
} as const;
export type AnimalKind=keyof typeof animalBreaks;
export function randomAnimalPhoto(count:number,previous=-1,random=Math.random){
  if(count<=1)return 0;
  const hasPrevious=previous>=0&&previous<count;
  const choice=Math.floor(random()*(hasPrevious?count-1:count));
  return hasPrevious?(previous+1+choice)%count:choice;
}
