const urlCoverArt="img/defaultArt.png",stationKeys=Object.keys(stations);function generateRadioButtons(){const t=document.getElementById("stationSelect"),e=document.createDocumentFragment();stationKeys.forEach((t=>{const a=stations[t],i=document.createElement("label");i.id=t,i.textContent=a.stationName;const s=document.createElement("input");s.type="radio",s.name="station",s.value=t,s.checked=t===radioPlayer.stationName,s.addEventListener("change",(()=>{s.checked&&(window.location.hash=`#${t}`)}));const n=document.createElement("a");n.href=`#${t}`,n.appendChild(i),i.appendChild(s),e.appendChild(n)})),t.appendChild(e)}function animateElement(t,e=2e3){t.classList.add("animated","fadeIn"),setTimeout((()=>{t.classList.remove("animated","fadeIn")}),e)}class Page{constructor(t,e){this.stationName=t,this.title=stations[this.stationName].stationName,this.radioPlayer=e,this.cacheDOMElements(),this.setupMediaSession("","",""),this.template=document.querySelector("#meta")}cacheDOMElements(){const t={currentSong:"title",currentArtist:"artist",currentAlbum:"album",currentListeners:"listeners",coverArt:"albumArt",radioNameLink:"radioNameLink",radioName:"radioName",stationLocation:"stationLocation",metaInfo:"metainfo"};for(const[e,a]of Object.entries(t))this[e+"Element"]=document.getElementById(a)}changeTitlePage(){document.title=`${this.title} currently loading`}formatCompactNumber(t){return t<1e3?t:t>=1e3&&t<1e6?(t/1e3).toFixed(1).replace(/\.0$/,"")+"K":t>=1e6&&t<1e9?(t/1e6).toFixed(1).replace(/\.0$/,"")+"M":t>=1e9&&t<1e12?(t/1e9).toFixed(1).replace(/\.0$/,"")+"B":void 0}refreshCurrentData(t){const[e,a,i,s,n,r]=t;this.setupMediaSession(e,a,s),setTimeout((()=>{this.coverArtElement.onload=()=>{const t=s===urlCoverArt?`url("../${s}")`:`url("${s}")`;document.documentElement.style.setProperty("--albumArt",t);const o=document.querySelector("div.metainfo");o.textContent="";const l=document.querySelector("#meta"),c=document.importNode(l.content,!0);c.querySelector("#title").textContent=e,c.querySelector("#artist").textContent=a,c.querySelector("#album").textContent=i,c.querySelector("#listeners").textContent=null!==n&&null!==r?`Listeners: ${this.formatCompactNumber(n)} | Plays: ${this.formatCompactNumber(r)}`:"";c.querySelector("#radioNameLink").href=stations[this.stationName].webUrl,c.querySelector("#radioName").textContent=this.title,c.querySelector("#stationLocation").textContent=stations[this.stationName].location,o.appendChild(c),animateElement(o),""===e&&""===a&&title===`${stations[this.stationName].stationName} currently loading`||(document.title=`${e} - ${a} | ${stations[this.stationName].stationName} on scrobblerad.io`)},this.coverArtElement.src=s}),1500)}setupMediaSession(t,e,a){if("mediaSession"in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:t||`${stations[this.stationName].stationName} currently loading`,artist:e||"",album:`Now playing on ${stations[this.stationName].stationName}`||"",duration:1/0,startTime:0,artwork:[{src:a}]});const i={nexttrack:()=>this.radioPlayer.skipForward(),previoustrack:()=>this.radioPlayer.skipBackward(),play:()=>this.radioPlayer.togglePlay(),pause:()=>this.radioPlayer.togglePlay()};for(const[t,e]of Object.entries(i))navigator.mediaSession.setActionHandler(t,e)}}}class RadioPlayer{constructor(t,e,a){this.audio=new Audio,this.playButton=t,this.skipForwardButton=e,this.skipBackButton=a,this.isPlaying=null,this.stationName="",this.previousDataResponse=null,this.pauseTimeout=null,this.shouldReloadStream=!1,this.stations=document.querySelectorAll(".station"),this.debounceTimeout=null,this.firstRun=!0,this.streamingInterval=null,this.canAutoplay=!1,this.debouncedPlayAudio=this.debounce((t=>{this.audio&&(this.audio.pause(),this.audio=null),setTimeout((()=>{this.audio=t,this.getStreamingData(),this.play(),this.isPlaying=!0}),500)}),1500),this.bindMethods(),this.addEventListeners(),this.init()}bindMethods(){this.handleStationSelect=this.handleStationSelect.bind(this),this.getLfmMeta=this.getLfmMeta.bind(this),this.getStreamingData=this.getStreamingData.bind(this),this.extractSongAndArtist=this.extractSongAndArtist.bind(this),this.getPath=this.getPath.bind(this),this.upsizeImgUrl=this.upsizeImgUrl.bind(this),this.togglePlay=this.togglePlay.bind(this),this.skipForward=this.skipForward.bind(this),this.skipBackward=this.skipBackward.bind(this)}addEventListeners(){this.playButton.addEventListener("click",this.togglePlay),this.skipForwardButton.addEventListener("click",this.skipForward),this.skipBackButton.addEventListener("click",this.skipBackward),document.getElementById("stationSelect").addEventListener("click",(t=>{t.target&&t.target.matches("input[name='station']")&&this.handleStationSelect(t,t.target.value,!0)})),document.addEventListener("DOMContentLoaded",(()=>{this.jumpToStationFromHash()}),{once:!0})}init(){"serviceWorker"in navigator&&document.addEventListener("DOMContentLoaded",(()=>{navigator.serviceWorker.register("serviceWorker.js").then((()=>console.log("Service worker registered"))).catch((t=>console.log("Service worker not registered",t)))}),{once:!0})}calculateNextAndPreviousIndices(t){this.currentIndex=stationKeys.indexOf(this.stationName),this.nextIndex=(this.currentIndex+1)%stationKeys.length,this.previousIndex=(this.currentIndex-1+stationKeys.length)%stationKeys.length}debounce(t,e){return(...a)=>{this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout((()=>{t.apply(this,a)}),e)}}jumpToStationFromHash(){const t=window.location.hash;if(t){const e=t.substring(1),a=document.getElementById(e);a&&(a.scrollIntoView(),this.handleStationSelect(null,e,!0))}}handleStationSelect(t,e,a){if(!e||!1===t)return;this.streamingInterval&&(clearInterval(this.streamingInterval),this.streamingInterval=null),a&&(this.playButton.lastElementChild.className="spinner-grow text-light",this.lfmMetaChanged=!1,console.log(e),this.stationName=e,this.updateArt=!0,this.getStreamingData(),this.isPlaying=!0,a=!1);this.debounce((()=>{if(!this.isPlaying)return;const a=new Audio(this.addCacheBuster(stations[e].streamUrl));a.onloadedmetadata=()=>{this.lfmMetaChanged=!1,this.debouncedPlayAudio(a),this.streamingInterval=setInterval((()=>{this.getStreamingData()}),25e3)},a.onerror=e=>{console.warn("Error loading audio:",e),this.isPlaying&&(!0===t?this.skipBackward():this.skipForward())},a.load();new Page(this.stationName,this).changeTitlePage();const i=document.querySelector(`input[name='station'][value='${e}']`);i&&(i.checked=!0),window.location.hash=`#${e}`}),250)()}cleanupArtist(t){let e=t;return[/ & .*/,/ x .*/,/ feat\..*/].forEach((t=>{e=e.replace(t,"")})),e.trim()}extractSongAndArtist(t,e){const a=a=>{return i=this.getPath(t,stations[e][a]),i?.replace(/&apos;|’/g,"'")||"";var i};let i=a("song"),s=a("artist"),n=a("album"),r=a("albumArt");if(stations[e].altPath&&!i&&(i=a("song2"),s=a("artist2")),stations[e].orbPath){const a=(stations[e].pathRegex||/^(.*?)\s+-\s+(.*?)(?:\s+-\s+([^-\n]*))?(?:\s+-\s+(.*))?$/).exec(t.title);a?([s,i,n]=a.slice(1,4).map((t=>t?.trim())),stations[e].flipMeta&&([i,s]=[s,i])):console.log("No match found")}if(stations[e].stringPath){const a=(stations[e].pathRegex||/^(.*?)\s+-\s+(.*?)(?:\s+-\s+([^-\n]*))?(?:\s+-\s+(.*))?$/).exec(t);a?(i=a[1]?.trim()||"",s=a[2]?.trim()||"",n=a[3]?.trim()||"",r=a[4]?.trim()||urlCoverArt,stations[e].flipMeta&&([i,s]=[s,i])):console.log("No match found")}s=this.cleanupArtist(s);const o=stations[e].filter||[],l=t=>((t,e)=>e.some((e=>t.includes(e))))(t,o)||t.includes(e);return l(i)||l(s)||!i&&!s?["Station may be taking a break",null,null,urlCoverArt]:/single/i.exec(n)?[i,s,i,r]:(r=r||urlCoverArt,[i,s,n,r])}getLfmMeta(t,e,a){return new Promise(((i,s)=>{if(""!==t&&""!==e){const n={artist:[MetadataFilter.normalizeFeature],track:[MetadataFilter.removeRemastered,MetadataFilter.removeFeature,MetadataFilter.removeLive,MetadataFilter.removeCleanExplicit,MetadataFilter.removeVersion],album:[MetadataFilter.removeRemastered,MetadataFilter.removeFeature,MetadataFilter.removeLive,MetadataFilter.removeCleanExplicit,MetadataFilter.removeVersion]},r=MetadataFilter.createFilter(n);let o="",l="",c="";a?(o="album.getInfo",l="album",c=a):(o="track.getInfo",l="track",c=t.replace(/\s*\(.*?version.*?\)/gi,""));const d=`https://ws.audioscrobbler.com/2.0/?method=${o}&artist=${encodeURIComponent(r.filterField("artist",e))}&${l}=${encodeURIComponent(r.filterField(l,c))}&api_key=09498b5daf0eceeacbcdc8c6a4c01ccb&autocorrect=1&format=json&limit=1`;fetch(d).then((t=>t.json())).then((n=>{let l="",c="",d="",h="",u=null,m=null;if(6!==n.error)a?(l=n.album?.image[3]["#text"]||urlCoverArt,c=r.filterField("album",n.album?.name)||r.filterField("album",a)||"",d=r.filterField("track",t)||"No streaming data currently available",h=r.filterField("artist",n.album?.artist)||r.filterField("artist",e)||"",u=n.album.listeners||null,m=n.album.playcount||null):(l=n.track?.album?.image[3]["#text"]||urlCoverArt,c=r.filterField("album",n.track?.album?.title)||r.filterField("album",a)||"",d=r.filterField("track",n.track?.name)||r.filterField("track",t)||"No streaming data currently available",h=r.filterField("artist",n.track?.artist?.name)||r.filterField("artist",e)||"",u=n.track.listeners||null,m=n.track.playcount||null);else{if("album.getInfo"===o)return void this.getLfmMeta(t,e,"").then(i).catch(s);l=urlCoverArt,c=r.filterField("album",a)||"",d=r.filterField("track",t)||"No streaming data currently available",h=r.filterField("artist",e)||"",u=null,m=null,console.log("got info from station api")}i([l,c,d,h,u,m])})).catch((t=>{console.error("Error fetching Last.fm metadata:",t),s(t)}))}else i(null)}))}getStreamingData(){if(this.isPlaying||null==this.isPlaying){if(!this.stationName)return;if(this.isPlaying&&!this.shouldReloadStream){let t=this.addCacheBuster(stations[this.stationName].apiUrl);const e={method:stations[this.stationName].method||"GET",headers:stations[this.stationName].headers||{}};fetch(t,e).then((t=>{const e=t.headers.get("content-type");if(e.includes("application/json")||e.includes("application/vnd.api+json"))return t.json().then((t=>({data:t,contentType:e})));if(e.includes("text/html")||e.includes("application/javascript"))return t.text().then((t=>({data:t,contentType:e})));throw new Error(`Unsupported content type: ${e}`)})).then((({data:t,contentType:e})=>{if(e.includes("text/html")&&!stations[this.stationName].phpString){const e=(new DOMParser).parseFromString(t,"text/html");t=this.extractDataFromHTML(e)}else if(e.includes("application/javascript")){const e=this.extractHTMLFromJS(t),a=(new DOMParser).parseFromString(e,"text/html");t=this.extractDataFromHTML(a)}this.isDataSameAsPrevious(t)||(this.previousDataResponse=t,this.processData(t))})).catch((t=>{console.error("Error fetching streaming data:",t)}))}}}extractHTMLFromJS(t){const e=t.match(/_spinitron\d+\("(.+)"\);/s);if(e&&e[1])return e[1].replace(/\\"/g,'"');throw new Error("Unable to extract HTML content from JavaScript response")}extractDataFromHTML(t){const e=t=>t.replace(/-/g,"—"),a=e(t.querySelector("span.song")?.textContent.trim()||"No streaming data currently available"),i=e(t.querySelector("span.artist")?.textContent.trim()||""),s=e(t.querySelector("span.release")?.textContent.trim()||""),n=t.querySelector("img")?.src||"";return console.log(`${a} - ${i} - ${s} - ${n}`),`${a} - ${i} - ${s} - ${n}`}isDataSameAsPrevious(t){return JSON.stringify(t)===JSON.stringify(this.previousDataResponse)}processData(t){if(t&&this.stationName){const e=this.extractSongAndArtist(t,this.stationName);if(!e||0===e.length){return void new Page(this.stationName,this).refreshCurrentData(["No streaming data to show","","",urlCoverArt,null,null,!0])}this.hasLoadedData=!0;const[a,i,s,n]=e;let r="";const o=(new Date).getTime();let l,c=this.getPath(t,stations[this.stationName].timestamp)||this.getPath(t,stations[this.stationName].timestamp2)||"";if(String(c).includes("T"))l=Date.parse(c);else if(String(c).match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)){const[t,e]=c.split(" "),[a,i,s]=t.split("-"),[n,r,o]=e.split(":");l=new Date(a,i-1,s,n,r,o).getTime()}else l=1e3*parseInt(c);if(o-l>9e5&&""!==c&&(r="Streaming data is stale"),"No streaming data currently available"===a||"Station may be taking a break"===a||"Station data is currently missing"===a||r){return void new Page(this.stationName,this).refreshCurrentData([r||a,"","",urlCoverArt,null,null,!0])}if(this.isDataSameAsPrevious(t)&&this.lfmMetaChanged&&a===this.song)return;this.lfmMetaChanged&&a===this.song||this.getLfmMeta(a,i,s).then((e=>{const[s,r,o,l,c,d]=e||[urlCoverArt,"",a,i,"",""];this.song=o,this.artist=l,this.album=r,this.artworkUrl=s===urlCoverArt?this.upsizeImgUrl(n)||this.upsizeImgUrl(this.getPath(t,stations[this.stationName].albumArt))||urlCoverArt:this.upsizeImgUrl(s),this.listeners=c,this.playcount=d,this.lfmMetaChanged=!0;new Page(this.stationName,this).refreshCurrentData([this.song,this.artist,this.album,this.artworkUrl,this.listeners,this.playcount,!0])})).catch((t=>{console.error("Error processing data:",t)}))}}upsizeImgUrl(t){return t?t.replace(/170x170|360x360|300x300/g,"500x500"):void 0}getPath(t,e){if(t&&"object"==typeof t&&e){if(!0!==stations[this.stationName].needPath)return t[e];for(var a=e.split("."),i=a.pop(),s=a.length,n=1,r=a[0];(t=t[r])&&n<s;)r=a[n],n++;return t?t[i]:void 0}}play(){this.audio.src&&(this.shouldReloadStream?(console.log("the stream is reloading"),this.handleStationSelect(null,this.stationName,!0),this.shouldReloadStream=!1):this.audio.play().then((()=>{this.isPlaying=!0,this.playButton.lastElementChild.className="icon-pause",document.getElementById("metadata").classList.add("playing"),this.pauseTimeout&&(clearTimeout(this.pauseTimeout),this.pauseTimeout=null)})).catch((t=>{console.error("Error playing audio:",t)})))}pause(){this.audio.pause(),this.isPlaying=!1,this.playButton.lastElementChild.className="icon-play",document.getElementById("metadata").classList.remove("playing"),this.pauseTimeout&&clearTimeout(this.pauseTimeout),this.pauseTimeout=setTimeout((()=>{console.log("the stream should be reloaded"),this.shouldReloadStream=!0}),3e4)}togglePlay(){this.isPlaying?this.pause():this.play()}skipToNextStation(){this.calculateNextAndPreviousIndices();const t=stationKeys[this.nextIndex];this.handleStationSelect(null,t,!0)}skipBackward(){this.playButton.lastElementChild.className="spinner-grow text-light",this.calculateNextAndPreviousIndices();const t=stationKeys[this.previousIndex];this.handleStationSelect(!0,t,!0)}skipForward(){this.playButton.lastElementChild.className="spinner-grow text-light",this.calculateNextAndPreviousIndices();const t=stationKeys[this.nextIndex];this.handleStationSelect(null,t,!0)}addCacheBuster(t){const e=(new Date).getTime();return t.includes("?")?`${t}&t=${e}`:`${t}?t=${e}`}}const radioPlayer=new RadioPlayer(document.getElementById("playButton"),document.getElementById("skipForward"),document.getElementById("skipBack"));generateRadioButtons(),document.addEventListener("DOMContentLoaded",(function(){const t=stationKeys[0];radioPlayer.handleStationSelect(!1,t,!0);const e=document.getElementById("stationSelect");e?e.addEventListener("change",(t=>{const e=t.target.value;radioPlayer.handleStationSelect(!0,e,!0)}),{once:!0}):console.error('Element with ID "station-select" not found.')}),{once:!0});