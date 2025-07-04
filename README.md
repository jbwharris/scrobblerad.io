# [scrobblerad.io](https://scrobblerad.io)
A PWA and website to listen to cool radio stations and easily scrobble to [LastFM](https://last.fm), [LibreFm](https://libre.fm) and [ListenBrainz](https://listenbrainz.org) with [Web Scrobbler](https://web-scrobbler.com)

[![HTML5](https://img.shields.io/badge/HTML-FF4500?style=for-the-badge&logo=html5&logoColor=white)](#) [![CSS3](https://img.shields.io/badge/CSS-0077B5?&style=for-the-badge&logo=css3&logoColor=white)](#) [![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)](#)

<img width="1022" alt="ScrobbleRadio header collage of screenshots" src="https://github.com/user-attachments/assets/3c113a51-57cb-46b1-83ee-a29c1d917199">


## Features 
- A diverse set of over 90 different online radio stations from around the world. Featuring [KEXP](https://kexp.org), [BBC6](https://www.bbc.co.uk/sounds/play/live:bbc_6music), various NPR stations and many more...
- MediaSession controls, so you can easily switch between stations using the media controls on your keyboard
- Song and artist data filtered using Web Scrobbler's [Metadata Filter](https://github.com/web-scrobbler/metadata-filter)
- Additional filtering to ensure the best possible scrobble data to submit
- Album data from LastFM and MusicBrainz API
- Apple CarPlay support
- Mobile swipe navigation
- Light and Dark Mode support

<img width="1196" alt="Light and Dark mode screenshots" src="https://github.com/user-attachments/assets/0c75d8f8-5be1-4b7b-8361-b4324566b36c">



## FAQ
### Why another radio streaming app?
There are a zillion radio streaming apps out there, but there really aren’t any that did so with a scrobbling first focus. That was my primary goal, to gather a bunch of great radio stations that have publicly accessible API metadata and make an app that could scrobble the songs to LastFM, Listenbrainz and LibreFM. For years I had struggled with the idea of finding a reliable way to scrobble radio on the go. There had been an early iOS app that did it pretty well, but as LastFM had faded in popularity there just never seemed to be any apps that focused on being able to accurately scrobble online radio. If you'd like to use this with Android and [Pano Scrobbler](https://github.com/kawaiiDango/pano-scrobbler), it should work without much issue. 

### How does the scrobbling work?
There are a couple ways to scrobble using the app. There is the Login to last.fm button on the left that allows you to enable scrobbling in the app. This is currently just last.fm and not other scrobbling platforms. 

![image](https://github.com/user-attachments/assets/778d0021-6ba1-47b3-a283-38b2ded1e759)

The other alternative is [Web Scrobbler](https://web-scrobbler.com) to handle sending to LastFM, MusicBrainz and LibreFM. You just need to login to each platform. This works on desktop with all major browsers (Chrome, Firefox, Safari etc.) on macOS, Windows and Linus, as well as iOS and iPadOS in Safari and Orion browsers.

![image](https://github.com/user-attachments/assets/14da3e92-ecdf-4669-8e46-d44f83296c4a)

For Android, scrobbling works using [Pano Scrobbler](https://github.com/kawaiiDango/pano-scrobbler), I've tested this a bit and it seems to work well.  

### Is this a progressive web app (PWA)?
Yes. It can be installed on your device as a standalone app on your homescreen. It's no longer a requirement to just use the browser, it can work standalone. 

### How did you choose the stations?
Part of my motivation was to add Canadian and local stations to my rotation. So there are some pretty niche and deep cut stations in there. Most are Indie and Alternative stations, and some stations that will play a bit of everything. I’ve tried to steer clear of corporate radio stations with lots of commercials, but that doesn’t mean there aren’t some stations with them. My criteria was typically whether they played a decent variety of music. And they needed to have a public API that I could pull the data from. I have added quite a few user requested stations as well. If you have a suggestion, message me on [Bluesky](https://bsky.app/profile/scrobblerad.io) or submit a GitHub issue. 

### Why isn’t the station showing any data?
There are a few different factors that can cause a site to not have streaming data.
1. The station is on a commercial break. Some stations pause their info during commercials or put a station ID into their meta data. I’ve tried to minimize that where possible. 
2. The station is playing a syndicated show, which will typically not have the song data split up. You may just get the last song played before the show started, or the name of the show in the data. 
3. The API might have stopped updating for some reason. I have a check in there with some stations to check for stale API data, but it's not with all stations. It all depends on whether they have a timestamp on when a track is played in their API. 

### Why doesn’t BBC6 work?
It does, though only in browsers that support HLS playback. I could have added a 3rd party JavaScript library for that, but it was literally the only station with that problem. BBC streams will work in Safari on macOS and iOS. Beyond that there are browser extensions that can enable HLS. I honestly don’t know how compatibility might fare on Windows/Linux/Android, as my primary focus was on macOS/iOS/iPadOS. 

### Does this work with Apple CarPlay?
Yes it does. I originally started this project with the goal of being able to scrobble radio on the go and found it actually integrated really well with car stereos. It’ll show the song and artist in even basic stereo systems and will show the song, artist, album and album art. Skipping stations now works well using the media controls.

### The station seems to be skipping, how do I fix this while using Carplay?
To correct a feed that might be out of sync, press skip forward, then back. This will cause the stream to reload and correct itself nearly seamlessly. In Carplay, there are no additional buttons that can be assigned, so this is a handy trick to get things working while driving. 


## To-Do List
- [X] Add native scrobbling to make this a complete PWA solution.
- [X] Add a filter for if the station name is in the metadata and not scrobble it. Sometimes a station will throw in a station ID or commercial into their API metadata.
- [ ] Add Song.link links to add to various streaming platforms.
- [X] Get station skipping working in iOS for Apple CarPlay.
- [ ] Add recently scrobbled data to the page, so you could have a local indication of what has scrobbled.
- [ ] Fix responsive styling and breakpoints.
- [X] Add lastfm listeners and total listens.
- [ ] Randomize station selection.
- [ ] Choose your favourite stations to play instead of selecting from complete list.
- [ ] Add volume controls
- [ ] Add support for native scrobbling for ListenBrainz, libre.fm and RockSky

## Acknowledgements
- This project was originally forked from [PWA RadioKing Player](https://github.com/lunar-d/PWA-RadioKing-Player). When I started this project, I didn't know much about radio APIs or progressive web apps and this project offered me a good introduction while giving me a foundation to build from. It was originally for playing a single radio station and I was able to make an extensible structure where I could add tons of radio stations. 
