# wes-game
Wesley's Game

This project implements Wesley's Game with 4 variable (attack, defense, hps, speed).  Currently you can play vs randomly generated opponent stats or match up against stats uploaded by another player.  After connecting you get to view the matchup and watch the fight.

## Hacking at home

I've implemented it as a static site.  That means if you download the code (using the button at the top of this page) you just have to open the index.html file with a browser and you will have a fully functioning local version.  The opponent match code is in app.py and is running on a cloud server.  It will still work on your home version if you are connected to the internet.

One thing to try might be to change the GIF animations.  If you make or find your own battle gifs, it doesn't take much code to insert it into the site.
1. The animations should be around 2.5 seconds each.
2. Put your Gifs in the `/resources` folder.
3. Open `index.html` in a text editor and go to around line 128.  You will find 3 image tags that start with `<img class="hero-gif` and shortly below 3 more that start with `<img class="villain-gif`  Those represent the different animated attack sequences that the left and right fighter respectively cycle through.
4. Copy the tag `<img class="hero-gif dodge-gif reversed" src="resources/SwordDodge.gif">` and paste it on the following line.  This Gif is animated before the battle begins.  Edit the term `src="resources/SwordDodge.gif"` by replacing `SwordDodge.gif` with the name of the file you place in `/resources` that you want to use.
5. Copy the tag `<img class="hero-gif attack-gif reversed" src="resources/Sword2.gif" hidden="true">` and paste a copy for each of your left player attack gifs on the lines below it.  The program will cycle through each of these animations for each attack.  Edit them with the gif you've saved as in step 4.
6. Repeat steps 4 and 5 with the `class="villian-gif"` image tags for the right (opponent) player animations.
7. Delete all the image tags for the old .gifs.

Notes:
- Ive have actually reversed the natural direction of the left image.  If yours actually faces right you may also have to edit your lines by removing the term `reversed` from each of the img tags
- The first line of game.js contains code that says how long each animation runs in milliseconds.  If it seems off you can try editing the value of ACTION_TIME on that line.
```
const ACTION_TIME = 2500;
```

If you mess it all up, don't worry.  Just download the code again and start over!
