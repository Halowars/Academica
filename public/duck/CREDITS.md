# Duck break media

Photos and sound are bundled locally. No random-image or sound service is contacted.

- `duckling.jpg`: Bernard Spragg, **Duckling (8692520910).jpg**, CC0 1.0. https://commons.wikimedia.org/wiki/File:Duckling_(8692520910).jpg
- `family.jpg`: Lisa Redfern / Lisafern, **Mama Duck with Ducklings Public Domain.jpg**, CC0 1.0. https://commons.wikimedia.org/wiki/File:Mama_Duck_with_Ducklings_Public_Domain.jpg
- `ducklings.jpg`: Roksolana Zasiadko, **Duckling chicks (Unsplash).jpg**, published before the Unsplash license change, CC0 1.0. https://commons.wikimedia.org/wiki/File:Duckling_chicks_(Unsplash).jpg
- `quack.mp3`: U.S. Fish and Wildlife Service, **Ducks landing in water.ogg**, public domain U.S. federal government work. https://commons.wikimedia.org/wiki/File:Ducks_landing_in_water.ogg — a four-second excerpt, converted to MP3 with short fades.

The popup and sound stop after four seconds. Media never enters the manuscript or exports.

- `quack-distinct-v2.mp3` (current sound): Sess8it, **Quacking Sound for Duck**, CC0 1.0. Original: https://freesound.org/people/Sess8it/sounds/532287/ . Normalized/trimmed/encoded version from SoundMonster: https://github.com/jonjonsson/SoundMonster/blob/7e07f0580aa5e40e7205b6be378787854a61f4e7/Public%20domain/quack%20duck.mp3 . The exact source is fetched and checksum-verified during the build, then served locally. Playback repeats the isolated sample exactly three times, with 280 ms gaps, at full media volume; long source clips are paced to at most 0.8 seconds per quack while preserving pitch. Muting or closing cancels the sequence.
